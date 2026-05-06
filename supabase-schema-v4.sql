-- =====================================================================
-- GRITZONE schema v4
--   - Trainer hourly / per-session rates (in addition to monthly)
--   - Trainer marketplace fields (accepting_clients, languages, modes)
--   - Client-initiated coaching requests (coaching_requests)
--   - In-app notifications (notifications) to back the bell icon
--   - Daily targets (daily_targets) — populated when AI plan is activated,
--     so the food + workout tabs show the user what to hit each day.
--   - Active plan pointer on profiles.active_workout_plan_id / active_diet_plan_id
-- Run after supabase-schema-v3.sql.
-- =====================================================================

-- 1. Trainer marketplace fields ---------------------------------------------
alter table public.profiles
  add column if not exists trainer_hourly_inr int check (trainer_hourly_inr is null or trainer_hourly_inr >= 0),
  add column if not exists trainer_session_inr int check (trainer_session_inr is null or trainer_session_inr >= 0),
  -- monthly rate already exists as trainer_rate_inr in v2/v3
  add column if not exists trainer_accepting_clients boolean not null default true,
  add column if not exists trainer_languages text,            -- comma-sep, e.g. "English, Hindi, Tamil"
  add column if not exists trainer_modes text,                -- comma-sep, e.g. "online, in-person"
  add column if not exists active_workout_plan_id uuid references public.ai_plans(id) on delete set null,
  add column if not exists active_diet_plan_id uuid references public.ai_plans(id) on delete set null;

-- A public coach directory view consumed by /coaches.
-- Excludes coaches that haven't filled out at least a specialty, so the
-- directory always feels populated rather than half-blank.
create or replace view public.coach_directory as
select
  id,
  display_name,
  avatar_url,
  role,
  trainer_specialty,
  trainer_bio,
  trainer_city,
  trainer_experience_years,
  trainer_certifications,
  trainer_rate_inr,
  trainer_hourly_inr,
  trainer_session_inr,
  trainer_accepting_clients,
  trainer_languages,
  trainer_modes
from public.profiles
where role in ('trainer', 'nutritionist')
  and trainer_specialty is not null
  and trainer_specialty <> '';

grant select on public.coach_directory to anon, authenticated;

-- 2. Coaching requests ------------------------------------------------------
-- A client visits a coach profile and clicks "Request coaching". The coach
-- receives a notification, opens it, and can accept (creates trainer_clients
-- link) or decline. This is the inverse of trainer-initiated invite codes.
create table if not exists public.coaching_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (client_id, coach_id, status)  -- prevent duplicate pending requests
);

create index if not exists coaching_requests_coach_idx
  on public.coaching_requests(coach_id, status);
create index if not exists coaching_requests_client_idx
  on public.coaching_requests(client_id, status);

alter table public.coaching_requests enable row level security;

drop policy if exists "Client can read own requests" on public.coaching_requests;
create policy "Client can read own requests"
  on public.coaching_requests for select
  using (client_id = auth.uid());

drop policy if exists "Coach can read incoming requests" on public.coaching_requests;
create policy "Coach can read incoming requests"
  on public.coaching_requests for select
  using (coach_id = auth.uid());

drop policy if exists "Client can create request" on public.coaching_requests;
create policy "Client can create request"
  on public.coaching_requests for insert
  with check (client_id = auth.uid());

drop policy if exists "Client can cancel own request" on public.coaching_requests;
create policy "Client can cancel own request"
  on public.coaching_requests for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "Coach can respond" on public.coaching_requests;
create policy "Coach can respond"
  on public.coaching_requests for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- 3. Notifications ----------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                  -- 'coach_request', 'coach_accepted', 'client_joined', 'plan_reviewed', etc.
  title text not null,
  body text not null,
  href text,                            -- in-app deep link, e.g. /trainer or /my-trainer
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Read own notifications" on public.notifications;
create policy "Read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Mark own notifications read" on public.notifications;
create policy "Mark own notifications read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts come from server-side (service role) — no client INSERT policy.

-- 4. Daily targets ----------------------------------------------------------
-- Single row per user. Populated when an AI diet plan is activated. The food
-- tab reads target_kcal / target_protein_g to show progress vs. target.
create table if not exists public.daily_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_kcal int,
  target_protein_g int,
  target_carbs_g int,
  target_fat_g int,
  target_water_l numeric(3,1),
  target_steps int,
  source text,                          -- 'ai_plan' | 'manual' | 'coach'
  source_plan_id uuid references public.ai_plans(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.daily_targets enable row level security;

drop policy if exists "Owner can manage targets" on public.daily_targets;
create policy "Owner can manage targets"
  on public.daily_targets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A connected coach can read their client's targets
drop policy if exists "Coach can read client targets" on public.daily_targets;
create policy "Coach can read client targets"
  on public.daily_targets for select
  using (
    user_id in (
      select client_id from public.trainer_clients
      where trainer_id = auth.uid() and status = 'active'
    )
  );

-- 5. Helper RPCs ------------------------------------------------------------
-- Accept a coaching request: marks request accepted + creates link in one tx.
create or replace function public.accept_coaching_request(p_request_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_role text;
begin
  select * into r from public.coaching_requests where id = p_request_id;
  if r is null then
    return json_build_object('ok', false, 'error', 'Request not found');
  end if;
  if r.coach_id <> auth.uid() then
    return json_build_object('ok', false, 'error', 'Not your request');
  end if;
  if r.status <> 'pending' then
    return json_build_object('ok', false, 'error', 'Request is no longer pending');
  end if;

  select role into v_role from public.profiles where id = r.coach_id;

  insert into public.trainer_clients (trainer_id, client_id, status, scope_workouts, scope_diet)
  values (
    r.coach_id,
    r.client_id,
    'active',
    v_role <> 'nutritionist',
    v_role = 'nutritionist'
  )
  on conflict (trainer_id, client_id) do update set status = 'active';

  update public.coaching_requests
    set status = 'accepted', responded_at = now()
    where id = p_request_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.accept_coaching_request(uuid) to authenticated;
