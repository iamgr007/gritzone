-- GRITZONE Quests & Rewards Schema
-- Run in Supabase SQL Editor. Safe to re-run.

-- ============================================================
-- QUESTS: weekly/daily challenges users opt into
-- ============================================================

CREATE TABLE IF NOT EXISTS quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_key text NOT NULL,                 -- matches QUEST_LIBRARY key in /lib/quests.ts
  period_start date NOT NULL,              -- Monday of the week (or date for daily)
  progress integer DEFAULT 0,              -- e.g. 3 of 5 workouts done
  target integer NOT NULL,                 -- e.g. 5 workouts
  completed_at timestamptz,                -- when target was hit
  xp_claimed boolean DEFAULT false,        -- user has claimed the XP
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, quest_key, period_start)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id, period_start DESC);

ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own quest progress" ON quest_progress;
CREATE POLICY "Users manage own quest progress" ON quest_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REWARDS & BRAND PARTNERSHIPS
-- ============================================================

-- Partner brands (protein, apparel, supplements)
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,               -- 'myprotein', 'muscleblaze', 'boult'
  name text NOT NULL,
  logo_url text,
  category text,                           -- 'protein', 'apparel', 'supplements', 'gear'
  website text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Reward offers (unlockable by badge, level, quest completion)
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  title text NOT NULL,                     -- '15% off MyProtein Impact Whey'
  description text,
  discount_percent integer,
  discount_flat integer,                   -- flat amount off in paise
  promo_code text NOT NULL,                -- 'GRITZONE15'
  min_tier text DEFAULT 'free',            -- 'free' | 'pro' | 'pro_max'
  required_badge text,                     -- e.g. 'century_club' (null = no badge req)
  required_level integer DEFAULT 1,        -- min user level
  required_quest text,                     -- quest_key that must be completed
  max_redemptions_total integer,           -- null = unlimited
  max_redemptions_per_user integer DEFAULT 1,
  valid_until timestamptz,
  terms text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(active, valid_until);

-- Redemption log — who claimed what
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE,
  promo_code text,
  redeemed_at timestamptz DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active partners" ON partners;
CREATE POLICY "Anyone can view active partners" ON partners FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Anyone can view active rewards" ON rewards;
CREATE POLICY "Anyone can view active rewards" ON rewards FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Users view own redemptions" ON reward_redemptions;
CREATE POLICY "Users view own redemptions" ON reward_redemptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own redemptions" ON reward_redemptions;
CREATE POLICY "Users insert own redemptions" ON reward_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PUSH NOTIFICATION TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text,                           -- 'ios' | 'android' | 'web'
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push tokens" ON push_tokens;
CREATE POLICY "Users manage own push tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED DATA: Demo partners & rewards (remove in production)
-- ============================================================
INSERT INTO partners (slug, name, category, website, logo_url) VALUES
  ('myprotein_in', 'MyProtein India', 'protein', 'https://www.myprotein.co.in', '/brands/myprotein.png'),
  ('muscleblaze', 'MuscleBlaze', 'supplements', 'https://www.muscleblaze.com', '/brands/muscleblaze.png'),
  ('boult', 'Boult Audio', 'gear', 'https://www.boultaudio.com', '/brands/boult.png'),
  ('decathlon', 'Decathlon', 'apparel', 'https://www.decathlon.in', '/brands/decathlon.png'),
  ('gritzone_store', 'GRITZONE Store', 'apparel', 'https://gritzone.me/store', '/brands/gritzone.png')
ON CONFLICT (slug) DO NOTHING;

-- Rewards unlocked by different triggers
INSERT INTO rewards (partner_id, title, description, discount_percent, promo_code, min_tier, required_badge, required_level, terms) VALUES
  (
    (SELECT id FROM partners WHERE slug = 'myprotein_in'),
    '15% off Impact Whey Protein',
    'Unlock when you earn the Century Club badge (100 workouts)',
    15, 'GRIT15', 'free', 'century_club', 1,
    'Valid on orders above ₹1,500. One-time use per account.'
  ),
  (
    (SELECT id FROM partners WHERE slug = 'muscleblaze'),
    '20% off all Creatine Monohydrate',
    'For users who hit Level 5 (Dedicated)',
    20, 'GRITBEAST20', 'free', null, 5,
    'Valid until 31 Dec 2026. Stackable with bank offers.'
  ),
  (
    (SELECT id FROM partners WHERE slug = 'decathlon'),
    '₹500 off Training Apparel',
    'Complete the 30-day workout quest to unlock',
    null, 'GRITFIT500', 'pro', null, 1,
    'Min order ₹2,000. Domyos brand only.'
  ),
  (
    (SELECT id FROM partners WHERE slug = 'boult'),
    '₹700 off Wireless Earbuds',
    'Pro Max users only — premium partner offer',
    null, 'GRITSOUND700', 'pro_max', null, 1,
    'Select Z40/W40 models. Valid 3 months.'
  ),
  (
    (SELECT id FROM partners WHERE slug = 'gritzone_store'),
    'Free GRITZONE T-Shirt',
    'Reach Level 10 (Unstoppable) to claim',
    null, 'GRITSHIRT', 'free', null, 10,
    '₹99 shipping applies. 1 per account.'
  )
ON CONFLICT DO NOTHING;

UPDATE rewards SET discount_flat = 50000 WHERE promo_code = 'GRITFIT500';
UPDATE rewards SET discount_flat = 70000 WHERE promo_code = 'GRITSOUND700';
