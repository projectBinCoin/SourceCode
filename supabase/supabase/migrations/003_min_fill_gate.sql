-- ════════════════════════════════════════════════════════════════════
-- 003_min_fill_gate.sql — server-side 20% minimum-fill rule
-- ════════════════════════════════════════════════════════════════════
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- The citizen apps already block bookings on bins under 20% fill
-- (MIN_FILL_FOR_PICKUP). This trigger enforces the same rule inside the
-- database so a request can't bypass the client (API calls, stale apps,
-- or a bin that dropped below 20% between list render and submit).
--
-- Rule: a pickup request is rejected when the bin's latest telemetry
-- fill_pct is strictly less than 20. fill_pct = 20 is accepted.

create or replace function public.enforce_min_fill_on_request()
returns trigger
language plpgsql
as $fn$
declare
  latest_fill int;
begin
  select fill_pct into latest_fill
    from public.bins
   where id = NEW.bin_id;

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
