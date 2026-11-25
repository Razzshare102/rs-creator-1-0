# RS Creator 1.0

**AI-Powered X Creator Assistant & Smart Engagement Engine**

- **Product:** RS Creator
- **Owner / sole Super Admin:** Razz — **razzshares@gmail.com**
- **Category:** AI browser extension (Manifest V3) + web admin dashboard + Supabase backend
- **Target platform:** X (Twitter) — Chrome, Brave, Edge, Kiwi, Quetta and compatible Chromium browsers

> This is a **new product**, separate from the existing Telegram bot project in
> `~/workspace/rs-creator/` (which this repo never touches). Do not confuse the two.

## What is built

| Part | Location | Status |
|---|---|---|
| Web dashboard (Vite + React 18 + TypeScript + Tailwind v3) | `web/` | ✅ Builds clean (`tsc -b && vite build`), serves HTTP 200 |
| Supabase backend (16 tables, RLS, seed, 3 Edge Functions) | `supabase/` | ✅ SQL + functions written, **not yet deployed** |
| Browser extension (Manifest V3) | `extension/` | ✅ Manifest valid, all 18 JS files pass `node --check` |

## Structure

```
rs-creator-1.0/
├── .env.example          # Placeholders only — copy to .env, never commit real keys
├── README.md             # This file
├── web/                  # User dashboard + /admin owner dashboard
├── supabase/             # Migrations, seed, owner provisioning, Edge Functions
│   ├── migrations/0001_init.sql   # All 16 tables + RLS (59 policies)
│   ├── migrations/0002_seed.sql   # 5 plans + system settings
│   ├── seed_owner.sql            # Promote razzshares@gmail.com to owner
│   └── functions/                # verify-license, ai-generate, ai-evaluate
└── extension/            # Manifest V3: popup, background, content script, 14 modules
```

## Features

**User dashboard** (`/dashboard`): Overview, AI Reply Generator (8 styles: Natural,
Analytical, Professional, Casual, Curious, Supportive, Educational, Crypto Native;
length/emoji/hashtag/link controls, banned words, language, manual approval ON by
default), Post Evaluator (Reply/Like/Skip + explanation), Feed Assistant (Tag + News
Feed modes, keyword/age filters, dedupe, Start/Pause/Resume/Stop), Account Monitor
(no replies to historical posts on first add), Link Queue (multi-URL paste, post-ID
extraction, dedupe, 7 statuses), Content Creator (posts/threads/hooks, no fabricated
stats), Activity History (user-isolated), API Settings (Groq + OpenRouter, BYOK or
admin-managed), Subscription, Profile, Help.

**Master Admin dashboard** (`/admin`): separate layout, owner-only gate. User
Management, License Management (bulk key generation), Subscription Plans, Feature
Control, AI Providers, API Usage, Analytics, Activity Logs, Audit Logs, System
Settings, Extension Updates. Client-side gate checks `OWNER_EMAIL`; **server RLS on
`user_roles.is_owner` is authoritative** — a client-side bypass cannot grant admin data.

**Safety:** manual approval default ON (extension drafts only, never auto-posts);
configurable delays, reading-time estimation, session limits (60 likes / 35 replies
per day defaults); workflows **stop** on captcha / rate-limit / account-warning
detection; no randomised human-like evasion behaviour.

## Setup

### 1. Environment — copy and fill in

```bash
cp .env.example .env   # at repo root and in web/
```

Values Razz must supply (see "Missing config" below): Supabase URL + anon key +
service-role key, `OWNER_EMAIL=razzshares@gmail.com`, Groq key, OpenRouter key.

### 2. Supabase

```bash
# From the Supabase dashboard, or with the CLI:
supabase link --project-ref <your-project-ref>
supabase db push                       # runs 0001_init.sql + 0002_seed.sql
supabase functions deploy verify-license ai-generate ai-evaluate
supabase secrets set GROQ_API_KEY=... OPENROUTER_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Owner provisioning (do this first, before anyone else registers as admin)

1. Register at the app with **razzshares@gmail.com** via Supabase Auth (normal sign-up).
2. In the Supabase SQL Editor run `supabase/seed_owner.sql` — it looks the UID up by
   email and sets `user_roles.role = 'owner', is_owner = true`. It errors out if the
   user has not registered yet.
3. No admin password is ever hardcoded; no public admin registration exists.

### 4. Web dashboard (Vercel or local)

```bash
cd web && npm install && npm run build   # ✅ verified: builds clean
npm run dev                              # local: http://localhost:5173
```

Vercel: import the repo, set root directory to `web/`, add env vars
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, deploy.

### 5. Browser extension

Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select
`extension/`. Fill `SUPABASE_URL` / `SUPABASE_ANON_KEY` in
`extension/config/config.js` (empty placeholders today).

## What is NOT yet live (missing config — nothing here is faked)

The code fails clearly (explicit "backend not connected" states) until these exist.
Nothing is claimed as verified live.

| # | Missing item | Where it goes |
|---|---|---|
| 1 | **Supabase project** (new project at supabase.com) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| 2 | **Supabase service-role key** (Edge Functions only, never frontend) | `SUPABASE_SERVICE_ROLE_KEY` secret |
| 3 | **Owner account** — register `razzshares@gmail.com` via Supabase Auth, then run `seed_owner.sql` | Supabase Auth + SQL Editor |
| 4 | **Groq API key** (admin-managed fallback; BYOK also supported) | `GROQ_API_KEY` Edge Function secret |
| 5 | **OpenRouter API key** (admin-managed fallback; BYOK also supported) | `OPENROUTER_API_KEY` Edge Function secret |
| 6 | **Vercel project** for the web dashboard | Vercel dashboard, root `web/` |
| 7 | Extension config | `extension/config/config.js` Supabase URL + anon key |
| 8 | Real at-rest encryption for BYOK keys | `ai_configurations.api_key_encrypted` is stored as the key value today; a dedicated secrets/KMS layer is still needed before storing real user keys |

## Security notes

- No service-role key, password, or API key is in this repo — only placeholders.
- License verification is server-side only (`verify-license` Edge Function).
- RLS: users see only their own rows on all 16 tables; `admin_audit_logs` is
  append-only (insert-only, no update/delete policy); `user_roles` is
  SELECT-own-only with no client writes.
- Do **not** use `robiulrazz67@gmail.com` for this product — the owner is
  `razzshares@gmail.com` only.
