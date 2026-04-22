-- GRITZONE — Habits, Ebooks, Ranks additions
-- Run in Supabase SQL Editor. Safe to re-run.

-- ============================================================
-- WORKOUT SETS: add set_type column (optional, non-breaking)
-- ============================================================
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS set_type text DEFAULT 'normal';
-- 'normal' | 'warmup' | 'drop' | 'failure' | 'amrap'

-- ============================================================
-- HABITS: user-defined daily habits
-- ============================================================
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,                       -- "Drink 3L water"
  icon text DEFAULT '✅',
  color text DEFAULT 'amber',               -- tailwind hue
  target_days text[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  reminder_time time,                       -- optional HH:MM for push
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, active);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own habits" ON habits;
CREATE POLICY "Users manage own habits" ON habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Daily completions
CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES habits(id) ON DELETE CASCADE,
  date date NOT NULL,
  done boolean DEFAULT true,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date DESC);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own habit logs" ON habit_logs;
CREATE POLICY "Users manage own habit logs" ON habit_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- EBOOKS: free guides unlocked by tier/level
-- ============================================================
CREATE TABLE IF NOT EXISTS ebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  cover_emoji text DEFAULT '📘',
  cover_gradient text DEFAULT 'from-amber-500 to-orange-500',
  category text,                            -- 'fatloss' | 'muscle' | 'beginner' | 'nutrition'
  difficulty text,                          -- 'beginner' | 'intermediate' | 'advanced'
  pages integer,
  pdf_url text,                             -- null = coming soon
  min_tier text DEFAULT 'free',             -- 'free' | 'pro' | 'pro_max'
  required_level integer DEFAULT 1,
  highlights text[],                        -- bullet points
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ebooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active ebooks" ON ebooks;
CREATE POLICY "Anyone can view active ebooks" ON ebooks FOR SELECT USING (active = true);

-- Downloads / reads log (so we know what's popular)
CREATE TABLE IF NOT EXISTS ebook_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id uuid REFERENCES ebooks(id) ON DELETE CASCADE,
  downloaded_at timestamptz DEFAULT now()
);
ALTER TABLE ebook_downloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users log own ebook downloads" ON ebook_downloads;
CREATE POLICY "Users log own ebook downloads" ON ebook_downloads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED: Ebook library (placeholders — upload PDFs later)
-- ============================================================
INSERT INTO ebooks (slug, title, subtitle, description, cover_emoji, cover_gradient, category, difficulty, pages, highlights, sort_order) VALUES
  ('transform', 'TRANSFORM', '8-Week Body Recomposition Guide',
    'The blueprint to lose fat and build muscle at the same time. Indian diet-friendly, no supplements required.',
    '🔥', 'from-orange-500 to-red-600', 'fatloss', 'intermediate', 48,
    ARRAY['Macros calculator for Indian foods','8-week workout split','Cheat meal strategy','Plateau breaker protocols'],
    1),
  ('reset', 'RESET', 'The 21-Day Beginner''s Kickstart',
    'Never lifted weights? Start here. Zero jargon, full routines, grocery lists included.',
    '🌱', 'from-emerald-500 to-teal-600', 'beginner', 'beginner', 32,
    ARRAY['Gym etiquette 101','Home workout alternatives','Beginner macros (₹500/week diet)','Habit stack framework'],
    2),
  ('fuel', 'FUEL', 'Nutrition Made Simple',
    'The complete Indian nutrition handbook — 100+ foods, portion photos, restaurant hacks, protein tables.',
    '🍛', 'from-amber-500 to-yellow-600', 'nutrition', 'beginner', 56,
    ARRAY['100+ Indian food macros','Dal/roti portion guide','Cheap protein sources','Hostel-friendly meal prep'],
    3),
  ('ignite', 'IGNITE', 'Fat Loss Without Cardio',
    'The calorie math, NEAT tricks and HIIT protocols that actually work. No 2-hour treadmill sessions.',
    '⚡️', 'from-rose-500 to-pink-600', 'fatloss', 'intermediate', 40,
    ARRAY['TDEE formula for Indians','10k steps vs cardio debunked','HIIT in 15 min','Cutting without losing muscle'],
    4),
  ('forge', 'FORGE', 'The Muscle-Building Bible',
    'Hypertrophy science for the natural lifter. Mechanical tension, progressive overload, and volume landmarks.',
    '⚒️', 'from-blue-500 to-indigo-600', 'muscle', 'advanced', 64,
    ARRAY['Weekly volume by muscle','Exercise selection logic','Deload timing','Lagging body part fixes'],
    5),
  ('zen', 'ZEN', 'Recovery & Sleep Protocol',
    'Muscles grow in the kitchen — and the bedroom. Optimize sleep, stress, and mobility.',
    '🧘', 'from-purple-500 to-indigo-600', 'recovery', 'beginner', 28,
    ARRAY['Sleep hygiene checklist','Mobility routine (10 min)','Stress → cortisol → fat','Mindful rest days'],
    6),
  ('alpha', 'ALPHA', 'Advanced Programming (Pro)',
    'Block periodization, RPE, tapering — for the lifter who''s ready to treat training like science.',
    '👑', 'from-amber-400 to-yellow-300', 'muscle', 'advanced', 72,
    ARRAY['Linear vs DUP','RPE-based autoregulation','Competition peaking','Off-season mass protocols'],
    7)
ON CONFLICT (slug) DO NOTHING;

-- Lock ALPHA behind Pro
UPDATE ebooks SET min_tier = 'pro' WHERE slug = 'alpha';

-- ============================================================
-- CACHED RANKS: denormalized leaderboard snapshot
-- ============================================================
-- We compute rank from earned XP. A simple materialized-ish view isn't
-- necessary; the leaderboard page will query live with limits.
-- Add an index to speed sorting.
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
