-- GRITZONE — Add nutritionist role (Phase 1.5)
-- Run AFTER supabase-schema-trainers.sql

-- Allow 'nutritionist' as a third role
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('client', 'trainer', 'nutritionist'));

-- (No new columns needed — nutritionists reuse trainer_* profile fields:
--  trainer_bio → bio shown to clients
--  trainer_specialty → "Sports nutrition", "Weight loss", "PCOS", etc.
--  trainer_experience_years, trainer_city, trainer_rate_inr, trainer_certifications
--  This keeps the schema simple and lets coaches who do both register once.)
