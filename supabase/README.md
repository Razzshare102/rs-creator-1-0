# RS Creator 1.0 — Supabase Backend

AI-powered X (Twitter) Creator Assistant. This folder is the entire
Supabase backend: schema + RLS, seed data, owner provisioning, and three
Edge Functions. No live Supabase project exists yet — nothing here has
been run against a real project.

> **Owner / Super Admin: razzshares@gmail.com**
> That email is the sole owner. Do NOT use any other email as owner —
> in particular, do NOT use robiulrazz67@gmail.com.

## Layout

```
supabase/
├── config.toml                  # Supabase CLI config (functions listed)
├── README.md                    # this file
├── seed_owner.sql               # owner provisioning (run once, after signup)
├── migrations/
│   ├── 0001_init.sql            # all 16 tables + RLS + triggers
│   └── 0002_seed.sql            # plans + system settings
└── functions/
    ├── verify-license/index.ts  # POST {license_key, user_id}
    ├── ai-generate/index.ts     # POST {prompt, provider, model, style, user_id}
    └── ai-evaluate/index.ts     # POST {post_text, user_id}
```

### Tables (16)

`profiles`, `user_roles`, `licenses`, `subscriptions`,
`subscription_plans`, `user_devices`, `usage_logs`, `activity_logs`,
`admin_audit_logs`, `system_settings`, `feature_permissions`,
`ai_configurations`, `processed_posts`, `content_history`,
`link_queue`, `monitored_accounts`.

RLS is enabled on every table and is authoritative — client-side checks
are never trusted. Authenticated users can only touch their own rows
(`user_id = auth.uid()`, or `id = auth.uid()` for `profiles`).
`user_roles` is read-only for the user (SELECT own row only; roles are
assigned server-side). The owner (`public.is_owner()`, a SECURITY
DEFINER function checking `user_roles.is_owner`) can SELECT all rows on
the admin-visible tables. `admin_audit_logs` is append-only via RLS:
INSERT allowed, no UPDATE/DELETE policy for anyone — only the
service role (which bypasses RLS) could ever change audit rows.

## 1. Run migrations

Option A — Supabase CLI (once a project exists and is linked):

```bash
cd rs-creator-1.0
supabase link --project-ref <your-project-ref>
supabase db push
```

Option B — SQL Editor (Dashboard > SQL Editor > New query):
paste `migrations/0001_init.sql`, run it, then paste
`migrations/0002_seed.sql` and run it. Run them in order.

Verify afterwards:

```sql
select count(*) from pg_tables where schemaname = 'public';
-- expect 16 project tables (plus Supabase-managed ones in other schemas)
select tablename from pg_tables where schemaname = 'public' order by 1;
select key, value from public.system_settings order by key;
select slug, price, daily_ai_limit, monthly_ai_limit
  from public.subscription_plans order by price;
```

## 2. Deploy Edge Functions

```bash
supabase functions deploy verify-license
supabase functions deploy ai-generate
supabase functions deploy ai-evaluate
```

`verify-license` runs with `verify_jwt = false` (it is called before a
user has a session, with a license key + user id). `ai-generate` and
`ai-evaluate` run with `verify_jwt = true` and additionally verify the
Bearer JWT in code via `auth.getUser()`.

## 3. Required secrets

Set in Dashboard > Edge Functions > Secrets (or `supabase secrets set ...`).
Never commit these, never paste them in chat, never ship them in client code.

| Secret | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | all functions | Project URL |
| `SUPABASE_ANON_KEY` | ai-generate, ai-evaluate | Verifies caller JWTs |
| `SUPABASE_SERVICE_ROLE_KEY` | all functions | Bypasses RLS — server-side only |
| `GROQ_API_KEY` | ai-generate, ai-evaluate | Admin-managed fallback for Groq |
| `OPENROUTER_API_KEY` | ai-generate, ai-evaluate | Admin-managed fallback for OpenRouter |

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... \
  SUPABASE_SERVICE_ROLE_KEY=... GROQ_API_KEY=... OPENROUTER_API_KEY=...
