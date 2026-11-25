/* RS Creator 1.0 — background.js (Manifest V3 service worker, classic script)
 * Message router, auth session handling, license verification, AI calls
 * proxied through Supabase Edge Functions, queue orchestration for
 * feed / monitor / linkQueue, chrome.alarms for scan intervals, and a
 * global pause/stop flag in chrome.storage.local.
 * No API keys are embedded here. Manual approval is ON by default:
 * nothing auto-posts, auto-likes, or auto-submits.
 */
try { importScripts("config/config.js"); } catch (e) { /* config loaded by popup path */ }
importScripts(
  "modules/supabase.js",
  "modules/auth.js",
  "modules/licenseManager.js",
  "modules/humanEngine.js",
  "modules/behaviorController.js",
  "modules/apiUsage.js",
  "modules/aiAnalyzer.js",
  "modules/replyGenerator.js",
  "modules/qualityChecker.js",
  "modules/duplicateDetector.js",
  "modules/actionManager.js",
  "modules/feed.js",
  "modules/monitor.js",
  "modules/linkQueue.js"
);

var RSCreator = globalThis.RSCreator;
var SCAN_ALARM = "rs_creator_scan";

function defaults() { return (RSCreator.CONFIG && RSCreator.CONFIG.DEFAULTS) || {}; }

async function requireLogin() {
  if (!(await RSCreator.auth.isLoggedIn())) throw new Error("Not logged in. Sign in from the popup first.");
}
async function requireActiveLicense() {
  if (!(await RSCreator.licenseManager.isActive())) throw new Error("License is not active. Verify a license key in the popup.");
}

async function getStatus() {
  var loggedIn = await RSCreator.auth.isLoggedIn();
  var user = loggedIn ? await RSCreator.auth.getUser() : null;
  var license = await RSCreator.licenseManager.getStatus();
  var workflow = await RSCreator.behaviorController.getState();
  var usage = await RSCreator.apiUsage.getToday();
  var counts = await RSCreator.behaviorController.getCounts();
  var quota = await RSCreator.apiUsage.checkQuota();
  return {
    loggedIn: loggedIn,
    user: user ? { email: user.email, id: user.id } : null,
    license: license,
    workflow: workflow,
    usageToday: { requests: usage.requests || 0, tokens: usage.tokens || 0, quota: quota.quota },
    countsToday: counts,
    manualApproval: defaults().manualApproval !== false,
    ownerEmail: (RSCreator.CONFIG || {}).OWNER_EMAIL || null
  };
}

// Process one queued link end-to-end (draft only — user approves in popup).
async function processNextQueuedLink() {
  var item = await RSCreator.linkQueue.nextPending();
  if (!item) return { processed: false, reason: "queue_empty" };
  await RSCreator.linkQueue.setStatus(item.postId, "processing");
  try {
    var tabs = await chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] });
    var post = null;
    if (tabs[0]) {
      try {
        var resp = await chrome.tabs.sendMessage(tabs[0].id, { type: "RS_GET_POST", postId: item.postId });
        post = resp && resp.post ? resp.post : null;
      } catch (e) { post = null; }
    }
    if (!post) {
      // No X tab with the post open: leave it pending for a manual retry.
      await RSCreator.linkQueue.setStatus(item.postId, "pending");
      return { processed: false, reason: "post_not_visible_in_open_x_tab", postId: item.postId };
    }
    var result = await RSCreator.replyGenerator.generateReply(post, {});
    if (!result.quality.ok) {
      await RSCreator.linkQueue.setStatus(item.postId, "failed", { draft: result.draft, error: "quality_check_failed: " + result.quality.issues.join(", ") });
      return { processed: true, postId: item.postId, status: "failed" };
    }
    await RSCreator.linkQueue.setStatus(item.postId, "draft_ready", { draft: result.draft });
    await RSCreator.duplicateDetector.markProcessed(item.postId);
    return { processed: true, postId: item.postId, status: "draft_ready", draft: result.draft };
  } catch (err) {
    await RSCreator.linkQueue.setStatus(item.postId, "failed", { error: String(err && err.message || err) });
    return { processed: true, postId: item.postId, status: "failed", error: String(err && err.message || err) };
  }
}

async function runScanTick() {
  var workflow = await RSCreator.behaviorController.getState();
  if (workflow.paused || workflow.stopped) return { ran: false, reason: workflow.stopped ? "stopped" : "paused" };
  if (await RSCreator.behaviorController.sessionExpired()) {
    await RSCreator.behaviorController.stop("Session time limit reached.");
    return { ran: false, reason: "session_expired" };
  }
  // Queue work is draft-only; the user approves each draft in the popup.
  return await processNextQueuedLink();
}

