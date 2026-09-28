-- Run in Supabase SQL Editor AFTER schema.sql and 002_admin_role.sql.
-- Safe to run once. Adds real-world shift rules.

-- 1. Admins can assign a shift to ANY doctor (doctors can still add their own).
create policy "admins can insert shifts for anyone" on shifts
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- 2. A doctor cannot be booked twice on the same date (covers manual add, admin assign, and swaps).
create or replace function prevent_double_booking()
returns trigger as $$
begin
  if exists (
    select 1 from shifts
    where user_id = new.user_id
      and date = new.date
      and id <> new.id
  ) then
    raise exception 'That doctor already has a shift on %', new.date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_double_booking on shifts;
create trigger trg_prevent_double_booking
  before insert or update of user_id, date on shifts
  for each row execute procedure prevent_double_booking();

-- 3. Safer accept_swap: validates, then notifies the requester AND every admin.
create or replace function accept_swap(swap_id uuid)
returns void as $$
declare
  s swap_requests%rowtype;
  offered shifts%rowtype;
  accepter uuid := auth.uid();
  accepter_name text;
  requester_name text;
begin
  select * into s from swap_requests where id = swap_id for update;
  if not found then
    raise exception 'Swap not found';
  end if;
  if s.status <> 'PENDING' then
    raise exception 'Swap is no longer pending';
  end if;
  if s.requester_id = accepter then
    raise exception 'You cannot accept your own swap offer';
  end if;

  select * into offered from shifts where id = s.offered_shift_id;
  if offered.date < current_date then
    raise exception 'This shift has already passed';
  end if;
  if exists (select 1 from shifts where user_id = accepter and date = offered.date) then
    raise exception 'You already have a shift on %', offered.date;
  end if;

  select name into accepter_name from profiles where id = accepter;
  select name into requester_name from profiles where id = s.requester_id;

  update swap_requests
    set status = 'ACCEPTED', target_user_id = accepter, resolved_at = now()
    where id = swap_id;

  update shifts set user_id = accepter, status = 'SWAPPED' where id = s.offered_shift_id;

  if s.requested_shift_id is not null then
    update shifts set user_id = s.requester_id, status = 'SWAPPED' where id = s.requested_shift_id;
  end if;

  insert into notifications (user_id, title, message, type)
  values (
    s.requester_id,
    'Your swap request was accepted',
    coalesce(accepter_name, 'A colleague') || ' took your ' || offered.department || ' shift on ' || offered.date || '.',
    'SWAP_APPROVAL'
  );

  insert into notifications (user_id, title, message, type)
  select p.id,
         'Swap completed',
         coalesce(requester_name, '?') || ' → ' || coalesce(accepter_name, '?') || ': ' || offered.department || ' on ' || offered.date,
         'SWAP_APPROVAL'
  from profiles p
  where p.is_admin = true and p.id <> s.requester_id and p.id <> accepter;
end;
$$ language plpgsql security definer;

-- 4. When someone offers a shift, tell everyone else (so vacancies actually reach people).
create or replace function notify_swap_created()
returns trigger as $$
declare
  offered shifts%rowtype;
  requester_name text;
begin
  select * into offered from shifts where id = new.offered_shift_id;
  select name into requester_name from profiles where id = new.requester_id;

  insert into notifications (user_id, title, message, type)
  select p.id,
         'New shift available',
         coalesce(requester_name, 'A colleague') || ' offered a ' || offered.department || ' shift on ' || offered.date
           || ' (' || offered.start_time || ' - ' || offered.end_time || '). Open the Swap tab to accept.',
         'SWAP_REQUEST'
  from profiles p
  where p.id <> new.requester_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_swap_created on swap_requests;
create trigger trg_notify_swap_created
  after insert on swap_requests
  for each row execute procedure notify_swap_created();
