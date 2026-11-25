/* RS Creator 1.0 — modules/auth.js
 * Session get/set/clear, token refresh, isLoggedIn.
 * Stores ONLY the session token object in chrome.storage.local.
 * Passwords are never stored.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.auth = (function () {
  var SESSION_KEY = "rs_creator_session";
  var USER_KEY = "rs_creator_user";

  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  function storageRemove(keys) {
    return new Promise(function (resolve) { chrome.storage.local.remove(keys, resolve); });
  }

  async function getSession() {
    var out = await storageGet([SESSION_KEY]);
    return out[SESSION_KEY] || null;
  }
  async function setSession(session) {
    // session: { access_token, refresh_token, expires_at, token_type, user }
    // No password field is ever accepted here.
    if (session && session.password) delete session.password;
    await storageSet({ [SESSION_KEY]: session });
    if (session && session.user) await storageSet({ [USER_KEY]: session.user });
    return session;
  }
  async function clearSession() {
    await storageRemove([SESSION_KEY, USER_KEY, "rs_creator_license"]);
  }
  async function getUser() {
    var out = await storageGet([USER_KEY]);
    return out[USER_KEY] || null;
  }
  function isExpired(session) {
    if (!session) return true;
    if (!session.expires_at) return false;
    // expires_at is a unix timestamp (seconds).
    return Date.now() / 1000 >= session.expires_at - 60;
  }
  async function isLoggedIn() {
    var session = await getSession();
    if (!session || !session.access_token) return false;
    if (isExpired(session)) {
      try { await refreshSession(); return true; } catch (e) { return false; }
    }
    return true;
  }
  async function refreshSession() {
    var session = await getSession();
    if (!session || !session.refresh_token) throw new Error("No refresh token available.");
    var data = await RSCreator.supabase.refreshToken(session.refresh_token);
    var next = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: data.expires_at || (Math.floor(Date.now() / 1000) + (data.expires_in || 3600)),
      token_type: data.token_type || "bearer",
      user: data.user || session.user
    };
    await setSession(next);
    return next;
  }
  async function getAccessToken() {
    var session = await getSession();
    if (!session) return null;
    if (isExpired(session)) {
      try { session = await refreshSession(); } catch (e) { return null; }
    }
    return session.access_token;
  }
  async function signIn(email, password) {
    var data = await RSCreator.supabase.signIn(email, password);
    var session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || (Math.floor(Date.now() / 1000) + (data.expires_in || 3600)),
      token_type: data.token_type || "bearer",
      user: data.user || null
    };
    await setSession(session);
    return session;
  }
  async function signUp(email, password) {
    var data = await RSCreator.supabase.signUp(email, password);
    if (data.access_token) {
      await setSession({
        access_token: data.access_token, refresh_token: data.refresh_token,
        expires_at: data.expires_at, token_type: data.token_type || "bearer", user: data.user || null
      });
    }
    return data;
  }
  return { getSession: getSession, setSession: setSession, clearSession: clearSession, getUser: getUser, isLoggedIn: isLoggedIn, refreshSession: refreshSession, getAccessToken: getAccessToken, signIn: signIn, signUp: signUp, isExpired: isExpired };
})();
