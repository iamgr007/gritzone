-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  GRITZONE — PHASE 2 SCHEMA                                       ║
-- ║  Universal workouts + AI plans + coach review marketplace        ║
-- ║                                                                  ║
-- ║  Run AFTER:                                                      ║
-- ║    1. supabase-schema.sql                                        ║
-- ║    2. supabase-schema-v2.sql                                     ║
-- ║    3. supabase-schema-habits-ebooks.sql                          ║
-- ║    4. supabase-schema-quests-rewards.sql                         ║
-- ║    5. supabase-schema-subscriptions.sql                          ║
-- ║    6. supabase-schema-trainers.sql                               ║
-- ║    7. supabase-schema-nutritionists.sql                          ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────────
-- 1. UNIVERSAL WORKOUT TRACKING — extend workout_sets for non-lifting
-- ────────────────────────────────────────────────────────────────────
-- Existing schema assumes weight × reps × sets. We need to support:
--   • Time-based (yoga hold, plank, run/swim/cycle by time)
--   • Distance-based (run 5km, swim 1000m)
--   • Time + distance (5km run in 25min)
--   • Flow (yoga sequence completed Y/N)
--
-- Strategy: keep weight_kg/reps as-is, ADD nullable duration_seconds and
-- distance_meters columns. The exercise's tracking_mode (in JSON) tells the
-- UI which fields to show. Old rows are unaffected.

alter table public.workout_sets
  add column if not exists duration_seconds integer,
  add column if not exists distance_meters numeric(10,2),
  add column if not exists rpe smallint check (rpe between 1 and 10),  -- bonus: rate of perceived exertion
  add column if not exists notes text;

create index if not exists workout_sets_duration_idx on public.workout_sets(duration_seconds) where duration_seconds is not null;

-- ────────────────────────────────────────────────────────────────────
-- 2. AI PLANS — generated workout & diet plans
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.ai_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,

  plan_type text not null check (plan_type in ('workout', 'diet', 'combined')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'pending_review', 'reviewed', 'archived')),

  -- User inputs that produced this plan
  inputs jsonb not null,
  -- Example for workout:
  --   { goal: 'fat_loss', timeline_weeks: 12, equipment: ['gym'],
  --     days_per_week: 4, session_minutes: 60, injuries: [],
  --     activity_types: ['lifting','cardio'] }
  -- Example for diet:
  --   { goal: 'fat_loss', height_cm: 178, weight_kg: 82, age: 28, sex: 'M',
  --     activity_level: 'moderate', dietary_pref: 'veg', allergies: [...] }

  -- The actual plan as structured JSON (parsed from Gemini)
  plan jsonb not null,
  -- Workout schema:
  --   { weeks: [{ week: 1, sessions: [{ name, day_of_week, exercises: [{
  --       exercise_id, name, tracking_mode, sets, reps, duration_s, distance_m,
  --       rest_s, notes }] }] }] }
  -- Diet schema:
  --   { tdee_kcal, target_kcal, macros: {p, c, f},
  --     days: [{ day, meals: [{ name, items, kcal, p, c, f }] }] }

  -- Provenance
  generated_by text not null default 'gemini-2.0-flash',
  generation_cost_inr numeric(6,2),     -- approximate cost we paid
  prompt_version text,                  -- so we can A/B prompts

  -- If reviewed by a human coach
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,

  -- If linked to a regime (so the user can "start" the plan)
  -- NOTE: no FK — `regimes` table doesn't exist yet (reserved for future use)
  regime_id uuid,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists ai_plans_user_idx on public.ai_plans(user_id);
create index if not exists ai_plans_status_idx on public.ai_plans(status);
create index if not exists ai_plans_reviewed_by_idx on public.ai_plans(reviewed_by);

alter table public.ai_plans enable row level security;

-- Users can read & write their own plans
create policy "Users manage their own AI plans"
  on public.ai_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reviewers (coaches) can read plans assigned to them
create policy "Reviewers can read plans they own"
  on public.ai_plans for select
  using (auth.uid() = reviewed_by);

-- Reviewers can update their assigned plans
create policy "Reviewers can update plans they own"
  on public.ai_plans for update
  using (auth.uid() = reviewed_by);

-- A connected coach can read their active client's plans (consent via trainer_clients)
create policy "Connected coach can view client plans"
  on public.ai_plans for select
  using (
    user_id in (
      select client_id from public.trainer_clients
      where trainer_id = auth.uid() and status = 'active'
    )
  );

-- ────────────────────────────────────────────────────────────────────
-- 3. AI PLAN USAGE LIMITS — prevent abuse
-- ────────────────────────────────────────────────────────────────────
-- Free: 1 plan ever (lifetime)
-- Pro: 30 plans / month
-- Pro Max: 100 plans / month + auto-queue for human review

