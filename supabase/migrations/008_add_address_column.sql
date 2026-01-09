-- Add address column to profiles table
alter table public.profiles 
  add column if not exists address text;

-- Add phone_number column if it doesn't exist
alter table public.profiles 
  add column if not exists phone_number text;

-- Add account_type column if it doesn't exist
alter table public.profiles 
  add column if not exists account_type text 
  check (account_type in ('individual', 'business')) 
  default 'individual';
