-- GRITZONE Subscription Schema (PayU + Razorpay compatible)
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS guards).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text DEFAULT 'payu',            -- 'payu' | 'razorpay' | 'stripe'
  external_order_id text,                  -- txnid (PayU) or order_id (Razorpay)
  external_payment_id text UNIQUE,         -- mihpayid (PayU) or payment_id (Razorpay)
  plan text,
  amount integer,                          -- in paise
  currency text DEFAULT 'INR',
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- If payments table existed from an earlier version, add new columns
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'payu',
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS external_payment_id text;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only service_role (server) inserts — clients never write directly
