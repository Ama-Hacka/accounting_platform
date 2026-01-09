-- Create a function to handle new user registration
-- This copies user metadata to the profiles table including preferred_language
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    phone_number,
    account_type,
    preferred_language,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    coalesce(new.raw_user_meta_data->>'account_type', 'individual'),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    'client'
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    phone_number = coalesce(excluded.phone_number, profiles.phone_number),
    account_type = coalesce(excluded.account_type, profiles.account_type),
    preferred_language = coalesce(excluded.preferred_language, profiles.preferred_language);
  return new;
end;
$$;

-- Drop the trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
