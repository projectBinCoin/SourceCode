-- 013: backend-driven priority. Bins at >= 80% fill are flagged 'urgent'
-- in the database itself (not just in the UI), and the flag propagates to
-- their open pickup requests. Device telemetry updates fill_pct → the
-- trigger re-evaluates → realtime pushes the change to every collector.
-- Also includes 012 (notes) so this file alone is enough.

alter table public.pickup_requests add column if not exists notes text;

alter table public.bins
  add column if not exists priority text not null default 'normal'
  check (priority in ('normal', 'urgent'));
alter table public.pickup_requests
  add column if not exists priority text not null default 'normal'
  check (priority in ('normal', 'urgent'));

create or replace function public.priority_for_fill(p_fill integer)
returns text language sql immutable as $$
  select case when p_fill >= 80 then 'urgent' else 'normal' end   -- -1 (sensor fault) → normal
$$;

-- bins: stamp priority on every fill change.
create or replace function public.trg_bin_priority()
returns trigger language plpgsql as $$
begin
  new.priority := public.priority_for_fill(new.fill_pct);
  return new;
end $$;

drop trigger if exists trg_bin_priority on public.bins;
create trigger trg_bin_priority
  before insert or update of fill_pct on public.bins
  for each row execute function public.trg_bin_priority();

-- bins → open requests: propagate when the bin's priority flips.
-- Listens on fill_pct: an UPDATE OF priority trigger would never fire,
-- because priority is only changed by the BEFORE trigger, not the SET list.
create or replace function public.trg_bin_priority_propagate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.priority is distinct from old.priority then
    update pickup_requests set priority = new.priority
     where bin_id = new.id and status in ('pending', 'claimed');
  end if;
  return new;
end $$;

drop trigger if exists trg_bin_priority_propagate on public.bins;
create trigger trg_bin_priority_propagate
  after update of fill_pct on public.bins
  for each row execute function public.trg_bin_priority_propagate();

-- new request: inherit the bin's current priority.
create or replace function public.trg_request_priority()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select priority into new.priority from bins where id = new.bin_id;
  new.priority := coalesce(new.priority, 'normal');
  return new;
end $$;

drop trigger if exists trg_request_priority on public.pickup_requests;
create trigger trg_request_priority
  before insert on public.pickup_requests
  for each row execute function public.trg_request_priority();

-- Backfill existing rows.
update public.bins set priority = public.priority_for_fill(fill_pct);
update public.pickup_requests r set priority = b.priority
  from public.bins b where b.id = r.bin_id and r.status in ('pending', 'claimed');
