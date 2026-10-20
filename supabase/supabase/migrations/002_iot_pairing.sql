-- ════════════════════════════════════════════════════════════════════
-- 002_iot_pairing.sql — ESP32 self-identification & pairing hardening
-- ════════════════════════════════════════════════════════════════════
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Adds:
--   bins.pairing_code          — secret the device must present to write
--                                telemetry (printed on the bin's QR sticker
--                                and typed into its setup portal)
--   bins.bin_height_cm         — the bin's inside height measured BY THE
--                                SENSOR at setup (self-calibration). This is
--                                what makes fill% honest: a thin tall bin or
--                                a short wide bin reports its own geometry
--                                instead of relying on the declared size_l.
--   bins.calibrated_at         — when the sensor last self-calibrated
--   bins.recalibrate_requested — admin sets true → device re-measures on
--                                next wake, reports the height, flag clears
--
-- Replaces update_bin_telemetry:
--   • verifies device_id + pairing_code (rows without a code still work —
--                                keeps existing/demo bins and old firmware
--                                compatible)
--   • stores sensor-measured height when provided
--   • returns jsonb { ok, recalibrate } instead of void, so the device can
--     act on a pending recalibration request in the same call
-- ════════════════════════════════════════════════════════════════════

alter table public.bins
  add column if not exists pairing_code          text,
  add column if not exists bin_height_cm         numeric check (bin_height_cm is null or bin_height_cm between 5 and 500),
  add column if not exists calibrated_at         timestamptz,
  add column if not exists recalibrate_requested boolean not null default false;

drop function if exists public.update_bin_telemetry(text, int, int, int);

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
  returning true, recalibrate_requested into matched, wants_recal;

  return jsonb_build_object(
    'ok', coalesce(matched, false),
    'recalibrate', coalesce(wants_recal, false)
  );
end;
$fn$;

grant execute on function public.update_bin_telemetry(text, int, int, int, text, numeric)
  to anon, authenticated;
