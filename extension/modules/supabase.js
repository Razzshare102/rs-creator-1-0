/* RS Creator 1.0 — modules/supabase.js
 * Minimal Supabase REST client. No SDK, no build step.
 * Reads SUPABASE_URL / SUPABASE_ANON_KEY from config.js.
 * Never embeds any other API key: AI calls go through Edge Functions.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.supabase = (function () {
  function baseUrl() {
    var cfg = RSCreator.CONFIG || {};
    if (!cfg.SUPABASE_URL) throw new Error("SUPABASE_URL is not configured (config/config.js).");
    return cfg.SUPABASE_URL.replace(/\/$/, "");
  }
  function anonKey() {
    var cfg = RSCreator.CONFIG || {};
    if (!cfg.SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY is not configured (config/config.js).");
    return cfg.SUPABASE_ANON_KEY;
  }
  function isConfigured() {
    var cfg = RSCreator.CONFIG || {};
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }
  async function request(path, opts) {
    opts = opts || {};
    var headers = {
      apikey: anonKey(),
      "Content-Type": "application/json"
    };
    if (opts.accessToken) headers.Authorization = "Bearer " + opts.accessToken;
    var res = await fetch(baseUrl() + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      var msg = (data && (data.msg || data.message || data.error_description)) || ("HTTP " + res.status);
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  // Auth: POST /auth/v1/token?grant_type=password
  async function signIn(email, password) {
    return request("/auth/v1/token?grant_type=password", {
      method: "POST", body: { email: email, password: password }
    });
  }
  async function signUp(email, password) {
    return request("/auth/v1/signup", {
      method: "POST", body: { email: email, password: password }
    });
  }
  async function refreshToken(refreshToken) {
    return request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: { refresh_token: refreshToken }
    });
  }
  async function getUser(accessToken) {
    return request("/auth/v1/user", { accessToken: accessToken });
  }
  // Edge Function invoke helper: POST /functions/v1/<name>
  async function invokeFunction(name, body, accessToken) {
    if (!name) throw new Error("Edge Function name is required.");
    return request("/functions/v1/" + name, {
      method: "POST", body: body || {}, accessToken: accessToken || undefined
    });
  }
  return { isConfigured: isConfigured, baseUrl: baseUrl, request: request, signIn: signIn, signUp: signUp, refreshToken: refreshToken, getUser: getUser, invokeFunction: invokeFunction };
})();