create table if not exists public.ai_plan_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lifetime_count integer not null default 0,
  month_count integer not null default 0,
  current_month text,                   -- 'YYYY-MM' — reset when month changes
  last_generated_at timestamptz
);

alter table public.ai_plan_usage enable row level security;

create policy "User can read own usage"
  on public.ai_plan_usage for select
  using (auth.uid() = user_id);

-- Writes happen through the server (service-role) only

-- ────────────────────────────────────────────────────────────────────
-- 4. PLAN REVIEW QUEUE — coach marketplace
-- ────────────────────────────────────────────────────────────────────
-- When a Pro Max user generates a plan, it auto-queues here.
-- Coaches see unclaimed jobs, can claim with a 24h SLA.
-- After completion, payout is credited to coach_payouts.

create table if not exists public.plan_reviews (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid not null references public.ai_plans(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,

  status text not null default 'open'
    check (status in ('open', 'claimed', 'completed', 'expired', 'cancelled')),

  -- Coach matching: required role for this review
  required_role text not null check (required_role in ('trainer', 'nutritionist')),

  -- Claim mechanics
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  claim_expires_at timestamptz,         -- coach must complete within 24h of claim

  -- Completion
  completed_at timestamptz,
  -- The reviewed plan (after coach edits) is stored back into ai_plans.plan;
  -- we just track the metadata here

  -- Client feedback
  client_rating smallint check (client_rating between 1 and 5),
  client_feedback text,

  -- Payout
  payout_inr integer not null default 50,
  payout_status text not null default 'pending'
    check (payout_status in ('pending', 'paid', 'cancelled')),
  payout_id uuid,                        -- references coach_payouts(id) once paid

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(plan_id)                        -- one review per plan
);

create index if not exists plan_reviews_status_idx on public.plan_reviews(status);
create index if not exists plan_reviews_required_role_idx on public.plan_reviews(required_role);
create index if not exists plan_reviews_claimed_by_idx on public.plan_reviews(claimed_by);
create index if not exists plan_reviews_client_idx on public.plan_reviews(client_id);
create index if not exists plan_reviews_open_queue_idx on public.plan_reviews(required_role, status, created_at)
  where status = 'open';

alter table public.plan_reviews enable row level security;

-- Open queue: any coach with the right role can see & claim
create policy "Coaches can read open reviews matching their role"
  on public.plan_reviews for select
  using (
    status = 'open' and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = plan_reviews.required_role
    )
  );

-- Once claimed: only the claiming coach + the client see it
create policy "Claimed reviewer reads their review"
  on public.plan_reviews for select
  using (auth.uid() = claimed_by);

create policy "Client reads their plan review"
  on public.plan_reviews for select
  using (auth.uid() = client_id);

-- Coaches update only what they own (or claim from open)
create policy "Coach can claim or update their review"
  on public.plan_reviews for update
  using (
    auth.uid() = claimed_by
    or (status = 'open' and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = plan_reviews.required_role
    ))
  );

-- Client can rate their completed review
create policy "Client can rate review"
  on public.plan_reviews for update
  using (auth.uid() = client_id);

-- ────────────────────────────────────────────────────────────────────
-- 5. COACH PAYOUT WALLET
-- ────────────────────────────────────────────────────────────────────
-- Tracks earnings per coach. Real disbursement happens off-platform
-- (manual UPI transfer or future PayU split-payout).

create table if not exists public.coach_payouts (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid not null references public.profiles(id) on delete cascade,

  -- A payout is a batch of completed reviews paid out together
  amount_inr integer not null,
  review_count integer not null default 0,

  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'cancelled')),

  -- Payment details (collected from coach via separate form)
  upi_id text,
  bank_account text,
  ifsc text,
  pan text,

  paid_at timestamptz,
  payment_reference text,                -- UPI txn id or bank reference

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists coach_payouts_coach_idx on public.coach_payouts(coach_id);
create index if not exists coach_payouts_status_idx on public.coach_payouts(status);

alter table public.coach_payouts enable row level security;

create policy "Coach reads own payouts"
  on public.coach_payouts for select
  using (auth.uid() = coach_id);

-- Writes happen through the server (service-role) only

-- ────────────────────────────────────────────────────────────────────
-- 6. CURATED PLAN MARKETPLACE (Phase 3 — schema only, UI later)
-- ────────────────────────────────────────────────────────────────────
-- A coach (or admin) can take a reviewed plan and publish it as a
-- one-time-purchase product in the marketplace. Clients buy without
-- ongoing coaching.

