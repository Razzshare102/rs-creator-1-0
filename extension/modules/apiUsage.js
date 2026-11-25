/* RS Creator 1.0 — modules/apiUsage.js
 * Counts Edge Function requests today in chrome.storage.local;
 * daily quota check. Counts requests (and tokens when the server reports
 * them); the quota is a local guard, the server remains authoritative.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.apiUsage = (function () {
  var KEY = "rs_creator_api_usage";
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  function quota() {
    return ((RSCreator.CONFIG && RSCreator.CONFIG.DEFAULTS) || {}).dailyApiQuota || 200;
  }
  async function getToday() {
    var out = await storageGet([KEY]);
    var u = out[KEY] || {};
    if (u.date !== todayKey()) u = { date: todayKey(), requests: 0, tokens: 0 };
    return u;
  }
  async function recordRequest(tokens) {
    var u = await getToday();
    u.requests = (u.requests || 0) + 1;
    u.tokens = (u.tokens || 0) + (tokens || 0);
    await storageSet({ [KEY]: u });
    return u;
  }
  async function checkQuota() {
    var u = await getToday();
    var q = quota();
    return { ok: (u.requests || 0) < q, used: u.requests || 0, quota: q, tokens: u.tokens || 0 };
  }
  return { getToday: getToday, recordRequest: recordRequest, checkQuota: checkQuota, quota: quota };
})();
