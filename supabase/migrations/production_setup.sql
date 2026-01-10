-- =============================================================================
-- IC Multi Services - Production Database Setup
-- =============================================================================
-- Run this script in your NEW Supabase project's SQL Editor (Dashboard > SQL Editor)
-- This creates all tables, functions, RLS policies, storage buckets, and triggers
-- =============================================================================

-- =============================================================================
-- PART 1: HELPER FUNCTIONS
-- =============================================================================

-- Admin check function (SECURITY DEFINER to bypass RLS during the check)
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

-- Enforce admin domain - only @icmultiservices.com emails can be owner/admin/staff
create or replace function public.enforce_admin_domain()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.role in ('owner', 'admin', 'staff') then
    if not exists (
      select 1 from auth.users u
      where u.id = NEW.id and u.email like '%@icmultiservices.com'
    ) then
      raise exception 'Admin roles require @icmultiservices.com email';
    end if;
  end if;
  return NEW;
end;
$$;

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone_number,
    account_type,
    preferred_language,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    coalesce(new.raw_user_meta_data->>'account_type', 'individual'),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    'client'
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    phone_number = coalesce(excluded.phone_number, profiles.phone_number),
    account_type = coalesce(excluded.account_type, profiles.account_type),
    preferred_language = coalesce(excluded.preferred_language, profiles.preferred_language);
  return new;
end;
$$;

-- =============================================================================
-- PART 2: TABLES
-- =============================================================================

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  first_name text,
  last_name text,
  phone_number text,
  address text,
  account_type text default 'individual' check (account_type in ('individual', 'business')),
  preferred_language text default 'en' check (preferred_language in ('en', 'es')),
  role text default 'client' check (role in ('owner', 'admin', 'staff', 'client')),
  org_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_preferred_language_idx on public.profiles(preferred_language);

-- Staff-Client assignments
create table if not exists public.staff_clients (
  staff_id uuid references auth.users(id) on delete cascade,
  client_id uuid references auth.users(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (staff_id, client_id)
);

-- User documents (client uploads)
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  doctype text not null,
  year integer not null,
  file_path text not null,
  file_type text,
  size bigint,
  created_at timestamptz default now()
);

-- Tax returns (staff uploads for clients)
create table if not exists public.tax_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  form_type text not null,
  year integer not null,
  status text default 'filed',
  file_path text not null,
  file_type text,
  size bigint,
  created_at timestamptz default now()
);

create index if not exists tax_returns_user_year_idx on public.tax_returns(user_id, year);

-- Audit logs (for tracking admin actions)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text not null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_user_email text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

create index if not exists audit_logs_admin_idx on public.audit_logs(admin_id);
create index if not exists audit_logs_target_idx on public.audit_logs(target_user_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- Account recovery requests
create table if not exists public.account_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  original_email text not null,
  new_email text not null,
  status text default 'pending' not null 
    check (status in ('pending', 'documents_requested', 'documents_received', 'approved', 'rejected', 'completed')),
  ip_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_notes text
);

create index if not exists idx_recovery_original_email on public.account_recovery_requests(original_email);
create index if not exists idx_recovery_status on public.account_recovery_requests(status);

-- =============================================================================
-- PART 3: TRIGGERS
-- =============================================================================

-- Trigger: Auto-create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Enforce admin domain on profile changes
drop trigger if exists trg_profiles_admin_domain on public.profiles;
create trigger trg_profiles_admin_domain
  before insert or update on public.profiles
  for each row execute procedure public.enforce_admin_domain();

-- =============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.staff_clients enable row level security;
alter table public.user_documents enable row level security;
alter table public.tax_returns enable row level security;
alter table public.audit_logs enable row level security;
alter table public.account_recovery_requests enable row level security;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own profile
create policy "profiles select by owner"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can insert their own profile
create policy "profiles insert by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "profiles update by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Admins can update all profiles
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- STAFF_CLIENTS POLICIES
-- -----------------------------------------------------------------------------

-- Staff can see their own assignments
create policy "assignment_visible_to_staff"
  on public.staff_clients for select
  using (auth.uid() = staff_id);

