-- Run this in Supabase SQL Editor AFTER the original schema.sql is already in place.
-- Adds: admin role, admin RLS policies, and a reject_swap() function.

alter table profiles add column if not exists is_admin boolean not null default false;

create policy "admins can update any shift" on shifts
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
create policy "admins can delete any shift" on shifts
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins can update any swap request" on swap_requests
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admins can update any profile" on profiles
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create or replace function reject_swap(swap_id uuid)
returns void as $$
declare
  s swap_requests%rowtype;
  offered shifts%rowtype;
  decliner_name text;
begin
  select * into s from swap_requests where id = swap_id for update;
  if s.status <> 'PENDING' then
    raise exception 'Swap is no longer pending';
  end if;

  select * into offered from shifts where id = s.offered_shift_id;
  select name into decliner_name from profiles where id = auth.uid();

  insert into notifications (user_id, title, message, type)
  values (
    s.requester_id,
    'A colleague declined your swap',
    coalesce(decliner_name, 'A colleague') || ' passed on your shift for ' || offered.date || '. It''s still open to others.',
    'SWAP_REQUEST'
  );
  -- Status stays PENDING so it remains open for other teammates to accept.
end;
$$ language plpgsql security definer;

-- After running this, make at least one person an admin by hand:
-- update profiles set is_admin = true where email = 'your-manager@example.com';
