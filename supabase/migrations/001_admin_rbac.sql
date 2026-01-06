alter table public.profiles add column if not exists role text check (role in ('owner','staff','client')) default 'client';
alter table public.profiles add column if not exists org_id uuid;
create index if not exists profiles_role_idx on public.profiles(role);

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

create table if not exists public.tax_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  form_type text not null,
  year int not null,
  status text default 'filed',
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

insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tax_returns', 'tax_returns', false) on conflict (id) do nothing;

create policy "docs_insert_client" on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and auth.uid() = owner and name like auth.uid() || '/%');
create policy "docs_select_client" on storage.objects for select to authenticated
using (bucket_id = 'documents' and (auth.uid() = owner or name like auth.uid() || '/%'));

create policy "tr_insert_staff_owner_storage" on storage.objects for insert to authenticated
with check (bucket_id = 'tax_returns' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','staff')));
create policy "tr_select_client_storage" on storage.objects for select to authenticated
using (bucket_id = 'tax_returns' and name like auth.uid() || '/%');
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
