-- Adds subscription tier tracking for Razorpay integration.
-- Run this in Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

-- Optional: index for querying active pro users
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);

-- Payment history for audit + support
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id text,
  razorpay_payment_id text UNIQUE,
  plan text,
  amount integer, -- in paise
  currency text DEFAULT 'INR',
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only service_role (server) inserts — clients never write directly
