-- ════════════════════════════════════════════════════════════════════
-- 010_sensor_fault.sql — let the "-1 = sensor fault" sentinel through
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- When the HC-SR04 returns zero echoes and has no prior reading, the
-- firmware reports fill_pct / air_gap_cm = -1 instead of fabricating
-- 100% on a dead sensor. This widens the clamps so -1 is stored, and
-- the apps render it as "Sensor fault" rather than a fake level.
-- Same function as 007 — only the two clamps change.
-- ════════════════════════════════════════════════════════════════════

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
     -- -1 passes through untouched (sensor fault); real values still clamp
     set fill_pct     = case when p_fill_pct   < 0 then -1 else greatest(0, least(100, p_fill_pct)) end,
         battery_pct  = greatest(0, least(100, p_battery_pct)),
         air_gap_cm   = case when p_air_gap_cm < 0 then -1 else greatest(0, p_air_gap_cm) end,
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
