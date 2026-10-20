-- ════════════════════════════════════════════════════════════════════
-- 005_device_announce.sql — zero-typing bin setup
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- New flow: after the customer saves WiFi in the device portal, the
-- ESP32 calls announce_device() — its ID + pairing code + measured
-- height land in announced_devices. The app's Register screen lists
-- those devices; the citizen taps theirs and enters the pairing code
-- shown on the portal screen — claim_device() verifies the code and
-- creates the real bins row. No typing device IDs, no copy-paste.
--
-- announced_devices is RPC-only: RLS blocks direct reads/writes, the
-- pairing code is only ever checked server-side, and list_announced
-- _devices() never returns it.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.announced_devices (
  device_id     text primary key,
  pairing_code  text not null,
  bin_height_cm numeric check (bin_height_cm is null or bin_height_cm between 5 and 500),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.announced_devices enable row level security;
-- No policies = no direct table access; everything flows through the
-- security-definer RPCs below.

-- Device → DB: "I'm online, here's who I am." Called on every wake —
-- no-ops once the bin is claimed so a claimed device never reappears.
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
  if exists (select 1 from bins where device_id = p_device_id) then
    return jsonb_build_object('ok', true, 'claimed', true);
  end if;

  insert into announced_devices (device_id, pairing_code, bin_height_cm, last_seen_at)
  values (p_device_id, p_pairing_code, p_bin_height_cm, now())
  on conflict (device_id) do update
    set pairing_code  = excluded.pairing_code,   -- keeps the code fresh after factory reset
        bin_height_cm = coalesce(excluded.bin_height_cm, announced_devices.bin_height_cm),
        last_seen_at  = now();

  return jsonb_build_object('ok', true, 'claimed', false);
end;
$fn$;

grant execute on function public.announce_device(text, text, numeric)
  to anon, authenticated;

-- App → DB: "which devices are waiting to be claimed?" Deliberately
-- does NOT return pairing_code — that's proof of possession, checked
-- server-side by claim_device.
create or replace function public.list_announced_devices()
returns table (device_id text, bin_height_cm numeric, last_seen_at timestamptz)
language sql
security definer
set search_path = public
as $fn$
  select device_id, bin_height_cm, last_seen_at
    from announced_devices
   order by last_seen_at desc;
$fn$;

grant execute on function public.list_announced_devices()
  to authenticated;

-- Citizen claims their device: pairing code is verified against what the
-- device announced, then the real bins row is created pending approval.
create or replace function public.claim_device(
  p_device_id    text,
  p_pairing_code text,
  p_label        text,
  p_lat          double precision,
  p_lng          double precision,
  p_address      text,
  p_size_l       int,
  p_region       text default 'Colombo 07',
  p_waste_type   text default 'Plastic'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  announced announced_devices%rowtype;
  new_id    text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (select 1 from bins where device_id = p_device_id) then
    return jsonb_build_object('ok', false, 'error', 'already_registered');
  end if;

  select * into announced from announced_devices where device_id = p_device_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_announced');
  end if;
  if announced.pairing_code <> p_pairing_code then
    return jsonb_build_object('ok', false, 'error', 'wrong_code');
  end if;

  new_id := 'bin-' || substr(md5(random()::text), 1, 12);

  insert into bins (
    id, device_id, label, lat, lng, address, size_l,
    region, waste_type, citizen_id, submitted_by, submitted_at,
    approval_status, pairing_code, bin_height_cm, calibrated_at
  ) values (
    new_id, p_device_id, p_label, p_lat, p_lng, p_address, p_size_l,
    p_region, p_waste_type::wastage_type, auth.uid()::text, auth.uid()::text, now(),
    'pending', p_pairing_code, announced.bin_height_cm,
    case when announced.bin_height_cm is not null then announced.last_seen_at end
  );

  delete from announced_devices where device_id = p_device_id;
  return jsonb_build_object('ok', true, 'bin_id', new_id);
end;
$fn$;

grant execute on function public.claim_device(text, text, text, double precision, double precision, text, int, text, text)
  to authenticated;
