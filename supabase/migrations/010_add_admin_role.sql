-- Add 'admin' as a valid firm role.
-- This keeps existing roles intact and updates the admin-check helper.

do $$
begin
  -- Drop the default check constraint name if present.
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
exception
  when undefined_table then
    -- If profiles doesn't exist in this environment, skip.
    null;
end $$;

-- Re-add role constraint including 'admin'
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner','admin','staff','client'));

-- Update admin helper to include the new 'admin' role
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin', 'staff')
  );
end;
$$ language plpgsql security definer;
