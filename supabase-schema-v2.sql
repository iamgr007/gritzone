-- GRITZONE v2 Schema — Full Platform
-- Run this AFTER the v1 schema (or drop all and run fresh)

-- ============================================
-- PROFILES: Add beta, referral, social fields
-- ============================================
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists beta_joined_at timestamptz default now();
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text default '';

-- Generate referral codes for existing users
update public.profiles set referral_code = 'GRIT-' || upper(substr(md5(id::text), 1, 6)) where referral_code is null;

-- ============================================
-- FOOD LOGS
-- ============================================
create table if not exists public.food_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  quantity numeric(7,1) not null default 100,
  unit text not null default 'g',
  calories integer not null default 0,
  protein numeric(5,1) default 0,
  carbs numeric(5,1) default 0,
  fat numeric(5,1) default 0,
  created_at timestamptz default now() not null
);

alter table public.food_logs enable row level security;

create policy "Users can view all food logs" on public.food_logs for select using (auth.role() = 'authenticated');
create policy "Users can insert own food logs" on public.food_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own food logs" on public.food_logs for update using (auth.uid() = user_id);
create policy "Users can delete own food logs" on public.food_logs for delete using (auth.uid() = user_id);

-- ============================================
-- WORKOUTS
-- ============================================
create table if not exists public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null default current_date,
  name text not null default 'Workout',
  duration_seconds integer default 0,
  notes text default '',
  photo_url text,
  created_at timestamptz default now() not null
);

create table if not exists public.workout_sets (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_name text not null,
  muscle_group text not null,
  set_number integer not null,
  weight_kg numeric(6,2) default 0,
  reps integer default 0,
  is_warmup boolean default false,
  created_at timestamptz default now() not null
);

alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

create policy "Users can view all workouts" on public.workouts for select using (auth.role() = 'authenticated');
create policy "Users can insert own workouts" on public.workouts for insert with check (auth.uid() = user_id);
create policy "Users can update own workouts" on public.workouts for update using (auth.uid() = user_id);
create policy "Users can delete own workouts" on public.workouts for delete using (auth.uid() = user_id);

create policy "Users can view all workout sets" on public.workout_sets for select using (auth.role() = 'authenticated');
create policy "Users can insert workout sets" on public.workout_sets for insert with check (true);
create policy "Users can update workout sets" on public.workout_sets for update using (true);
create policy "Users can delete workout sets" on public.workout_sets for delete using (true);

-- ============================================
-- BADGES / ACHIEVEMENTS
-- ============================================
create table if not exists public.user_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_key text not null,
  earned_at timestamptz default now() not null,
  unique(user_id, badge_key)
);

alter table public.user_badges enable row level security;
create policy "Anyone can view badges" on public.user_badges for select using (auth.role() = 'authenticated');
create policy "System can insert badges" on public.user_badges for insert with check (auth.uid() = user_id);

-- ============================================
-- REFERRALS
-- ============================================
create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_id uuid references public.profiles(id) on delete cascade not null,
  bonus_days integer default 30,
  created_at timestamptz default now() not null,
  unique(referred_id)
);

alter table public.referrals enable row level security;
create policy "Users can view own referrals" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "Users can insert referrals" on public.referrals for insert with check (auth.uid() = referred_id);

-- ============================================
-- FOLLOWS (Social)
-- ============================================
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;
create policy "Anyone can view follows" on public.follows for select using (auth.role() = 'authenticated');
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- ============================================
-- WORKOUT PHOTOS (Social Feed)
-- ============================================
create table if not exists public.feed_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'workout_photo',
  photo_url text,
  caption text default '',
  workout_id uuid references public.workouts(id) on delete set null,
  likes_count integer default 0,
  created_at timestamptz default now() not null
);

create table if not exists public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.feed_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(post_id, user_id)
);

alter table public.feed_posts enable row level security;
alter table public.post_likes enable row level security;

create policy "Anyone can view posts" on public.feed_posts for select using (auth.role() = 'authenticated');
create policy "Users can create posts" on public.feed_posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.feed_posts for delete using (auth.uid() = user_id);

create policy "Anyone can view likes" on public.post_likes for select using (auth.role() = 'authenticated');
create policy "Users can like" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.post_likes for delete using (auth.uid() = user_id);

-- ============================================
-- Update handle_new_user to generate referral code
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, referral_code, beta_joined_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'GRIT-' || upper(substr(md5(new.id::text), 1, 6)),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- Storage bucket for photos
-- ============================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "Anyone can view photos" on storage.objects for select using (bucket_id = 'photos');
create policy "Auth users can upload photos" on storage.objects for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "Users can delete own photos" on storage.objects for delete using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
