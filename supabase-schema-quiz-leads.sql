-- Quiz leads — marketing funnel from /quiz public page.
-- Captures email + quiz data + computed recommendations for follow-up.

create table if not exists public.quiz_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,

  -- Full quiz payload + computed recommendations (jsonb for flexibility)
  quiz_data jsonb not null,
  recommendations jsonb,

  -- Denormalized fields for cheap querying / segmentation
  body_type text,
  fitness_age int,
  metabolism_label text,
  goal text,

  -- Attribution
  ip text,
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- Conversion tracking
  converted_user_id uuid references auth.users(id) on delete set null,
  converted_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists quiz_leads_email_idx on public.quiz_leads (email);
create index if not exists quiz_leads_created_at_idx on public.quiz_leads (created_at desc);
create index if not exists quiz_leads_body_type_idx on public.quiz_leads (body_type);
create index if not exists quiz_leads_goal_idx on public.quiz_leads (goal);

-- RLS: only service role can read/write. Public API uses service role.
alter table public.quiz_leads enable row level security;

-- No public select / insert / update — everything routed through API.
-- (Service role bypasses RLS automatically.)

-- Helper view for marketing dashboard
create or replace view public.quiz_leads_summary as
select
  date_trunc('day', created_at) as day,
  count(*) as total_leads,
  count(distinct email) as unique_emails,
  count(*) filter (where converted_user_id is not null) as conversions,
  body_type,
  goal
from public.quiz_leads
group by 1, body_type, goal
order by 1 desc;

grant select on public.quiz_leads_summary to authenticated;
