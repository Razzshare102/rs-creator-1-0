-- ============================================================================
-- RS Creator 1.0 — Owner provisioning
-- File: supabase/seed_owner.sql
--
-- OWNER EMAIL: razzshares@gmail.com  (sole owner / Super Admin)
--
-- HOW TO USE (run in the Supabase SQL Editor, as a Postgres superuser /
-- project owner — NOT from the client app):
--
--   Step 1 — The owner registers FIRST via Supabase Auth with the email
--            razzshares@gmail.com (sign-up in the app, or create the user
--            in Dashboard > Authentication > Users). There is NO password
--            in this file and none should ever be added here.
--            A row for the user must exist in auth.users (and in
--            public.profiles, id = auth.users.id) before Step 2.
--
--   Step 2 — Run the promotion SQL in section (a) below. It looks the
--            user up BY EMAIL (no hardcoded UID), then upserts a
--            user_roles row with role = 'owner' and is_owner = true.
--            If the email is not found, it raises an exception and
--            changes nothing — register first, then re-run.
--
--   Step 3 — (Optional) Create an owner license — see the commented
--            template in section (b). Fill in a real license key and
--            run it only after Step 2 succeeds.
--
--   Step 4 — Verify with the queries in section (c).
--
-- Do NOT use any other email as owner. In particular, do NOT use
-- robiulrazz67@gmail.com — that address is not the owner.
-- No passwords and no service-role keys appear in this file.
-- ============================================================================

-- (a) Promote razzshares@gmail.com to sole owner / Super Admin --------------
-- Looks up the UID by email from auth.users, then upserts the role.
-- Safe to re-run (idempotent): ON CONFLICT (user_id) DO UPDATE.
do $$
declare
  v_owner_id uuid;
  v_owner_email text := 'razzshares@gmail.com';
begin
  select id into v_owner_id
  from auth.users
  where lower(email) = lower(v_owner_email);

  if v_owner_id is null then
    raise exception 'Owner user not found in auth.users for email %. Register via Supabase Auth first, then re-run this script.', v_owner_email;
  end if;

  -- profiles row must exist (id = auth.users.id); create it if the
  -- app's signup trigger has not created it yet.
  insert into public.profiles (id, email, status)
  values (v_owner_id, v_owner_email, 'active')
  on conflict (id) do update
    set email = excluded.email,
        status = 'active';

  -- Sole owner: promote this user, and make sure nobody else holds
  -- is_owner = true. (If another owner row ever appears by mistake,
  -- this demotes it; the owner account itself is untouched.)
  update public.user_roles
     set is_owner = false, role = 'admin'
   where is_owner = true
     and user_id <> v_owner_id;

  insert into public.user_roles (user_id, role, is_owner)
  values (v_owner_id, 'owner', true)
  on conflict (user_id) do update
    set role = 'owner',
        is_owner = true,
        updated_at = now();

  raise notice 'Owner provisioned: % (id %)', v_owner_email, v_owner_id;
end $$;

-- (b) Owner license — COMMENTED TEMPLATE ------------------------------------
-- Uncomment and fill in ONLY after Step 2 succeeds. Generate a fresh,
-- random license key (do not reuse a key from anywhere else) and pick
-- the plan (e.g. 'lifetime'). This creates an active lifetime license
-- for the owner and links it to their profile.
--
-- do $$
-- declare
--   v_owner_id uuid;
--   v_plan_id uuid;
--   v_license_id uuid;
-- begin
--   select id into v_owner_id from auth.users
--     where lower(email) = lower('razzshares@gmail.com');
--   if v_owner_id is null then
--     raise exception 'Owner user not found — register first.';
--   end if;
--
--   select id into v_plan_id from public.subscription_plans
--     where slug = 'lifetime';
--   if v_plan_id is null then
--     raise exception 'Lifetime plan not found — run migration 0002_seed.sql first.';
--   end if;
--
--   insert into public.licenses (key, plan_id, user_id, type, status, expires_at, device_limit)
--   values ('RS-OWNER-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
--           v_plan_id, v_owner_id, 'lifetime', 'active', null, 5)
--   returning id into v_license_id;
--
--   update public.profiles
--      set license_key_id = v_license_id, plan_id = v_plan_id, status = 'active'
--    where id = v_owner_id;
--
--   insert into public.subscriptions (user_id, plan_id, license_id, status, started_at)
--   values (v_owner_id, v_plan_id, v_license_id, 'active', now());
--
--   raise notice 'Owner license created: %', v_license_id;
-- end $$;

-- (c) Verification queries --------------------------------------------------
-- select u.id, u.email, r.role, r.is_owner
-- from auth.users u
-- join public.user_roles r on r.user_id = u.id
-- where lower(u.email) = lower('razzshares@gmail.com');
--
-- select count(*) as owner_count from public.user_roles where is_owner = true;
--   -- expect exactly 1
--
-- select p.id, p.email, p.status, p.plan_id, p.license_key_id
-- from public.profiles p
-- where lower(p.email) = lower('razzshares@gmail.com');
