-- ============================================================================
-- RS Creator 1.0 — Initial schema
-- File: supabase/migrations/0001_init.sql
--
-- RLS IS AUTHORITATIVE. Row Level Security on every table below is the
-- enforcement layer. Any client-side / app-level permission check is a
-- convenience only and MUST NOT be trusted: a malicious or buggy client
-- can bypass it. All access is gated here, in Postgres, via policies
-- that check auth.uid() and the SECURITY DEFINER helper public.is_owner().
-- The service_role key bypasses RLS by design — it must live ONLY in
-- server-side secrets (Supabase dashboard / Edge Function secrets) and
-- NEVER be shipped in client code, committed to git, or pasted in chat.
-- No real secrets appear in this file.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: public.is_owner() is defined AFTER the tables below (just before
-- the RLS section). It queries public.user_roles, so defining it first
-- fails in Postgres with "relation public.user_roles does not exist"
-- (seen live 2026-11-25 on first run; fixed by reordering, no schema change).

-- ============================================================================
-- Tables
-- Creation order respects FK dependencies. profiles <-> licenses is
-- circular (profiles.license_key_id -> licenses, licenses.user_id ->
-- profiles), so profiles is created first without the license FK and the
-- FK is added afterwards with ALTER TABLE.
-- ============================================================================

-- 1. subscription_plans (no dependencies — created first)
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  duration_days int,
  features jsonb not null default '[]'::jsonb,
  daily_ai_limit int not null default 10,
  monthly_ai_limit int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. profiles (license_key_id FK added after licenses exists)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text,
  display_name text,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','active','suspended','expired','banned')),
  license_key_id uuid, -- FK to public.licenses(id) added below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- 3. user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null default 'user'
    check (role in ('user','admin','owner')),
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. licenses
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  type text check (type in ('monthly','quarterly','yearly','lifetime','custom')),
  status text not null default 'unused'
    check (status in ('unused','active','expired','suspended','revoked')),
  expires_at timestamptz,
  device_limit int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Now resolve the circular FK: profiles.license_key_id -> licenses(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_license_key_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_license_key_id_fkey
      foreign key (license_key_id) references public.licenses(id) on delete set null;
  end if;
end $$;

-- 5. subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  license_id uuid references public.licenses(id) on delete set null,
  status text not null check (status in ('active','expired','cancelled','suspended')),
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. user_devices
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  device_name text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

-- 7. usage_logs
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  total_tokens int not null default 0,
  estimated_cost numeric(10,6) not null default 0,
  endpoint text,
  created_at timestamptz not null default now()
);

-- 8. activity_logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text,
  resource_type text,
  resource_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 9. admin_audit_logs
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid,
  target_resource text,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- 10. system_settings
create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 11. feature_permissions (null user_id = global default)
create table if not exists public.feature_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_key)
);

-- 12. ai_configurations
create table if not exists public.ai_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('groq','openrouter')),
  model text,
  api_key_encrypted text,
  is_admin_managed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- 13. processed_posts
create table if not exists public.processed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id text not null,
  platform text not null default 'x',
  action_taken text,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

-- 14. content_history
create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text,
  prompt text,
  output text,
  provider text,
  model text,
  created_at timestamptz not null default now()
);

-- 15. link_queue
create table if not exists public.link_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  post_id text,
  status text not null default 'pending'
    check (status in ('pending','processing','draft_ready','approved','completed','skipped','failed')),
  draft text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 16. monitored_accounts
create table if not exists public.monitored_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  last_post_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, username)
);

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_profiles_plan_id on public.profiles(plan_id);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_licenses_user_id on public.licenses(user_id);
create index if not exists idx_licenses_plan_id on public.licenses(plan_id);
create index if not exists idx_licenses_status on public.licenses(status);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_user_devices_user_id on public.user_devices(user_id);
create index if not exists idx_usage_logs_user_created on public.usage_logs(user_id, created_at);
create index if not exists idx_activity_logs_user_created on public.activity_logs(user_id, created_at);
create index if not exists idx_admin_audit_logs_admin_created on public.admin_audit_logs(admin_id, created_at);
create index if not exists idx_admin_audit_logs_target_user on public.admin_audit_logs(target_user_id);
create index if not exists idx_feature_permissions_user_id on public.feature_permissions(user_id);
create index if not exists idx_ai_configurations_user_id on public.ai_configurations(user_id);
create index if not exists idx_processed_posts_user_id on public.processed_posts(user_id);
create index if not exists idx_content_history_user_created on public.content_history(user_id, created_at);
create index if not exists idx_link_queue_user_status on public.link_queue(user_id, status);
create index if not exists idx_monitored_accounts_user_id on public.monitored_accounts(user_id);

