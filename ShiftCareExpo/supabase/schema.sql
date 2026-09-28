-- ShiftCare database schema for Supabase (Postgres)
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run

-- 1. Profiles (one row per staff member, mirrors auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'Staff',
  specialization text default '',
  hospital_unit text default '',
  email text not null,
  phone text default '',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, hospital_unit)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Staff'),
    coalesce(new.raw_user_meta_data->>'hospital_unit', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Shifts
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  start_time text not null,
  end_time text not null,
  department text not null,
  location text not null default '',
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED','AVAILABLE','SWAPPED','OVERTIME','COMPLETED')),
  created_at timestamptz not null default now()
);
create index if not exists idx_shifts_user_date on shifts(user_id, date);

-- 3. Swap requests
create table if not exists swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  offered_shift_id uuid not null references shifts(id) on delete cascade,
  requested_shift_id uuid references shifts(id) on delete set null,
  target_user_id uuid references profiles(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  note text default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_swap_status on swap_requests(status);

-- 4. Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'GENERAL' check (type in ('URGENT_NEED','SWAP_APPROVAL','SWAP_REQUEST','TRAINING','SHIFT_UPDATE','GENERAL')),
  is_urgent boolean not null default false,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, is_read);

-- ===================== ROW LEVEL SECURITY =====================
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table swap_requests enable row level security;
alter table notifications enable row level security;

-- Profiles: any signed-in team member can see everyone (needed to show whose shift it is),
-- but you can only edit your own profile.
create policy "profiles are viewable by authenticated users" on profiles
  for select using (auth.role() = 'authenticated');
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Shifts: whole team can view the schedule; you can only create/edit/delete your own shifts.
create policy "shifts are viewable by authenticated users" on shifts
  for select using (auth.role() = 'authenticated');
create policy "users can insert own shifts" on shifts
  for insert with check (auth.uid() = user_id);
create policy "users can update own shifts" on shifts
  for update using (auth.uid() = user_id);
create policy "users can delete own shifts" on shifts
  for delete using (auth.uid() = user_id);

-- Swap requests: team can view all open swaps; requester can create/cancel;
-- the target user (or anyone, for open/unclaimed offers) can update status to accept/reject.
create policy "swap requests viewable by authenticated users" on swap_requests
  for select using (auth.role() = 'authenticated');
create policy "users can create own swap requests" on swap_requests
  for insert with check (auth.uid() = requester_id);
create policy "requester or target can update swap request" on swap_requests
  for update using (
    auth.uid() = requester_id
    or auth.uid() = target_user_id
    or (target_user_id is null and status = 'PENDING')
  );

-- Notifications: users only see their own.
create policy "users see own notifications" on notifications
  for select using (auth.uid() = user_id);
create policy "users can update own notifications" on notifications
  for update using (auth.uid() = user_id);
create policy "authenticated users can insert notifications" on notifications
  for insert with check (auth.role() = 'authenticated');

-- ===================== SWAP ACCEPT FUNCTION =====================
-- Atomically: mark swap accepted, flip both shifts to the new owners, notify both people.
create or replace function accept_swap(swap_id uuid)
returns void as $$
declare
  s swap_requests%rowtype;
  offered shifts%rowtype;
  requested shifts%rowtype;
  accepter uuid := auth.uid();
begin
  select * into s from swap_requests where id = swap_id for update;
  if s.status <> 'PENDING' then
    raise exception 'Swap is no longer pending';
  end if;

  select * into offered from shifts where id = s.offered_shift_id;

  update swap_requests
    set status = 'ACCEPTED', target_user_id = accepter, resolved_at = now()
    where id = swap_id;

  -- Give the offered shift to the accepter
  update shifts set user_id = accepter, status = 'SWAPPED' where id = s.offered_shift_id;

  -- If a specific shift was requested in return, give it to the original requester
  if s.requested_shift_id is not null then
    update shifts set user_id = s.requester_id, status = 'SWAPPED' where id = s.requested_shift_id;
  end if;

  insert into notifications (user_id, title, message, type)
  values (
    s.requester_id,
    'Your swap request was accepted',
    'Your shift on ' || offered.date || ' (' || offered.department || ') was picked up.',
    'SWAP_APPROVAL'
  );
end;
$$ language plpgsql security definer;
