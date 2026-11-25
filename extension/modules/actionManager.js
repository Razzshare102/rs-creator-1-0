/* RS Creator 1.0 — modules/actionManager.js
 * Executes ONLY user-approved actions:
 *  - copy a draft to the clipboard
 *  - open the reply composer prefilled with the draft (never auto-submit)
 * Every action is recorded in the activity log. Nothing auto-posts.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.actionManager = (function () {
  var LOG_KEY = "rs_creator_activity_log";

  async function logActivity(entry) {
    var out = await new Promise(function (resolve) { chrome.storage.local.get([LOG_KEY], resolve); });
    var log = out[LOG_KEY] || [];
    log.push(Object.assign({ at: Date.now() }, entry));
    await new Promise(function (resolve) { chrome.storage.local.set({ [LOG_KEY]: log.slice(-500) }, resolve); });
    return log.length;
  }
  async function getActivityLog() {
    var out = await new Promise(function (resolve) { chrome.storage.local.get([LOG_KEY], resolve); });
    return out[LOG_KEY] || [];
  }
  // Copy text — service-worker context: use an offscreen-free fallback via
  // the active tab's content script when navigator.clipboard is unavailable.
  async function copyToClipboard(text, postId) {
    var ok = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) {
      // Fall back: ask the active X tab to copy (content.js handles it).
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, { type: "RS_COPY_TEXT", text: text });
        ok = true;
      }
    }
    await logActivity({ action: "copy", postId: postId || null, ok: ok });
    return ok;
  }
  // Open the reply composer prefilled — the USER presses Post.
  async function openReplyComposer(postId, draft) {
    if (!postId) throw new Error("postId is required to open a reply composer.");
    var url = "https://x.com/intent/tweet?in_reply_to=" + encodeURIComponent(postId) + "&text=" + encodeURIComponent(draft || "");
    await chrome.tabs.create({ url: url });
    await logActivity({ action: "open_reply_composer", postId: postId, ok: true });
    return url;
  }
  // Record an approved action (called after the user confirms in the UI).
  async function recordApprovedAction(action, postId, detail) {
    await logActivity(Object.assign({ action: action, postId: postId || null, approved: true }, detail || {}));
  }
  return { copyToClipboard: copyToClipboard, openReplyComposer: openReplyComposer, recordApprovedAction: recordApprovedAction, logActivity: logActivity, getActivityLog: getActivityLog };
})();