-- ============================================================================
-- updated_at triggers (only on tables that have updated_at)
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'subscription_plans','profiles','user_roles','licenses','subscriptions',
    'system_settings','feature_permissions','ai_configurations',
    'link_queue','monitored_accounts'
  ] loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I; '
      'create trigger trg_set_updated_at '
      'before update on public.%I '
      'for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helper: owner check (SECURITY DEFINER)
-- Defined here, AFTER user_roles exists. Returns true only when the
-- calling authenticated user has a user_roles row with is_owner = true.
-- Used by owner-only RLS policies below.
-- ---------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_owner = true
  );
$$;

-- ============================================================================
-- Row Level Security — enable on EVERY table
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.licenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_devices enable row level security;
alter table public.usage_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.feature_permissions enable row level security;
alter table public.ai_configurations enable row level security;
alter table public.processed_posts enable row level security;
alter table public.content_history enable row level security;
alter table public.link_queue enable row level security;
alter table public.monitored_accounts enable row level security;

-- ============================================================================
-- RLS policies
-- Pattern: authenticated users may SELECT/INSERT/UPDATE/DELETE only their
-- own rows (user_id = auth.uid(), or id = auth.uid() for profiles).
-- Owner (public.is_owner()) may SELECT all rows on the admin-visible
-- tables. user_roles is read-only for the user themselves: SELECT own row
-- only, NO INSERT/UPDATE/DELETE — roles are assigned server-side only.
-- admin_audit_logs: authenticated users may INSERT (Edge Functions write
-- audit rows via the service role in practice); NO UPDATE/DELETE policy
-- is created for anyone, so audit rows are append-only through RLS.
-- The service_role bypasses RLS entirely and is the only writer that can
-- UPDATE/DELETE audit rows, if ever needed.
-- ============================================================================

-- --- profiles ---
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = auth.uid());
create policy "profiles_select_owner" on public.profiles
  for select to authenticated using (public.is_owner());

-- --- user_roles: SELECT own row only; no INSERT/UPDATE/DELETE via RLS ---
create policy "user_roles_select_own" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- --- licenses ---
create policy "licenses_select_own" on public.licenses
  for select to authenticated using (user_id = auth.uid());
create policy "licenses_insert_own" on public.licenses
  for insert to authenticated with check (user_id = auth.uid());
create policy "licenses_update_own" on public.licenses
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "licenses_delete_own" on public.licenses
  for delete to authenticated using (user_id = auth.uid());
create policy "licenses_select_owner" on public.licenses
  for select to authenticated using (public.is_owner());

-- --- subscriptions ---
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "subscriptions_insert_own" on public.subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "subscriptions_update_own" on public.subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subscriptions_delete_own" on public.subscriptions
  for delete to authenticated using (user_id = auth.uid());
create policy "subscriptions_select_owner" on public.subscriptions
  for select to authenticated using (public.is_owner());

-- --- subscription_plans: readable by all authenticated users; writes owner-only via service role ---
create policy "subscription_plans_select_all" on public.subscription_plans
  for select to authenticated using (true);

-- --- user_devices ---
create policy "user_devices_select_own" on public.user_devices
  for select to authenticated using (user_id = auth.uid());
create policy "user_devices_insert_own" on public.user_devices
  for insert to authenticated with check (user_id = auth.uid());
create policy "user_devices_update_own" on public.user_devices
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_devices_delete_own" on public.user_devices
  for delete to authenticated using (user_id = auth.uid());

-- --- usage_logs ---
create policy "usage_logs_select_own" on public.usage_logs
  for select to authenticated using (user_id = auth.uid());
