/* RS Creator 1.0 — modules/duplicateDetector.js
 * In-memory + chrome.storage set of processed post IDs.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.duplicateDetector = (function () {
  var KEY = "rs_creator_processed_ids";
  var memory = new Set();
  var loaded = false;

  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  async function load() {
    if (loaded) return;
    var out = await storageGet([KEY]);
    (out[KEY] || []).forEach(function (id) { memory.add(String(id)); });
    loaded = true;
  }
  async function hasProcessed(postId) {
    if (!postId) return false;
    await load();
    return memory.has(String(postId));
  }
  async function markProcessed(postId) {
    if (!postId) return false;
    await load();
    memory.add(String(postId));
    // Keep the stored list bounded (latest 2,000).
    var arr = Array.from(memory).slice(-2000);
    await storageSet({ [KEY]: arr });
    return true;
  }
  async function clear() {
    memory.clear();
    await storageSet({ [KEY]: [] });
    return true;
  }
  function hasProcessedSync(postId) { return memory.has(String(postId)); }
  return { hasProcessed: hasProcessed, markProcessed: markProcessed, clear: clear, hasProcessedSync: hasProcessedSync, load: load };
})();
