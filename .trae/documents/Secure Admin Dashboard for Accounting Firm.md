## Overview
Design a secure admin dashboard where owners and staff manage clients, see their documents, and upload tax returns that appear in the client dashboard. Tax returns are their own entity with dedicated table and storage bucket (not “returned documents”).

## Architecture
- AuthN/AuthZ: Supabase Auth with RBAC via profiles.role
- Data: Postgres tables for user documents and tax returns; staff-to-client assignment table
- Storage: Private buckets — documents (client uploads) and tax_returns (admin uploads)
- Backend: Edge Function to upload tax returns securely with validation and metadata writes
- UI: Next.js App Router with protected /admin pages (client list, client detail)

## Data Model
- profiles (existing): add role and org fields
- user_documents: metadata for client uploads (title, type, year, file_path)
- tax_returns: metadata for admin uploads (title, form_type, year, status, file_path)
- staff_clients: mapping of staff to assigned clients

### SQL (run in Supabase)
```sql
-- Profiles RBAC
alter table public.profiles add column if not exists role text check (role in ('owner','staff','client')) default 'client';
alter table public.profiles add column if not exists org_id uuid;
create index if not exists profiles_role_idx on public.profiles(role);

-- Client uploads metadata
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  doctype text not null,
  year int not null,
  file_path text not null,
  file_type text,
  size bigint,
  created_at timestamptz default now()
);
alter table public.user_documents enable row level security;
create policy "doc_select_own" on public.user_documents for select using (auth.uid() = user_id);
create policy "doc_insert_own" on public.user_documents for insert with check (auth.uid() = user_id);

-- Staff-to-client assignments
create table if not exists public.staff_clients (
  staff_id uuid references auth.users(id) on delete cascade,
  client_id uuid references auth.users(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (staff_id, client_id)
);
alter table public.staff_clients enable row level security;
create policy "assignment_visible_to_staff" on public.staff_clients for select using (auth.uid() = staff_id);
create policy "assignment_visible_to_owner" on public.staff_clients for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- Tax returns metadata (admin uploads)
create table if not exists public.tax_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  form_type text not null, -- 1040, W2, 1099, etc.
  year int not null,
  status text default 'filed', -- filed|pending|needs_review
  file_path text not null,
  file_type text,
  size bigint,
  created_at timestamptz default now()
);
create index if not exists tax_returns_user_year_idx on public.tax_returns(user_id, year);
alter table public.tax_returns enable row level security;
create policy "tr_select_client" on public.tax_returns for select using (auth.uid() = user_id);
create policy "tr_select_staff_owner" on public.tax_returns for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
  or exists (select 1 from public.staff_clients sc where sc.staff_id = auth.uid() and sc.client_id = tax_returns.user_id)
);
create policy "tr_insert_staff_owner" on public.tax_returns for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
  or exists (select 1 from public.staff_clients sc where sc.staff_id = auth.uid() and sc.client_id = tax_returns.user_id)
);

-- Buckets: client uploads + tax returns (admin uploads)
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tax_returns', 'tax_returns', false) on conflict (id) do nothing;

-- Storage policies
-- Client uploads to 'documents'
create policy "docs_insert_client" on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and auth.uid() = owner and name like auth.uid() || '/%');
create policy "docs_select_client" on storage.objects for select to authenticated
using (bucket_id = 'documents' and (auth.uid() = owner or name like auth.uid() || '/%'));

-- Admin uploads to 'tax_returns'
create policy "tr_insert_staff_owner_storage" on storage.objects for insert to authenticated
with check (bucket_id = 'tax_returns' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')));
-- Clients can read their own returns
create policy "tr_select_client_storage" on storage.objects for select to authenticated
using (bucket_id = 'tax_returns' and name like auth.uid() || '/%');
-- Staff/Owner can read for assigned clients
create policy "tr_select_staff_owner_storage" on storage.objects for select to authenticated
using (
  bucket_id = 'tax_returns' and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
    or exists (
      select 1 from public.staff_clients sc
      where sc.staff_id = auth.uid() and split_part(storage.objects.name, '/', 1)::uuid = sc.client_id
    )
  )
);
```

## Edge Function: Upload Tax Return
- POST /functions/v1/upload-tax-return
- Requires JWT; role must be owner or staff
- Validates staff-client assignment (or owner)
- Uploads file to bucket tax_returns at path: `${client_id}/${year}_${form_type}_${slug(title)}.${ext}`
- Inserts row into tax_returns with metadata
- Returns metadata and a short-lived signed URL

## Admin UI
- /admin (protected route by role):
  - Clients page: directory table with search, filters (doc type, year, status), last active, docs needed
  - Client detail: shows user_documents and tax_returns lists, plus “Upload Tax Return” form
- Only the lists re-render on filter changes (SWR/React Query) for smooth UX

## Client Dashboard Integration
- Tax Returns section reads from tax_returns table and uses signed URLs from tax_returns bucket
- Year filter applies to both user_documents and tax_returns

## Security Best Practices
- Private buckets and short-lived signed URLs (5–15 min)
- Strict RLS with role/assignment checks
- Edge function validates inputs, MIME, size; optional ClamAV scan
- Audit logging for create/delete events
- Least privilege: staff limited to assigned clients; owners can access all
- Rate limiting 

## Deliverables
1. SQL migrations above (profiles RBAC, tables, storage, policies)
2. Edge Function upload-tax-return
3. Admin pages (clients directory, client detail with secure upload)
4. Client dashboard wiring to show tax returns
5. Tests for RLS and edge function authorization

## Next Step
Confirm this plan and I’ll implement the SQL, storage policies, edge function, and admin UI accordingly.