create policy "usage_logs_insert_own" on public.usage_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "usage_logs_update_own" on public.usage_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "usage_logs_delete_own" on public.usage_logs
  for delete to authenticated using (user_id = auth.uid());
create policy "usage_logs_select_owner" on public.usage_logs
  for select to authenticated using (public.is_owner());

-- --- activity_logs ---
create policy "activity_logs_select_own" on public.activity_logs
  for select to authenticated using (user_id = auth.uid());
create policy "activity_logs_insert_own" on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "activity_logs_update_own" on public.activity_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity_logs_delete_own" on public.activity_logs
  for delete to authenticated using (user_id = auth.uid());
create policy "activity_logs_select_owner" on public.activity_logs
  for select to authenticated using (public.is_owner());

-- --- admin_audit_logs ---
-- Append-only via RLS: INSERT allowed for authenticated users (Edge
-- Functions normally write via service role, which bypasses RLS anyway);
-- deliberately NO UPDATE or DELETE policy for any authenticated role, so
-- audit rows cannot be altered or removed through the client. Only the
-- service role (bypasses RLS) could ever change them.
create policy "admin_audit_logs_select_owner" on public.admin_audit_logs
  for select to authenticated using (public.is_owner());
create policy "admin_audit_logs_insert_auth" on public.admin_audit_logs
  for insert to authenticated with check (true);

-- --- system_settings ---
create policy "system_settings_select_all" on public.system_settings
  for select to authenticated using (true);
create policy "system_settings_select_owner" on public.system_settings
  for select to authenticated using (public.is_owner());
-- Writes to system_settings are owner/service-role only in practice;
-- no INSERT/UPDATE/DELETE policy for ordinary authenticated users.

-- --- feature_permissions ---
create policy "feature_permissions_select_own" on public.feature_permissions
  for select to authenticated using (user_id = auth.uid() or user_id is null);
create policy "feature_permissions_insert_own" on public.feature_permissions
  for insert to authenticated with check (user_id = auth.uid());
create policy "feature_permissions_update_own" on public.feature_permissions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "feature_permissions_delete_own" on public.feature_permissions
  for delete to authenticated using (user_id = auth.uid());

-- --- ai_configurations ---
create policy "ai_configurations_select_own" on public.ai_configurations
  for select to authenticated using (user_id = auth.uid());
create policy "ai_configurations_insert_own" on public.ai_configurations
  for insert to authenticated with check (user_id = auth.uid());
create policy "ai_configurations_update_own" on public.ai_configurations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_configurations_delete_own" on public.ai_configurations
  for delete to authenticated using (user_id = auth.uid());

-- --- processed_posts ---
create policy "processed_posts_select_own" on public.processed_posts
  for select to authenticated using (user_id = auth.uid());
create policy "processed_posts_insert_own" on public.processed_posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "processed_posts_update_own" on public.processed_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "processed_posts_delete_own" on public.processed_posts
  for delete to authenticated using (user_id = auth.uid());

-- --- content_history ---
create policy "content_history_select_own" on public.content_history
  for select to authenticated using (user_id = auth.uid());
create policy "content_history_insert_own" on public.content_history
  for insert to authenticated with check (user_id = auth.uid());
create policy "content_history_update_own" on public.content_history
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "content_history_delete_own" on public.content_history
  for delete to authenticated using (user_id = auth.uid());

-- --- link_queue ---
create policy "link_queue_select_own" on public.link_queue
  for select to authenticated using (user_id = auth.uid());
create policy "link_queue_insert_own" on public.link_queue
  for insert to authenticated with check (user_id = auth.uid());
create policy "link_queue_update_own" on public.link_queue
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "link_queue_delete_own" on public.link_queue
  for delete to authenticated using (user_id = auth.uid());

-- --- monitored_accounts ---
create policy "monitored_accounts_select_own" on public.monitored_accounts
  for select to authenticated using (user_id = auth.uid());
create policy "monitored_accounts_insert_own" on public.monitored_accounts
  for insert to authenticated with check (user_id = auth.uid());
create policy "monitored_accounts_update_own" on public.monitored_accounts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "monitored_accounts_delete_own" on public.monitored_accounts
  for delete to authenticated using (user_id = auth.uid());
