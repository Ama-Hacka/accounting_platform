create or replace function public.enforce_admin_domain()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.role in ('owner','staff') then
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

drop trigger if exists trg_profiles_admin_domain on public.profiles;
create trigger trg_profiles_admin_domain
before insert or update on public.profiles
for each row execute procedure public.enforce_admin_domain();
