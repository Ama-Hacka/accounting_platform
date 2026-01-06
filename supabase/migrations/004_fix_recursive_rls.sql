-- Drop the recursive policy if it exists
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Create a secure function to check if the current user is an admin
-- 'SECURITY DEFINER' means this function runs with the privileges of the creator (postgres/superuser),
-- bypassing RLS on the profiles table itself during the check.
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role in ('owner', 'staff')
  );
end;
$$ language plpgsql security definer;

-- Re-create the policy using the safe function
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    public.is_admin()
  );

-- Ensure users can still see their own profile (this doesn't recurse because it matches on ID directly)
-- If this policy already exists from a previous step, this command might fail benignly or be skipped.
-- We'll use DO block to add it safely if missing, or you can just rely on your previous setup.
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'profiles' 
    and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.profiles
      for select
      using ( auth.uid() = id );
  end if;
end
$$;
