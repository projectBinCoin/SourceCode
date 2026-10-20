-- ════════════════════════════════════════════════════════════════════
-- 008_claimed_cleanup.sql — purge the announce row once a bin is claimed
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Bug: announce_device returned early when a bins row already existed,
-- but never deleted the announced_devices row — so the app's claim list
-- kept showing a "ready to claim" device with stale height/timestamps
-- forever. Now the claimed branch removes its own staging row.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.announce_device(
  p_device_id     text,
  p_pairing_code  text,
  p_bin_height_cm numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Already claimed → clean up the stale staging row and report claimed.
  if exists (select 1 from public.bins where device_id = p_device_id) then
    delete from public.announced_devices where device_id = p_device_id;
    return jsonb_build_object('ok', true, 'claimed', true);
  end if;

  insert into public.announced_devices (device_id, pairing_code, bin_height_cm, last_seen_at)
  values (p_device_id, p_pairing_code, p_bin_height_cm, now())
  on conflict (device_id) do update
     set pairing_code  = excluded.pairing_code,
         bin_height_cm = coalesce(excluded.bin_height_cm, announced_devices.bin_height_cm),
         last_seen_at  = excluded.last_seen_at;

  return jsonb_build_object('ok', true, 'claimed', false);
end;
$fn$;

grant execute on function public.announce_device(text, text, numeric) to anon, authenticated;

-- One-off: purge announce rows for devices that are already claimed.
delete from public.announced_devices a
 using public.bins b
 where a.device_id = b.device_id;
