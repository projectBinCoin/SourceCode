-- ════════════════════════════════════════════════════════════════════
-- 009_pickup_photos.sql — collection-proof photos
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Collectors upload a photo when completing a pickup; the URL lands in
-- pickup_requests.photo_ref and shows on the citizen request-status
-- page + admin audit. Public read (URLs are unguessable), authenticated
-- upload only.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('pickup-photos', 'pickup-photos', true)
on conflict (id) do nothing;

-- Any signed-in user can view (bucket is public anyway, but keep the
-- policy explicit for clarity).
create policy "pickup photos public read"
  on storage.objects for select
  using (bucket_id = 'pickup-photos');

-- Only authenticated users (collectors) can upload.
create policy "collectors upload pickup photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pickup-photos');
