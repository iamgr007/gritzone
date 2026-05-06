-- GRITZONE — Trainer/Client roles (Phase 1)
-- Run after the existing schemas.

-- 1. Role + trainer profile fields
alter table public.profiles
  add column if not exists role text not null default 'client'
    check (role in ('client', 'trainer')),
  add column if not exists trainer_bio text,
  add column if not exists trainer_specialty text,    -- "Strength", "Fat loss", "Powerlifting"...
  add column if not exists trainer_experience_years integer,
  add column if not exists trainer_city text,
  add column if not exists trainer_rate_inr integer,  -- per month, optional
  add column if not exists trainer_certifications text;

create index if not exists profiles_role_idx on public.profiles(role);

-- 2. Trainer ↔ Client relationships (many-to-many)
create table if not exists public.trainer_clients (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('pending', 'active', 'ended')),
  -- What scopes the trainer manages for this client
  scope_workouts boolean not null default true,
  scope_diet boolean not null default true,
  notes text,                                          -- trainer's private notes
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  unique(trainer_id, client_id)
);

create index if not exists trainer_clients_trainer_idx on public.trainer_clients(trainer_id);
create index if not exists trainer_clients_client_idx on public.trainer_clients(client_id);
create index if not exists trainer_clients_status_idx on public.trainer_clients(status);

-- 3. Invite codes — trainer generates, client redeems
create table if not exists public.trainer_invites (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,                           -- e.g. "GZ-7K3M9X"
  -- Optional: pre-target a specific email so only that person can redeem
  target_email text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  redeemed_by uuid references public.profiles(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists trainer_invites_code_idx on public.trainer_invites(code);
create index if not exists trainer_invites_trainer_idx on public.trainer_invites(trainer_id);

-- 4. RLS
alter table public.trainer_clients enable row level security;
alter table public.trainer_invites enable row level security;

-- trainer_clients: both parties can read their own row
create policy "Trainer or client can view their relationship"
  on public.trainer_clients for select
  using (auth.uid() = trainer_id or auth.uid() = client_id);

-- Only trainer can insert (when redeeming an invite, we use a service-side path or
-- the policy below — for Phase 1 keep it simple and let either party create).
create policy "Either party can create relationship"
  on public.trainer_clients for insert
  with check (auth.uid() = trainer_id or auth.uid() = client_id);

create policy "Trainer can update their relationship"
  on public.trainer_clients for update
  using (auth.uid() = trainer_id);

create policy "Either party can end the relationship"
  on public.trainer_clients for delete
  using (auth.uid() = trainer_id or auth.uid() = client_id);

-- trainer_invites: trainer manages their own; clients can read by code (for redemption)
create policy "Trainer can view own invites"
  on public.trainer_invites for select
  using (auth.uid() = trainer_id);

create policy "Anyone authenticated can read by code (for redemption)"
  on public.trainer_invites for select
  using (auth.uid() is not null);

create policy "Trainer can create invites"
  on public.trainer_invites for insert
  with check (auth.uid() = trainer_id);

create policy "Trainer can revoke own invites"
  on public.trainer_invites for delete
  using (auth.uid() = trainer_id);

create policy "Authenticated users can mark redeemed"
  on public.trainer_invites for update
  using (auth.uid() is not null and redeemed_by is null);

-- 5. Extend RLS so trainers can read their active clients' data
-- Helper view: a trainer's active client IDs
create or replace view public.my_clients_v as
  select client_id from public.trainer_clients
  where trainer_id = auth.uid() and status = 'active';

-- Trainer can read clients' checkins
drop policy if exists "Trainer can view client checkins" on public.checkins;
create policy "Trainer can view client checkins"
  on public.checkins for select
  using (
    user_id in (
      select client_id from public.trainer_clients
      where trainer_id = auth.uid() and status = 'active' and scope_workouts = true
    )
    or user_id in (
      select client_id from public.trainer_clients
      where trainer_id = auth.uid() and status = 'active' and scope_diet = true
    )
  );

-- 6. Helper: generate a unique invite code (caller should retry if collision)
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'GZ-' || out;
end;
$$;
