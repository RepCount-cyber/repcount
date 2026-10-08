-- NEON ONLY: UNAPPLIED draft for a NEW development database.
-- Requires Neon Data API authenticated/anonymous roles and auth.user_id().
-- No broad auto-grants. No intake endpoint, admin UI or auth integration yet.
begin;
create schema repcount_private;
revoke all on schema repcount_private from public, anonymous, authenticated;
create table repcount_private.enrolment_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 32),
  payment_reference text check (char_length(payment_reference) <= 100),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'declined')),
  created_at timestamptz not null default now()
);
alter table repcount_private.enrolment_requests enable row level security;
revoke all on repcount_private.enrolment_requests from public, anonymous, authenticated;
-- No browser access; validated/rate-limited server intake required.
create table public.repcount_profiles (
  user_id text primary key check (char_length(user_id) > 0),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  created_at timestamptz not null default now()
);
alter table public.repcount_profiles enable row level security;
revoke all on public.repcount_profiles from public, anonymous, authenticated;
grant usage on schema public to authenticated;
grant select on public.repcount_profiles to authenticated;
create policy clients_read_own_profile on public.repcount_profiles
  for select to authenticated using ((select auth.user_id()) = user_id);
create table public.repcount_memberships (
  user_id text primary key references public.repcount_profiles(user_id) on delete cascade,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'paused', 'expired')),
  starts_on date,
  ends_on date,
  payment_verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  check (status <> 'active' or
    (payment_verified_at is not null and starts_on is not null and ends_on is not null))
);
alter table public.repcount_memberships enable row level security;
revoke all on public.repcount_memberships from public, anonymous, authenticated;
grant select on public.repcount_memberships to authenticated;
create policy clients_read_own_membership on public.repcount_memberships
  for select to authenticated using ((select auth.user_id()) = user_id);
-- No client writes. Provision least-privilege server roles separately.
-- Trusted provisioning must verify Auth IDs and handle account deletion cleanup.
-- Do not write managed neon_auth tables. No assumed managed-schema foreign key.
-- Future paid programme policies must check active status AND paid-period dates.
-- Test via client JWTs: database owners bypass RLS.
commit;
