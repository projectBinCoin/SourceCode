-- ════════════════════════════════════════════════════════════════════
-- 004_bin_coords.sql — telemetry RPC also returns the bin's registered
-- location so the device can fetch location-accurate weather for its
-- speed-of-sound temperature compensation.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Same signature, same behaviour — the jsonb response just gains
-- "lat"/"lng" from the bin row. NULL when the device isn't registered
-- yet (firmware falls back to IP-geolocated temp until it is).
-- ════════════════════════════════════════════════════════════════════

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
begin
  update bins
     set fill_pct     = greatest(0, least(100, p_fill_pct)),
         battery_pct  = greatest(0, least(100, p_battery_pct)),
         air_gap_cm   = greatest(0, p_air_gap_cm),
         last_ping_at = now(),
         bin_height_cm = coalesce(p_bin_height_cm, bin_height_cm),
         calibrated_at = case when p_bin_height_cm is not null then now() else calibrated_at end,
         recalibrate_requested = case when p_bin_height_cm is not null then false else recalibrate_requested end
   where device_id = p_device_id
     -- NOTE: not gated on approval_status — a pending bin must be able to
     -- report its self-measured height so the admin can verify it. Approval
     -- gates visibility/requests in the app, not the hardware handshake.
     -- Pairing enforced when a code was registered; NULL code = open (legacy).
     and (pairing_code is null or pairing_code = p_pairing_code)
  returning true, recalibrate_requested, lat, lng
     into matched, wants_recal, bin_lat, bin_lng;

  return jsonb_build_object(
    'ok', coalesce(matched, false),
    'recalibrate', coalesce(wants_recal, false),
    'lat', bin_lat,
    'lng', bin_lng
  );
end;
$fn$;

grant execute on function public.update_bin_telemetry(text, int, int, int, text, numeric)
  to anon, authenticated;
