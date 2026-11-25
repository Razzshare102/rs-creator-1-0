/* RS Creator 1.0 — popup.js
 * Talks to background.js via chrome.runtime.sendMessage.
 * Never stores passwords; only the session token lives in
 * chrome.storage.local (handled by background auth.js).
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var currentDraft = null;
  var currentPostId = null;

  function send(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (res) {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message });
        else resolve(res || { ok: false, error: "No response from background." });
      });
    });
  }
  function showError(el, msg) {
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  async function refresh() {
    var st = await send({ type: "RS_GET_STATUS" });
    if (!st || st.ok === false) { showError($("loginError"), (st && st.error) || "Background worker unavailable."); return; }
    var loggedIn = st.loggedIn;
    $("loginSection").hidden = loggedIn;
    $("mainSection").hidden = !loggedIn;
    var pill = $("statusPill");
    pill.textContent = loggedIn ? "Signed in" : "Signed out";
    pill.className = "pill " + (loggedIn ? "pill-on" : "pill-off");
    if (!loggedIn) return;
    $("userEmail").textContent = (st.user && st.user.email) || "";
    $("ownerEmail").textContent = st.ownerEmail || "";
    var lic = st.license || {};
    $("licenseLine").textContent = "License: " + (lic.active ? "Active" + (lic.plan ? " (" + lic.plan + ")" : "") : "not verified / inactive");
    $("usageLine").textContent = "AI requests today: " + st.usageToday.requests + " / " + st.usageToday.quota + " (tokens: " + st.usageToday.tokens + ")";
    $("countsLine").textContent = "Replies today: " + (st.countsToday.replies || 0) + " · Likes today: " + (st.countsToday.likes || 0);
    var wf = st.workflow || {};
    $("workflowLine").textContent = wf.stopped
      ? "STOPPED — " + (wf.stopReason || "stopped")
      : wf.paused ? "Paused" : "Running";
    $("pauseBtn").textContent = wf.stopped ? "Stopped" : "Pause / Stop all workflows";
  }

  async function currentPost() {
    var res = await send({ type: "RS_GET_CURRENT_POST" });
    if (!res || res.ok === false) throw new Error((res && res.error) || "Could not read the current X tab.");
    var posts = res.posts || [];
    if (!posts.length) throw new Error("No post visible in the active X tab. Open a post on x.com first.");
    return posts[0];
  }

  document.addEventListener("DOMContentLoaded", function () {
    refresh();

    $("signInBtn").addEventListener("click", async function () {
      showError($("loginError"), "");
      var res = await send({ type: "RS_SIGN_IN", email: $("email").value.trim(), password: $("password").value });
      if (!res.ok) { showError($("loginError"), res.error); return; }
      $("password").value = ""; // never keep the password in the popup
      refresh();
    });
    $("signUpBtn").addEventListener("click", async function () {
      showError($("loginError"), "");
      var res = await send({ type: "RS_SIGN_UP", email: $("email").value.trim(), password: $("password").value });
      if (!res.ok) { showError($("loginError"), res.error); return; }
      $("password").value = "";
      refresh();
    });
    $("signOutBtn").addEventListener("click", async function () {
      await send({ type: "RS_SIGN_OUT" });
      refresh();
    });
    $("verifyLicenseBtn").addEventListener("click", async function () {
      showError($("licenseError"), "");
      var res = await send({ type: "RS_VERIFY_LICENSE", licenseKey: $("licenseKey").value.trim() });
      if (!res.ok) { showError($("licenseError"), res.error); return; }
      refresh();
    });

    $("generateReplyBtn").addEventListener("click", async function () {
      showError($("actionError"), "");
      try {
        var post = await currentPost();
        var res = await send({ type: "RS_GENERATE_REPLY", post: post, options: {} });
        if (!res.ok) throw new Error(res.error);
        currentDraft = res.draft; currentPostId = res.postId || post.id;
        $("draftText").textContent = res.draft;
        $("draftQuality").textContent = "Quality: " + (res.quality.ok ? "passed" : "issues — " + res.quality.issues.join(", ")) + " · " + res.quality.charCount + " chars";
        $("draftBox").hidden = false;
      } catch (e) { showError($("actionError"), e.message); }
    });
    $("evaluateBtn").addEventListener("click", async function () {
      showError($("actionError"), "");
      try {
        var post = await currentPost();
        var res = await send({ type: "RS_EVALUATE_POST", post: post, options: {} });
        if (!res.ok) throw new Error(res.error);
        var ev = res.evaluation || {};
        $("draftText").textContent = "Score: " + (ev.score !== null && ev.score !== undefined ? ev.score : "n/a") +
          "\nRecommendation: " + (ev.recommendation || "n/a") +
          "\nSuggested action: " + (ev.suggestedAction || "none") +
          (ev.reasons && ev.reasons.length ? "\nReasons: " + ev.reasons.join("; ") : "");
        $("draftQuality").textContent = "";
        currentDraft = null;
        $("draftBox").hidden = false;
      } catch (e) { showError($("actionError"), e.message); }
    });
    $("dashboardBtn").addEventListener("click", function () {
      // Dashboard URL is configured in Supabase; until then open x.com.
      chrome.tabs.create({ url: "https://x.com/home" });
    });
    $("copyDraftBtn").addEventListener("click", async function () {
      if (!currentDraft) return;
      await send({ type: "RS_COPY_DRAFT", draft: currentDraft, postId: currentPostId });
    });
    $("openReplyBtn").addEventListener("click", async function () {
      if (!currentDraft || !currentPostId) return;
      var ok = window.confirm("Open the X reply composer prefilled with this draft?\n\nYou will press Post yourself — nothing auto-posts.");
      if (!ok) return;
      var res = await send({ type: "RS_OPEN_REPLY", draft: currentDraft, postId: currentPostId });
      if (!res.ok) showError($("actionError"), res.error);
    });

    $("pauseBtn").addEventListener("click", async function () {
      await send({ type: "RS_STOP", reason: "Stopped from popup." });
      refresh();
    });
    $("resumeBtn").addEventListener("click", async function () {
      await send({ type: "RS_RESUME" });
      refresh();
    });
  });
})();
