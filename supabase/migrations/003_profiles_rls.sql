-- Enable RLS on profiles if not already enabled (it usually is)
alter table public.profiles enable row level security;

-- Policy: Owners and Staff can view all profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('owner', 'staff')
    )
  );

-- Policy: Users can view their own profile (usually exists, but ensuring coverage)
create policy "Users can view own profile"
  on public.profiles
  for select
  using ( auth.uid() = id );
