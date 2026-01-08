-- Add preferred_language column to profiles table
alter table public.profiles 
  add column if not exists preferred_language text 
  check (preferred_language in ('en', 'es')) 
  default 'en';

-- Create index for filtering by language if needed
create index if not exists profiles_preferred_language_idx on public.profiles(preferred_language);
