/* RS Creator 1.0 — configuration.
 * Fill SUPABASE_URL / SUPABASE_ANON_KEY from your Supabase dashboard
 * settings (or .env) before loading the extension. Never commit real keys
 * to a public repo. No other API keys belong in this extension: all AI
 * calls go through Supabase Edge Functions (ai-generate, ai-evaluate,
 * verify-license), so no provider key is ever embedded here.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.CONFIG = {
  // Owner / support contact for the extension.
  OWNER_EMAIL: "razzshares@gmail.com",

  // Fill from .env / dashboard settings
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Edge Function names (deployed in the same Supabase project)
  EDGE_FUNCTIONS: {
    VERIFY_LICENSE: "verify-license",
    AI_GENERATE: "ai-generate",
    AI_EVALUATE: "ai-evaluate"
  },

  DEFAULTS: {
    scanIntervalSec: 300,        // 5 minutes between feed scans
    maxPostsPerSession: 20,      // max posts processed per scan session
    dailyLikeLimit: 60,
    dailyReplyLimit: 35,
    manualApproval: true,        // ON by default — nothing auto-posts
    maxSessionMinutes: 60,
    minDelayMs: 1500,            // fixed, configurable delays (NOT random evasion)
    maxDelayMs: 4000,
    readingWpm: 200,
    dailyApiQuota: 200,          // Edge Function calls per day
    licenseCacheTtlMs: 6 * 60 * 60 * 1000 // 6 hours
  },

  // Safety: page-text signals that stop workflows immediately.
  BLOCK_SIGNALS: ["captcha", "rate limit", "unusual activity", "suspended", "verify your identity", "temporarily restricted"]
};

// In a service worker / content script, `var` at top level is script-scoped,
// so also expose explicitly for importScripts consumers.
globalThis.RSCreator = RSCreator;