function setupAlarms() {
  var sec = defaults().scanIntervalSec || 300;
  chrome.alarms.create(SCAN_ALARM, { periodInMinutes: Math.max(1, Math.round(sec / 60)) });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === SCAN_ALARM) {
    runScanTick().catch(function (err) { console.error("[RS Creator] scan tick failed:", err); });
  }
});

chrome.runtime.onInstalled.addListener(function () {
  setupAlarms();
  RSCreator.behaviorController.startSession().catch(function () {});
});
chrome.runtime.onStartup.addListener(function () { setupAlarms(); });

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (async function () {
    var type = msg && msg.type;
    switch (type) {
      case "RS_GET_STATUS": return await getStatus();

      case "RS_SIGN_IN": {
        var session = await RSCreator.auth.signIn(msg.email, msg.password);
        return { ok: true, user: session.user || null };
      }
      case "RS_SIGN_UP": {
        var data = await RSCreator.auth.signUp(msg.email, msg.password);
        return { ok: true, data: data };
      }
      case "RS_SIGN_OUT":
        await RSCreator.auth.clearSession();
        await RSCreator.behaviorController.stop("Signed out.");
        return { ok: true };

      case "RS_VERIFY_LICENSE": {
        var lic = await RSCreator.licenseManager.verifyLicense(msg.licenseKey);
        return { ok: true, license: lic };
      }

      case "RS_GENERATE_REPLY": {
        await requireLogin(); await requireActiveLicense();
        var gen = await RSCreator.replyGenerator.generateReply(msg.post, msg.options || {});
        return { ok: true, draft: gen.draft, quality: gen.quality, postId: gen.postId };
      }
      case "RS_EVALUATE_POST": {
        await requireLogin(); await requireActiveLicense();
        var ev = await RSCreator.aiAnalyzer.evaluatePost(msg.post, msg.options || {});
        return { ok: true, evaluation: ev };
      }
      case "RS_GET_CURRENT_POST": {
        var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) return { ok: false, error: "No active tab." };
        var resp = await chrome.tabs.sendMessage(tabs[0].id, { type: "RS_GET_VISIBLE_POSTS" });
        return { ok: true, posts: (resp && resp.posts) || [] };
      }

      case "RS_COPY_DRAFT":
        await RSCreator.actionManager.copyToClipboard(msg.draft, msg.postId);
        return { ok: true };
      case "RS_OPEN_REPLY": {
        // User-approved only: opens the composer prefilled; user presses Post.
        if (defaults().manualApproval === false) throw new Error("Manual approval is disabled in config — refusing to open a composer.");
        await RSCreator.actionManager.openReplyComposer(msg.postId, msg.draft);
        await RSCreator.behaviorController.increment("reply");
        await RSCreator.linkQueue.setStatus(msg.postId, "approved").catch(function () {});
        return { ok: true };
      }
      case "RS_MARK_COMPLETED":
        await RSCreator.linkQueue.setStatus(msg.postId, "completed");
        await RSCreator.duplicateDetector.markProcessed(msg.postId);
        return { ok: true };

      case "RS_ADD_LINK": {
        var added = await RSCreator.linkQueue.addUrl(msg.url);
        return { ok: true, added: added };
      }
      case "RS_GET_QUEUE": return { ok: true, queue: await RSCreator.linkQueue.getQueue() };
      case "RS_PROCESS_QUEUE": {
        await requireLogin(); await requireActiveLicense();
        return { ok: true, result: await processNextQueuedLink() };
      }
      case "RS_ADD_MONITORED": {
        var acc = await RSCreator.monitor.addAccount(msg.username, msg.latestPostId || null);
        return { ok: true, account: acc };
      }
      case "RS_GET_MONITORED": return { ok: true, accounts: await RSCreator.monitor.getAccounts() };

      case "RS_PAUSE": return { ok: true, workflow: await RSCreator.behaviorController.pause() };
      case "RS_RESUME": return { ok: true, workflow: await RSCreator.behaviorController.resume() };
      case "RS_STOP": return { ok: true, workflow: await RSCreator.behaviorController.stop(msg.reason || "Stopped from popup.") };
      case "RS_GET_ACTIVITY_LOG": return { ok: true, log: await RSCreator.actionManager.getActivityLog() };

      case "RS_CONTENT_BLOCK_DETECTED": {
        // Content script spotted a captcha / warning on the page.
        var workflow = await RSCreator.behaviorController.stop("X showed a warning on the page: " + (msg.signal || "unknown signal") + ". Workflow stopped.");
        return { ok: true, workflow: workflow };
      }
      default:
        throw new Error("Unknown message type: " + type);
    }
  })()
    .then(sendResponse)
    .catch(function (err) { sendResponse({ ok: false, error: String(err && err.message || err) }); });
  return true; // async response
});
