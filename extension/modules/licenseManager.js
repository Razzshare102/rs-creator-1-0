/* RS Creator 1.0 — modules/licenseManager.js
 * verifyLicense(key): calls the Supabase Edge Function verify-license.
 * Caches the result in chrome.storage.local with an expiry; isActive()
 * reads the cache (and re-verifies when stale).
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.licenseManager = (function () {
  var CACHE_KEY = "rs_creator_license";
  var KEY_KEY = "rs_creator_license_key";

  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  function cacheTtl() {
    return (RSCreator.CONFIG && RSCreator.CONFIG.DEFAULTS && RSCreator.CONFIG.DEFAULTS.licenseCacheTtlMs) || 6 * 60 * 60 * 1000;
  }
  async function getCached() {
    var out = await storageGet([CACHE_KEY]);
    return out[CACHE_KEY] || null;
  }
  async function verifyLicense(key) {
    if (!key) throw new Error("License key is required.");
    var fn = (RSCreator.CONFIG.EDGE_FUNCTIONS || {}).VERIFY_LICENSE || "verify-license";
    var token = await RSCreator.auth.getAccessToken();
    var data = await RSCreator.supabase.invokeFunction(fn, { license_key: key }, token);
    var status = {
      active: Boolean(data.active || data.valid),
      plan: data.plan || null,
      expiresAt: data.expires_at || data.expiresAt || null,
      keyLast4: key.slice(-4),
      checkedAt: Date.now()
    };
    await storageSet({ [CACHE_KEY]: status, [KEY_KEY]: key });
    return status;
  }
  async function isActive() {
    var cached = await getCached();
    if (cached && cached.checkedAt && Date.now() - cached.checkedAt < cacheTtl()) {
      return Boolean(cached.active);
    }
    var out = await storageGet([KEY_KEY]);
    var key = out[KEY_KEY];
    if (!key) return false;
    try {
      var fresh = await verifyLicense(key);
      return Boolean(fresh.active);
    } catch (e) { return Boolean(cached && cached.active); }
  }
  async function getStatus() {
    var cached = await getCached();
    if (cached) return cached;
    var active = await isActive();
    return { active: active, plan: null, expiresAt: null, checkedAt: Date.now() };
  }
  return { verifyLicense: verifyLicense, isActive: isActive, getStatus: getStatus, getCached: getCached };
})();