```

If no BYOK key (`ai_configurations`) and no admin-managed key exist,
`ai-generate` / `ai-evaluate` return HTTP 402 `{"error": "no AI key configured"}`.

## 4. Owner provisioning

Owner email: **razzshares@gmail.com** (sole owner / Super Admin).

1. The owner registers FIRST via Supabase Auth with
   `razzshares@gmail.com` — sign up in the app, or create the user in
   Dashboard > Authentication > Users. No password is stored anywhere
   in this repo; the owner sets it in Auth.
2. Run `seed_owner.sql` in the SQL Editor. It looks the user up by
   email (no hardcoded UID), creates the `profiles` row if missing,
   demotes any other `is_owner` rows, and upserts
   `user_roles` with `role = 'owner'`, `is_owner = true`.
   If the email is not found it raises an error and changes nothing —
   register first, then re-run.
3. (Optional) Create an owner license using the commented template in
   section (b) of `seed_owner.sql` — fill in a fresh key, run after
   step 2.
4. Verify with the queries in section (c) of `seed_owner.sql`:
   exactly one row should have `is_owner = true`, for
   `razzshares@gmail.com`.

## 5. Seed data (migration 0002)

Plans: Free ($0, 10/day, 100/mo), Basic ($9, 50/day, 500/mo),
Pro ($19, 200/day, 2000/mo), Premium ($39, 500/day, 5000/mo),
Lifetime ($199, no expiry, 1000/day, 10000/mo).

System settings: `product_name` "RS Creator",
`default_ai_provider` "groq",
`default_groq_model` "openai/gpt-oss-20b",
`default_openrouter_model` "" (empty),
`daily_like_limit` 60, `daily_reply_limit` 35,
`manual_approval_default` true, `maintenance_mode` false,
`registration_enabled` true. All seeds use `ON CONFLICT DO NOTHING`.

## 6. Function contracts

### `verify-license` — POST

```json
{ "license_key": "RS-...", "user_id": "<uuid>" }
```

- 200 `{ "valid": true, "plan": { "id", "name", "slug", "daily_ai_limit", "monthly_ai_limit" }, "expires_at": "..." | null }`
- 404 license not found; 403 revoked / suspended / expired / assigned
  to another user; 400 missing fields; 500 server error.
- An `unused` license is activated on success (assigned to the user,
  status `active`, `expires_at` set from the plan's `duration_days`
  unless lifetime). Writes `admin_audit_logs` + `activity_logs`.

### `ai-generate` — POST (Bearer JWT required)

```json
{ "prompt": "...", "provider": "groq", "model": "openai/gpt-oss-20b", "style": "...", "user_id": "<uuid>" }
```

- 200 `{ "text", "provider", "model", "usage": { "input_tokens", "output_tokens", "total_tokens" } }`
- 401 bad/missing JWT; 402 no AI key configured; 429 daily quota
  reached; 502 provider error. Logs to `usage_logs` + `content_history`.

### `ai-evaluate` — POST (Bearer JWT required)

```json
{ "post_text": "...", "user_id": "<uuid>" }
```

- 200 `{ "quality_score", "relevance_score", "sentiment", "topic", "spam_score", "recommendation": "reply"|"like"|"skip", "explanation", "provider", "model", "usage": {...} }`
- Same 401 / 402 / 429 / 502 handling as `ai-generate`. Logs to `usage_logs`.

## Security notes

- The service-role key bypasses RLS. Keep it in Edge Function secrets only.
- API keys are never logged by the functions and never appear in this repo.
- `ai_configurations.api_key_encrypted` is treated as the stored key
  value by the functions; real at-rest encryption/decryption belongs in
  a dedicated secrets layer.
- This project is separate from `~/workspace/rs-creator/` (an existing
  Telegram bot project). No keys were read or copied from it.
