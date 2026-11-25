-- ============================================================================
-- RS Creator 1.0 — Seed data
-- File: supabase/migrations/0002_seed.sql
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
-- No secrets in this file.
-- ============================================================================

-- --- Subscription plans ----------------------------------------------------
insert into public.subscription_plans
  (name, slug, price, currency, duration_days, features, daily_ai_limit, monthly_ai_limit, is_active)
values
  ('Free', 'free', 0.00, 'USD', null,
   '["10 AI generations/day", "Basic X post evaluation", "Manual approval required"]'::jsonb,
   10, 100, true),
  ('Basic', 'basic', 9.00, 'USD', 30,
   '["50 AI generations/day", "Post evaluation + replies", "Link queue", "Monitor up to 5 accounts"]'::jsonb,
   50, 500, true),
  ('Pro', 'pro', 19.00, 'USD', 30,
   '["200 AI generations/day", "Full AI assistant", "Link queue + monitored accounts", "Priority processing", "BYOK support"]'::jsonb,
   200, 2000, true),
  ('Premium', 'premium', 39.00, 'USD', 30,
   '["500 AI generations/day", "Everything in Pro", "Highest priority processing", "Advanced analytics"]'::jsonb,
   500, 5000, true),
  ('Lifetime', 'lifetime', 199.00, 'USD', null,
   '["1000 AI generations/day", "Everything in Premium", "Lifetime access", "No expiry"]'::jsonb,
   1000, 10000, true)
on conflict (slug) do nothing;

-- --- System settings -------------------------------------------------------
insert into public.system_settings (key, value) values
  ('product_name', '"RS Creator"'::jsonb),
  ('default_ai_provider', '"groq"'::jsonb),
  ('default_groq_model', '"openai/gpt-oss-20b"'::jsonb),
  ('default_openrouter_model', '""'::jsonb),
  ('daily_like_limit', '60'::jsonb),
  ('daily_reply_limit', '35'::jsonb),
  ('manual_approval_default', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('registration_enabled', 'true'::jsonb)
on conflict (key) do nothing;
