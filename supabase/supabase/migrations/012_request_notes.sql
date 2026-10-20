-- 012: citizen notes on pickup requests (collector job detail).
alter table public.pickup_requests add column if not exists notes text;
