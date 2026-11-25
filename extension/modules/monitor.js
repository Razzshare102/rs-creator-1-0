/* RS Creator 1.0 — modules/monitor.js
 * Monitored accounts list; detects new posts by comparing last-seen post id.
 * NEVER processes historical posts on first add: the current latest post
 * is marked as the baseline, only newer posts are processed after that.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.monitor = (function () {
  var KEY = "rs_creator_monitored_accounts";
  // { username: { username, lastSeenPostId, addedAt, baselineSet } }

  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  async function getAccounts() {
    var out = await storageGet([KEY]);
    return out[KEY] || {};
  }
  async function addAccount(username, latestPostId) {
    username = String(username || "").replace(/^@/, "").trim();
    if (!username) throw new Error("Username is required.");
    var accounts = await getAccounts();
    accounts[username] = {
      username: username,
      // Baseline: current latest is NOT processed; only newer posts are.
      lastSeenPostId: latestPostId || null,
      addedAt: Date.now(),
      baselineSet: Boolean(latestPostId)
    };
    await storageSet({ [KEY]: accounts });
    return accounts[username];
  }
  async function removeAccount(username) {
    var accounts = await getAccounts();
    delete accounts[String(username).replace(/^@/, "")];
    await storageSet({ [KEY]: accounts });
    return true;
  }
  // posts: newest-first array of { id } for one account. Returns new posts
  // (ids not seen before, in chronological order) and updates lastSeen.
  async function detectNewPosts(username, posts) {
    var accounts = await getAccounts();
    var acc = accounts[username];
    if (!acc) throw new Error("Account is not monitored: " + username);
    var list = (posts || []).filter(function (p) { return p && p.id; });
    if (!acc.baselineSet) {
      // First sighting: mark latest as baseline, process nothing historical.
      if (list.length) {
        acc.lastSeenPostId = list[0].id;
        acc.baselineSet = true;
        accounts[username] = acc;
        await storageSet({ [KEY]: accounts });
      }
      return [];
    }
    var idx = list.findIndex(function (p) { return String(p.id) === String(acc.lastSeenPostId); });
    var fresh = idx === -1 ? list.slice() : list.slice(0, idx);
    if (list.length) acc.lastSeenPostId = list[0].id;
    accounts[username] = acc;
    await storageSet({ [KEY]: accounts });
    return fresh.reverse(); // chronological
  }
  return { getAccounts: getAccounts, addAccount: addAccount, removeAccount: removeAccount, detectNewPosts: detectNewPosts };
})();
