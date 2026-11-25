# RS Creator 1.0 — Browser Extension (Manifest V3)

AI-powered X (Twitter) Creator Assistant. Generates reply drafts and
evaluates posts. **Manual approval is ON by default — nothing auto-posts,
auto-likes, or auto-submits.**

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. The RS Creator icon appears in the toolbar; click it to sign in.

## Config

Edit `config/config.js` and fill in:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon (public) key

Fill these from your `.env` / Supabase dashboard settings. Do **not**
commit real keys to a public repo.

No other API keys belong in this extension. All AI calls go through
Supabase Edge Functions in the same project:

- `verify-license` — license verification
- `ai-generate` — reply drafting
- `ai-evaluate` — post evaluation

The Edge Functions hold any provider API keys server-side.

Owner / support contact: **razzshares@gmail.com**

## How it works

- **Popup** (`popup.html` / `popup.js`): sign in (email/password via
  Supabase Auth REST — the password is never stored; only the session
  token is kept in `chrome.storage.local`), license status, quick
  actions (Generate Reply for current post, Evaluate Post, Open
  Dashboard), usage today, and a Pause/Stop all workflows button.
- **Background** (`background.js`): service worker — message router,
  auth, license checks, Edge Function calls, queue orchestration for
  feed / monitor / linkQueue, `chrome.alarms` scan intervals, and the
  global pause/stop flag.
- **Content script** (`content.js`): runs on x.com / twitter.com,
  extracts visible post text/author/post-id from `article`
  (`data-testid="tweet"`) elements, and injects small "RS Creator"
  buttons (Reply with AI, Evaluate) — only when logged in and the
  workflow is enabled. It never auto-clicks Like/Reply.
- **Modules** (`modules/`): classic scripts sharing the `RSCreator`
  namespace, loaded by the service worker with `importScripts`:
  `supabase`, `auth`, `licenseManager`, `humanEngine`,
  `behaviorController`, `aiAnalyzer`, `replyGenerator`,
  `qualityChecker`, `duplicateDetector`, `actionManager`, `feed`,
  `monitor`, `linkQueue`, `apiUsage`.

Defaults (`config/config.js`): scan every 300s, max 20 posts/session,
60 likes/day, 35 replies/day, manual approval on, daily AI quota 200.

## Safety notes

- **Manual approval ON by default.** Generated replies are drafts.
  Opening the reply composer prefills it — you press Post on X.
- **No randomized human-like evasion behaviour.** Delays are fixed,
  configurable pauses (`humanEngine.js`), not randomised mimicry.
- **Workflow stops on block detection.** `behaviorController.js`
  checks page text for `captcha`, `rate limit`, `unusual activity`,
  `suspended`, `verify your identity`, and `temporarily restricted`;
  on a match the workflow is stopped and a clear status is shown in
  the popup. If X blocks an action or shows a warning/captcha, stop
  and review the account before resuming.
- Session limits (likes/replies per day, session timer) are enforced
  in `behaviorController.js`; the link queue dedupes by post ID and
  never re-processes a post (`duplicateDetector.js`); the monitor
  never processes historical posts on first add (latest post is the
  baseline).
- Icons are generated locally from `assets/icons/icon.svg`
  (indigo gradient "RS" monogram on dark slate) — no icons were
  downloaded from the web.

## File layout

```
extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html / popup.css / popup.js
├── config/config.js
├── modules/            (14 modules, see above)
├── assets/icons/       icon.svg, icon16.png, icon48.png, icon128.png
└── README.md
```
