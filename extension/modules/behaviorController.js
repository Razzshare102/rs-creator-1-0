/* RS Creator 1.0 — modules/behaviorController.js
 * Session limits, session timer, pause/stop, and block detection.
 * SAFETY: when X shows a captcha / rate-limit / warning / suspension
 * signal, the relevant workflow is STOPPED and a clear status is surfaced.
 * No randomized evasion behaviour is implemented anywhere in this extension.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.behaviorController = (function () {
  var STATE_KEY = "rs_creator_workflow_state";
  var COUNTS_KEY = "rs_creator_daily_counts";
  var SESSION_KEY = "rs_creator_session_state";

  // Page-text signals that mean "stop now" (also in CONFIG.BLOCK_SIGNALS).
  var BLOCK_PATTERNS = [
    /captcha/i,
    /rate limit/i,
    /unusual activity/i,
    /suspended/i,
    /verify your identity/i,
    /temporarily restricted/i,
    /something went wrong/i
  ];

  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(obj) {
    return new Promise(function (resolve) { chrome.storage.local.set(obj, resolve); });
  }
  async function getState() {
    var out = await storageGet([STATE_KEY]);
    return out[STATE_KEY] || { paused: false, stopped: false, stopReason: null, updatedAt: null };
  }
  async function setState(patch) {
    var cur = await getState();
    var next = Object.assign({}, cur, patch, { updatedAt: Date.now() });
    await storageSet({ [STATE_KEY]: next });
    return next;
  }
  async function pause() { return setState({ paused: true, stopped: false }); }
  async function resume() { return setState({ paused: false, stopped: false, stopReason: null }); }
  async function stop(reason) {
    return setState({ paused: false, stopped: true, stopReason: reason || "Stopped by user." });
  }
  async function isPaused() { return (await getState()).paused; }
  async function isStopped() { return (await getState()).stopped; }

  // --- Daily counts / session limits ---
  function limits() {
    var d = (RSCreator.CONFIG && RSCreator.CONFIG.DEFAULTS) || {};
    return { likes: d.dailyLikeLimit || 60, replies: d.dailyReplyLimit || 35 };
  }
  async function getCounts() {
    var out = await storageGet([COUNTS_KEY]);
    var c = out[COUNTS_KEY] || {};
    if (c.date !== todayKey()) c = { date: todayKey(), likes: 0, replies: 0 };
    return c;
  }
  async function increment(kind) {
    var c = await getCounts();
    if (kind === "like") c.likes = (c.likes || 0) + 1;
    if (kind === "reply") c.replies = (c.replies || 0) + 1;
    await storageSet({ [COUNTS_KEY]: c });
    return c;
  }
  async function canLike() {
    var c = await getCounts();
    return (c.likes || 0) < limits().likes;
  }
  async function canReply() {
    var c = await getCounts();
    return (c.replies || 0) < limits().replies;
  }

  // --- Session timer ---
  async function startSession() {
    var s = { startedAt: Date.now(), maxMinutes: ((RSCreator.CONFIG.DEFAULTS || {}).maxSessionMinutes || 60) };
    await storageSet({ [SESSION_KEY]: s });
    return s;
  }
  async function sessionExpired() {
    var out = await storageGet([SESSION_KEY]);
    var s = out[SESSION_KEY];
    if (!s || !s.startedAt) return false;
    return Date.now() - s.startedAt > (s.maxMinutes || 60) * 60 * 1000;
  }
  async function sessionRemainingMs() {
    var out = await storageGet([SESSION_KEY]);
    var s = out[SESSION_KEY];
    if (!s || !s.startedAt) return 0;
    return Math.max(0, (s.maxMinutes || 60) * 60 * 1000 - (Date.now() - s.startedAt));
  }

  // --- Block / error detection ---
  // Returns the matched signal string, or null. Pure text check — no evasion.
  function detectBlockSignal(text) {
    var hay = String(text || "");
    var signals = (RSCreator.CONFIG && RSCreator.CONFIG.BLOCK_SIGNALS) || [];
    for (var i = 0; i < signals.length; i++) {
      if (hay.toLowerCase().indexOf(String(signals[i]).toLowerCase()) !== -1) return String(signals[i]);
    }
    for (var j = 0; j < BLOCK_PATTERNS.length; j++) {
      var m = hay.match(BLOCK_PATTERNS[j]);
      if (m) return m[0];
    }
    return null;
  }
  // Check the current page (content-script context) and stop if blocked.
  async function checkPageAndStopIfBlocked(doc) {
    var text = "";
    try { text = (doc || document).body ? (doc || document).body.innerText || "" : ""; } catch (e) {}
    var signal = detectBlockSignal(text);
    if (signal) {
      await stop("X blocked the workflow: detected '" + signal + "'. Workflow stopped — review the account before resuming.");
      return signal;
    }
    return null;
  }
  function detectError(text) {
    return detectBlockSignal(text);
  }

  return {
    BLOCK_PATTERNS: BLOCK_PATTERNS, getState: getState, setState: setState,
    pause: pause, resume: resume, stop: stop, isPaused: isPaused, isStopped: isStopped,
    getCounts: getCounts, increment: increment, canLike: canLike, canReply: canReply, limits: limits,
    startSession: startSession, sessionExpired: sessionExpired, sessionRemainingMs: sessionRemainingMs,
    detectBlockSignal: detectBlockSignal, checkPageAndStopIfBlocked: checkPageAndStopIfBlocked, detectError: detectError
  };
})();
