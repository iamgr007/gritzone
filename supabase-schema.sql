-- GRIT Daily Tracker Schema
-- Run this in your Supabase SQL Editor

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  created_at timestamptz default now() not null
);

-- Daily check-ins
create table public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  morning_weight numeric(5,2),
  breakfast text default '',
  lunch text default '',
  dinner text default '',
  snacks text default '',
  workout_done boolean default false,
  workout_details text default '',
  steps_count integer default 0,
  water_intake numeric(4,1) default 0, -- in liters
  sleep_hours numeric(3,1) default 0,
  notes text default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, date)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;

-- Profiles: users can read all profiles (small group), update own
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Checkins: all authenticated users can read all (accountability group)
create policy "Authenticated users can view all checkins"
  on public.checkins for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own checkins"
  on public.checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can update own checkins"
  on public.checkins for update
  using (auth.uid() = user_id);

create policy "Users can delete own checkins"
  on public.checkins for delete
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger checkins_updated_at
  before update on public.checkins
  for each row execute function public.update_updated_at();
