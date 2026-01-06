-- Allow admins to view all user documents in the DB
create policy "Admins can view all user documents"
  on public.user_documents
  for select
  using (
    public.is_admin()
  );

-- Allow admins to insert user documents (for "Upload Document" feature)
create policy "Admins can insert user documents"
  on public.user_documents
  for insert
  with check (
    public.is_admin()
  );

-- Allow admins to view files in 'documents' bucket
create policy "Admins can view all document files"
  on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and public.is_admin()
  );

-- Allow admins to upload files to 'documents' bucket
create policy "Admins can upload document files"
  on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and public.is_admin()
  );