-- Owners can see all assignments
create policy "assignment_visible_to_owner"
  on public.staff_clients for select
  using (exists (
    select 1 from public.profiles p 
    where p.id = auth.uid() and p.role = 'owner'
  ));

-- -----------------------------------------------------------------------------
-- USER_DOCUMENTS POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own documents
create policy "Users can view own documents"
  on public.user_documents for select
  using (auth.uid() = user_id);

-- Users can insert their own documents
create policy "Users can insert own documents"
  on public.user_documents for insert
  with check (auth.uid() = user_id);

-- Admins can view all user documents
create policy "Admins can view all user documents"
  on public.user_documents for select
  using (public.is_admin());

-- Admins can insert documents for users
create policy "Admins can insert user documents"
  on public.user_documents for insert
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- TAX_RETURNS POLICIES
-- -----------------------------------------------------------------------------

-- Clients can view their own tax returns
create policy "tr_select_client"
  on public.tax_returns for select
  using (auth.uid() = user_id);

-- Owners and assigned staff can view tax returns
create policy "tr_select_staff_owner"
  on public.tax_returns for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
    or exists (select 1 from public.staff_clients sc where sc.staff_id = auth.uid() and sc.client_id = tax_returns.user_id)
  );

-- Owners and assigned staff can insert tax returns
create policy "tr_insert_staff_owner"
  on public.tax_returns for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
    or exists (select 1 from public.staff_clients sc where sc.staff_id = auth.uid() and sc.client_id = tax_returns.user_id)
  );

-- -----------------------------------------------------------------------------
-- AUDIT_LOGS POLICIES
-- -----------------------------------------------------------------------------

-- Only owners can view audit logs
create policy "Owners can view audit logs"
  on public.audit_logs for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  ));

-- Admins can insert audit logs
create policy "Admins can insert audit logs"
  on public.audit_logs for insert
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- ACCOUNT_RECOVERY_REQUESTS POLICIES
-- -----------------------------------------------------------------------------

-- Admins manage recovery requests
create policy "Admins manage recovery requests"
  on public.account_recovery_requests
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- PART 5: STORAGE BUCKETS (PRIVATE)
-- =============================================================================

-- Create private storage buckets
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('tax_returns', 'tax_returns', false)
on conflict (id) do nothing;

-- =============================================================================
-- PART 6: STORAGE RLS POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DOCUMENTS BUCKET POLICIES
-- -----------------------------------------------------------------------------

-- Clients can upload their own documents (path must start with their user ID)
create policy "docs_insert_client"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents' 
    and auth.uid() = owner 
    and name like auth.uid() || '/%'
  );

-- Clients can view their own documents
create policy "docs_select_client"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents' 
    and (auth.uid() = owner or name like auth.uid() || '/%')
  );

-- Admins can upload to documents bucket
create policy "Admins can upload document files"
  on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_admin());

-- Admins can view all documents
create policy "Admins can view all document files"
  on storage.objects for select
  using (bucket_id = 'documents' and public.is_admin());

-- -----------------------------------------------------------------------------
-- TAX_RETURNS BUCKET POLICIES
-- -----------------------------------------------------------------------------

-- Staff/Owners can upload tax returns
create policy "tr_insert_staff_owner_storage"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tax_returns' 
    and exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role in ('owner', 'staff')
    )
  );

-- Clients can view their own tax returns (path starts with their user ID)
create policy "tr_select_client_storage"
  on storage.objects for select to authenticated
  using (bucket_id = 'tax_returns' and name like auth.uid() || '/%');

-- Owners and assigned staff can view tax returns
create policy "tr_select_staff_owner_storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tax_returns' 
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
      or exists (
        select 1 from public.staff_clients sc
        where sc.staff_id = auth.uid() 
        and split_part(storage.objects.name, '/', 1)::uuid = sc.client_id
      )
    )
  );

-- =============================================================================
-- PART 7: INITIAL ADMIN SETUP (OPTIONAL)
-- =============================================================================
-- After creating your first @icmultiservices.com user via signup,
-- run this to make them an owner (replace the email):
--
-- UPDATE public.profiles 
-- SET role = 'owner' 
-- WHERE email = 'youremail@icmultiservices.com';
--
-- =============================================================================

-- Done! Your database is ready.
