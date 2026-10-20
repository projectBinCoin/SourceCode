-- ════════════════════════════════════════════════════════════════════
-- 006_need_height.sql — ask the device for its calibrated height when
-- the bins row doesn't have one yet.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Closes the claim-before-calibrate gap: announce_device can land with
-- no height (device hadn't calibrated yet), the claim copies NULL, and
-- announce no-ops once claimed — so bin_height_cm could stay NULL
-- forever. Now update_bin_telemetry returns need_height when the row's
-- height is missing; the device resends with p_bin_height_cm on the
-- same wake and this clears automatically.
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
  missing_height boolean;
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
     and (pairing_code is null or pairing_code = p_pairing_code)
  returning true, recalibrate_requested, lat, lng, (bin_height_cm is null)
     into matched, wants_recal, bin_lat, bin_lng, missing_height;

  return jsonb_build_object(
    'ok', coalesce(matched, false),
    'recalibrate', coalesce(wants_recal, false),
    'lat', bin_lat,
    'lng', bin_lng,
    'need_height', coalesce(missing_height, false)
  );
end;
$fn$;

grant execute on function public.update_bin_telemetry(text, int, int, int, text, numeric)
  to anon, authenticated;
