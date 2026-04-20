# MaxPro - Daily Health & Fitness Tracker

A mobile-first web app for daily health tracking: weight, meals, workouts, steps, water, sleep.

## Setup

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
4. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key

### 2. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.local.example .env.local
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
```bash
npx vercel
```
Add the same environment variables in Vercel project settings.

## Tech Stack
- Next.js 15 (App Router)
- Supabase (Auth + PostgreSQL)
- Tailwind CSS
- TypeScript
