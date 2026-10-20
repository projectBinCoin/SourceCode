-- ============================================================
-- Bincoin — Supabase schema
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Or via Management API once a personal access token is provided.
-- ============================================================

-- Enum types -------------------------------------------------
do $$ begin
  create type app_role as enum ('citizen', 'collector', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'claimed', 'collected', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type collector_status as enum ('pending', 'approved', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bin_approval as enum ('approved', 'pending', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voucher_category as enum ('Mobile Data', 'Supermarket', 'Utility');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wastage_type as enum (
    'Plastic', 'Paper', 'Glass', 'Metal', 'Food Waste', 'Iron', 'Cardboard', 'Electronic'
  );
exception when duplicate_object then null; end $$;

-- Tables -----------------------------------------------------
create table if not exists public.app_users (
  id         text primary key,                -- client-generated (demo auth seam)
  name       text not null,
  email      text not null unique,
  role       app_role not null default 'citizen',
  avatar_url text,
  tier       text,
  created_at timestamptz not null default now()
);

create table if not exists public.collectors (
  id            text primary key,
  user_id       text not null references public.app_users(id) on delete cascade,
  name          text not null,
  email         text not null,
  status        collector_status not null default 'pending',
  total_jobs    integer not null default 0,
  penalty_count integer not null default 0,
  joined_at     timestamptz not null default now(),
  avatar_url    text,
  lat           double precision not null default 6.9271,
  lng           double precision not null default 79.8612
);

create table if not exists public.bins (
  id              text primary key,
  device_id       text not null unique,
  label           text not null,
  lat             double precision not null,
  lng             double precision not null,
  address         text not null,
  size_l          integer not null check (size_l in (20, 100, 240)),
  fill_pct        integer not null default 0 check (fill_pct between 0 and 100),
  battery_pct     integer not null default 100 check (battery_pct between 0 and 100),
  air_gap_cm      integer not null default 0,
  last_ping_at    timestamptz not null default now(),
  is_public       boolean not null default true,
  region          text not null default 'Colombo 07',
  waste_type      wastage_type not null default 'Plastic',
  citizen_id      text references public.app_users(id) on delete set null,
  approval_status bin_approval not null default 'approved',
  submitted_by    text references public.app_users(id) on delete set null,
  submitted_at    timestamptz,
  pairing_code          text,                             -- secret the device must present (QR sticker / setup portal)
  bin_height_cm         numeric check (bin_height_cm is null or bin_height_cm between 5 and 500),  -- sensor self-measured inside height
  calibrated_at         timestamptz,
  recalibrate_requested boolean not null default false
);

create table if not exists public.pickup_requests (
  id                 text primary key,
  citizen_id         text not null references public.app_users(id) on delete cascade,
  bin_id             text not null references public.bins(id) on delete cascade,
  wastage_type       wastage_type not null,
  preferred_slot     text not null,
  status             request_status not null default 'pending',
  collector_id       text references public.collectors(id) on delete set null,
  created_at         timestamptz not null default now(),
  claimed_at         timestamptz,
  collected_at       timestamptz,
  observed_fill_pct  integer check (observed_fill_pct between 0 and 100),
  actual_wastage_type wastage_type,
  driver_comment     text,
  photo_ref          text,
  points_awarded     numeric(10, 2),
  mismatch_flag      boolean not null default false,
  invalid_flag       boolean not null default false
);

create table if not exists public.transactions (
  id             text primary key,
  citizen_id     text not null references public.app_users(id) on delete cascade,
  request_id     text,                         -- pickup id, or voucher id for redemptions
  date           timestamptz not null default now(),
  wastage_type   wastage_type not null default 'Plastic',
  fill_pct       integer not null default 0,
  points         numeric(10, 2) not null,
  collector_name text not null default 'Unknown',
  kind           text not null default 'earn' check (kind in ('earn', 'redeem')),
  voucher_name   text
);

create table if not exists public.vouchers (
  id          text primary key,
  name        text not null,
  category    voucher_category not null,
  cost_points integer not null check (cost_points >= 0),
  stock       integer not null default 0 check (stock >= 0),
  qr_payload  text not null
);

create table if not exists public.settings (
  id              integer primary key default 1 check (id = 1),  -- single row
  base_point_caps jsonb not null default '{"20":50,"100":120,"240":200}',
  multipliers     jsonb not null default '{"Plastic":1.0,"Paper":0.8,"Glass":1.2,"Metal":1.5,"Food Waste":0.5,"Iron":1.8,"Cardboard":0.9,"Electronic":2.5}',
  updated_at      timestamptz not null default now()
);

-- Indexes ----------------------------------------------------
create index if not exists idx_requests_citizen   on public.pickup_requests (citizen_id);
create index if not exists idx_requests_collector on public.pickup_requests (collector_id);
create index if not exists idx_requests_status    on public.pickup_requests (status);
create index if not exists idx_transactions_citizen on public.transactions (citizen_id);
create index if not exists idx_bins_public on public.bins (is_public) where is_public;

-- Device telemetry RPC ----------------------------------------
-- ESP32 devices call this via PostgREST to push sensor readings.
-- The timestamp is set by the database, so devices don't need NTP.
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

-- Minimum-fill gate -----------------------------------------------
-- A pickup request can only be created when the bin's latest telemetry
-- fill_pct is >= 20 (client apps gate at the same threshold).
create or replace function public.enforce_min_fill_on_request()
returns trigger
language plpgsql
as $fn$
declare
  latest_fill int;
begin
  select fill_pct into latest_fill from public.bins where id = NEW.bin_id;
  if latest_fill is null then
    raise exception 'Bin % not found', NEW.bin_id;
  end if;
  if latest_fill < 20 then
    raise exception 'Pickup declined: bin "%" is at %%% — pickups are accepted only at 20%%+ capacity',
      NEW.bin_id, latest_fill;
  end if;
  return NEW;
end;
$fn$;

drop trigger if exists trg_min_fill_on_request on public.pickup_requests;
create trigger trg_min_fill_on_request
  before insert on public.pickup_requests
  for each row execute function public.enforce_min_fill_on_request();

-- Row Level Security -----------------------------------------
-- Demo phase: anon key is used directly from the browser (no Supabase Auth
-- sessions yet), so policies are permissive. Tighten per-user when real
-- Supabase Auth is wired in.
alter table public.app_users       enable row level security;
alter table public.collectors      enable row level security;
alter table public.bins            enable row level security;
alter table public.pickup_requests enable row level security;
alter table public.transactions    enable row level security;
alter table public.vouchers        enable row level security;
alter table public.settings        enable row level security;

do $$ begin
  create policy "demo_public_access" on public.app_users for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_public_access" on public.collectors for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_public_access" on public.bins for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_public_access" on public.pickup_requests for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_public_access" on public.transactions for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_public_access" on public.vouchers for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_public_access" on public.settings for all using (true) with check (true);
exception when duplicate_object then null; end $$;
