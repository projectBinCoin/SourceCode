-- 011: subscribe the app to live row changes (Supabase Realtime).
-- Tables must be in the supabase_realtime publication for
-- postgres_changes subscriptions to deliver events to clients.

do $$
declare t text;
begin
  foreach t in array array['bins', 'pickup_requests', 'transactions', 'vouchers', 'app_users', 'collectors', 'settings', 'announced_devices'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
