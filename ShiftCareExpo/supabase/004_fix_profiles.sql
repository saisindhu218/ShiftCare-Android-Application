-- Run once in Supabase SQL Editor. Safe to re-run any time (fully idempotent).
-- Fixes accounts that exist in auth.users but have no row in profiles
-- (they show no name on Home and never appear in the Admin doctor list).

-- 1. Recreate the signup trigger so every future account gets a profile.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, hospital_unit)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'Staff'),
    coalesce(new.raw_user_meta_data->>'hospital_unit', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Backfill a profile for every existing account that lacks one.
insert into public.profiles (id, name, email, role, hospital_unit)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)),
       u.email,
       coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'Staff'),
       coalesce(u.raw_user_meta_data->>'hospital_unit', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 3. Let a signed-in user create their own profile row (the app self-heals with this).
drop policy if exists "users can insert own profile" on profiles;
create policy "users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- 4. Status report: every account, plus which triggers are installed.
--    Expect: every account "ok", and 3 triggers listed.
select 'account' as kind,
       u.email as detail,
       case
         when p.created_at > u.created_at + interval '1 minute' then 'ok (profile was missing, fixed just now)'
         else 'ok'
       end || ' - name: ' || coalesce(p.name, '?') || ', admin: ' || coalesce(p.is_admin::text, '?') as status
from auth.users u
left join public.profiles p on p.id = u.id
union all
select 'trigger', t.tgname::text, 'installed'
from pg_trigger t
where t.tgname in ('on_auth_user_created', 'trg_prevent_double_booking', 'trg_notify_swap_created')
  and not t.tgisinternal
order by 1, 2;
