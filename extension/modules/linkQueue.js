/* RS Creator 1.0 — modules/linkQueue.js
 * Add URLs, extract post ID via regex, validate x.com/twitter.com status
 * URLs, dedupe, status transitions:
 * pending -> processing -> draft_ready -> approved -> completed
 *                              \-> skipped / failed
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.linkQueue = (function () {
  var KEY = "rs_creator_link_queue";
  var STATUS_RE = /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/[^\/]+\/status\/(\d+)(\?.*)?$/;
  var STATUSES = ["pending", "processing", "draft_ready", "approved", "completed", "skipped", "failed"];

  function extractPostId(url) {
    var m = String(url || "").match(STATUS_RE);
    return m ? m[3] : null;
  }
  function isValidStatusUrl(url) { return extractPostId(url) !== null; }

  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  async function getQueue() {
    var out = await storageGet([KEY]);
    return out[KEY] || [];
  }
  async function addUrl(url) {
    var postId = extractPostId(url);
    if (!postId) throw new Error("Not a valid x.com / twitter.com status URL: " + url);
    var queue = await getQueue();
    if (queue.some(function (q) { return q.postId === postId; })) {
      return { added: false, reason: "duplicate", postId: postId };
    }
    var item = { postId: postId, url: url, status: "pending", draft: null, addedAt: Date.now(), updatedAt: Date.now() };
    queue.push(item);
    await storageSet({ [KEY]: queue });
    return { added: true, item: item };
  }
  async function setStatus(postId, status, extra) {
    if (STATUSES.indexOf(status) === -1) throw new Error("Unknown status: " + status);
    var queue = await getQueue();
    var item = queue.find(function (q) { return q.postId === String(postId); });
    if (!item) throw new Error("Post not in queue: " + postId);
    item.status = status;
    item.updatedAt = Date.now();
    if (extra) Object.assign(item, extra);
    await storageSet({ [KEY]: queue });
    return item;
  }
  async function nextPending() {
    var queue = await getQueue();
    return queue.find(function (q) { return q.status === "pending"; }) || null;
  }
  return { extractPostId: extractPostId, isValidStatusUrl: isValidStatusUrl, getQueue: getQueue, addUrl: addUrl, setStatus: setStatus, nextPending: nextPending, STATUSES: STATUSES };
})();
