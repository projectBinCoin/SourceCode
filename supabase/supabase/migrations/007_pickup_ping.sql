-- ════════════════════════════════════════════════════════════════════
-- 007_pickup_ping.sql — pickup request flags the device for a fresh read
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- When a citizen books a pickup:
--   • bins.ping_requested = true  → next device wake takes an extra
--     measurement and re-reports, so the collector sees VERIFIED fill
--     instead of data up to 15 min old
--   • pickup_requests.fill_at_request stores the fill level at booking
--     time — collectors see how full it was when requested
--   • update_bin_telemetry returns "ping" and clears the flag in the
--     same transaction
-- ════════════════════════════════════════════════════════════════════

alter table public.bins
  add column if not exists ping_requested boolean not null default false;

alter table public.pickup_requests
  add column if not exists fill_at_request int;

-- Extend the 20% gate trigger: also stamp the request with current fill
-- and flag the device for a fresh reading.
create or replace function public.enforce_min_fill_on_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  latest_fill int;
begin
  select fill_pct into latest_fill from public.bins where id = NEW.bin_id;
  if latest_fill is null then
    latest_fill := 0;
  end if;
  if latest_fill < 20 then
    raise exception 'Bin % is only % full — pickup requests require at least 20%% fill.',
      NEW.bin_id, latest_fill;
  end if;

  NEW.fill_at_request := latest_fill;
  update public.bins set ping_requested = true where id = NEW.bin_id;
  return NEW;
end;
$fn$;

-- Telemetry response gains "ping" — device takes an extra measurement
-- when true; flag clears in the same update.
drop function if exists public.update_bin_telemetry(text, int, int, int, text, numeric);

create or replace function public.update_bin_telemetry(
  p_device_id      text,
  p_fill_pct       int,
  p_battery_pct    int,
  p_air_gap_cm     int,
  p_pairing_code   text    default null,
  p_bin_height_cm  numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  matched boolean;
  wants_recal boolean;
  bin_lat double precision;
  bin_lng double precision;
  missing_height boolean;
  wants_ping boolean;
begin
  -- Capture the flag BEFORE clearing it — RETURNING sees post-update values.
  select ping_requested into wants_ping from bins where device_id = p_device_id;

  update bins
     set fill_pct     = greatest(0, least(100, p_fill_pct)),
         battery_pct  = greatest(0, least(100, p_battery_pct)),
         air_gap_cm   = greatest(0, p_air_gap_cm),
         last_ping_at = now(),
         bin_height_cm = coalesce(p_bin_height_cm, bin_height_cm),
         calibrated_at = case when p_bin_height_cm is not null then now() else calibrated_at end,
         recalibrate_requested = case when p_bin_height_cm is not null then false else recalibrate_requested end,
         ping_requested = false
   where device_id = p_device_id
     and (pairing_code is null or pairing_code = p_pairing_code)
  returning true, recalibrate_requested, lat, lng, (bin_height_cm is null)
     into matched, wants_recal, bin_lat, bin_lng, missing_height;

  return jsonb_build_object(
    'ok', coalesce(matched, false),
    'recalibrate', coalesce(wants_recal, false),
    'lat', bin_lat,
    'lng', bin_lng,
    'need_height', coalesce(missing_height, false),
    'ping', coalesce(wants_ping, false)
  );
end;
$fn$;

grant execute on function public.update_bin_telemetry(text, int, int, int, text, numeric)
  to anon, authenticated;
