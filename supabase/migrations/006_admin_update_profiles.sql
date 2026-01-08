-- Allow admins to update client profiles
create policy "Admins can update profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Audit log table for tracking sensitive admin actions
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text not null,
  action text not null, -- 'email_change', 'profile_update', 'password_reset_sent'
  target_user_id uuid references auth.users(id) on delete set null,
  target_user_email text,
  details jsonb, -- stores old/new values
  ip_address text,
  created_at timestamptz default now()
);

-- Index for querying audit logs
create index if not exists audit_logs_admin_idx on public.audit_logs(admin_id);
create index if not exists audit_logs_target_idx on public.audit_logs(target_user_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- RLS: Only owners can view audit logs (not regular staff)
alter table public.audit_logs enable row level security;

create policy "Owners can view audit logs"
  on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- Admins can insert audit logs
create policy "Admins can insert audit logs"
  on public.audit_logs
  for insert
  with check (public.is_admin());