create table if not exists public.curated_plans (
  id uuid default gen_random_uuid() primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  source_plan_id uuid references public.ai_plans(id) on delete set null,

  title text not null,
  description text,
  cover_image_url text,
  plan_type text not null check (plan_type in ('workout', 'diet', 'combined')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_weeks integer,
  goal text,
  equipment_needed text[],

  price_inr integer not null,
  -- Author keeps `(100 - platform_cut_pct)%`. Default 70/30 split.
  platform_cut_pct integer not null default 30,

  plan jsonb not null,                   -- the full plan content

  is_published boolean not null default false,
  purchases_count integer not null default 0,
  avg_rating numeric(3,2),

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists curated_plans_published_idx on public.curated_plans(is_published, plan_type);
create index if not exists curated_plans_author_idx on public.curated_plans(author_id);

alter table public.curated_plans enable row level security;

create policy "Anyone reads published plans"
  on public.curated_plans for select
  using (is_published = true);

create policy "Author manages own plans"
  on public.curated_plans for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ────────────────────────────────────────────────────────────────────
-- 7. PURCHASES of curated plans (Phase 3)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.curated_plan_purchases (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.curated_plans(id) on delete restrict,
  amount_paid_inr integer not null,
  author_share_inr integer not null,
  platform_share_inr integer not null,
  payu_txn_id text,
  rating smallint check (rating between 1 and 5),
  review text,
  created_at timestamptz default now() not null,
  unique(buyer_id, plan_id)              -- prevent duplicate purchases
);

create index if not exists cpp_buyer_idx on public.curated_plan_purchases(buyer_id);
create index if not exists cpp_plan_idx on public.curated_plan_purchases(plan_id);

alter table public.curated_plan_purchases enable row level security;

create policy "Buyer reads own purchases"
  on public.curated_plan_purchases for select
  using (auth.uid() = buyer_id);

create policy "Author reads purchases of their plans"
  on public.curated_plan_purchases for select
  using (
    plan_id in (select id from public.curated_plans where author_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────
-- 8. EQUIPMENT IDENTIFICATION HISTORY (Phase 2E — optional)
-- ────────────────────────────────────────────────────────────────────
-- When a Pro Max user snaps a photo of gym equipment and we identify
-- it, we cache the result so they can revisit. Also gives us training
-- data for improving the matcher.

create table if not exists public.equipment_lookups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,                         -- Supabase Storage URL
  identified_name text,
  matched_exercise_id text,               -- wger exercise id (string)
  confidence numeric(3,2),                -- 0–1
  raw_ai_response jsonb,
  user_corrected_to text,                 -- if user told us we were wrong
  created_at timestamptz default now() not null
);

create index if not exists equipment_lookups_user_idx on public.equipment_lookups(user_id);

alter table public.equipment_lookups enable row level security;

create policy "User manages own equipment lookups"
  on public.equipment_lookups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- 9. HELPER: bump usage counter atomically
-- ────────────────────────────────────────────────────────────────────
create or replace function public.bump_ai_plan_usage(p_user_id uuid)
returns table(lifetime_count int, month_count int) as $$
declare
  current_ym text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  insert into public.ai_plan_usage (user_id, lifetime_count, month_count, current_month, last_generated_at)
  values (p_user_id, 1, 1, current_ym, now())
  on conflict (user_id) do update set
    lifetime_count = ai_plan_usage.lifetime_count + 1,
    month_count    = case
      when ai_plan_usage.current_month = current_ym then ai_plan_usage.month_count + 1
      else 1
    end,
    current_month = current_ym,
    last_generated_at = now();

  return query
    select u.lifetime_count, u.month_count
    from public.ai_plan_usage u
    where u.user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────────────
-- 10. HELPER: claim a review atomically (prevent race conditions)
-- ────────────────────────────────────────────────────────────────────
create or replace function public.claim_plan_review(p_review_id uuid)
returns boolean as $$
declare
  rows_affected int;
begin
  update public.plan_reviews
  set status = 'claimed',
      claimed_by = auth.uid(),
      claimed_at = now(),
      claim_expires_at = now() + interval '24 hours',
      updated_at = now()
  where id = p_review_id
    and status = 'open'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = plan_reviews.required_role
    );

  get diagnostics rows_affected = row_count;
  return rows_affected > 0;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────────────
-- 11. HELPER: auto-expire claimed reviews after 24h (run via cron)
-- ────────────────────────────────────────────────────────────────────
create or replace function public.expire_stale_claims()
returns int as $$
declare
  rows_affected int;
begin
  update public.plan_reviews
  set status = 'open',
      claimed_by = null,
      claimed_at = null,
      claim_expires_at = null,
      updated_at = now()
  where status = 'claimed'
    and claim_expires_at < now();

  get diagnostics rows_affected = row_count;
  return rows_affected;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────────────
-- DONE. To verify, run:
--   select count(*) from public.ai_plans;
--   select count(*) from public.plan_reviews;
--   select count(*) from public.curated_plans;
-- ────────────────────────────────────────────────────────────────────
