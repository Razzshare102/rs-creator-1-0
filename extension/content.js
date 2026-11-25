/* RS Creator 1.0 — content.js (runs on x.com / twitter.com)
 * Extracts visible post text / author / post-id from the DOM, injects
 * small "RS Creator" action buttons (Reply with AI, Evaluate) on posts —
 * only when the user is logged in and the workflow is enabled.
 * NEVER auto-clicks Like / Reply, and never auto-submits anything.
 * Watches page text for captcha / warning signals and reports them to
 * the background worker, which stops the workflow.
 */
(function () {
  "use strict";
  var BUTTON_CLASS = "rs-creator-btn";
  var BLOCK_WORDS = ["captcha", "rate limit", "unusual activity", "suspended", "verify your identity", "temporarily restricted"];
  var enabled = false;
  var loggedIn = false;

  function extractPost(article) {
    if (!article) return null;
    var textEl = article.querySelector('[data-testid="tweetText"]');
    var text = textEl ? textEl.innerText : "";
    var link = article.querySelector('a[href*="/status/"]');
    var id = null;
    if (link) {
      var m = link.getAttribute("href").match(/\/status\/(\d+)/);
      if (m) id = m[1];
    }
    if (!id || !text) return null;
    var timeEl = article.querySelector("time");
    var authorEl = article.querySelector('[data-testid="User-Name"]');
    return {
      id: id,
      text: text,
      author: authorEl ? authorEl.innerText.split("\n")[0] : "",
      postedAt: timeEl ? timeEl.getAttribute("datetime") : null,
      url: "https://x.com/i/status/" + id
    };
  }

  function visiblePosts() {
    var articles = Array.prototype.slice.call(document.querySelectorAll('article[data-testid="tweet"]'));
    return articles.map(extractPost).filter(Boolean);
  }

  function refreshState() {
    try {
      chrome.runtime.sendMessage({ type: "RS_GET_STATUS" }, function (res) {
        if (!res || res.ok === false) return;
        loggedIn = Boolean(res.loggedIn);
        var wf = res.workflow || {};
        enabled = loggedIn && !wf.paused && !wf.stopped;
        if (enabled) injectButtons();
        else removeButtons();
      });
    } catch (e) { /* extension context invalidated */ }
  }

  function makeButton(label, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = BUTTON_CLASS;
    btn.textContent = label;
    btn.style.cssText = "margin-left:8px;padding:2px 8px;border-radius:9999px;border:1px solid #6366f1;background:#1e1b4b;color:#a5b4fc;font-size:12px;cursor:pointer;";
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      onClick(btn);
    });
    return btn;
  }

  function injectButtons() {
    var articles = document.querySelectorAll('article[data-testid="tweet"]');
    articles.forEach(function (article) {
      if (article.querySelector("." + BUTTON_CLASS)) return;
      var post = extractPost(article);
      if (!post) return;
      var actionBar = article.querySelector('[role="group"]');
      if (!actionBar) return;
      var replyBtn = makeButton("RS Reply with AI", function (btn) {
        btn.textContent = "Generating…";
        chrome.runtime.sendMessage({ type: "RS_GENERATE_REPLY", post: post, options: {} }, function (res) {
          btn.textContent = "RS Reply with AI";
          if (!res || res.ok === false) { alert("RS Creator: " + ((res && res.error) || "failed to generate reply.")); return; }
          var draft = res.draft || "";
          var ok = window.confirm("RS Creator draft reply:\n\n" + draft + "\n\nCopy it to the clipboard?");
          if (ok) chrome.runtime.sendMessage({ type: "RS_COPY_DRAFT", draft: draft, postId: post.id });
        });
      });
      var evalBtn = makeButton("RS Evaluate", function (btn) {
        btn.textContent = "Evaluating…";
        chrome.runtime.sendMessage({ type: "RS_EVALUATE_POST", post: post, options: {} }, function (res) {
          btn.textContent = "RS Evaluate";
          if (!res || res.ok === false) { alert("RS Creator: " + ((res && res.error) || "failed to evaluate.")); return; }
          var ev = res.evaluation || {};
          alert("RS Creator evaluation:\nScore: " + (ev.score !== null && ev.score !== undefined ? ev.score : "n/a") +
            "\nRecommendation: " + (ev.recommendation || "n/a") +
            "\nSuggested action: " + (ev.suggestedAction || "none"));
        });
      });
      actionBar.appendChild(replyBtn);
      actionBar.appendChild(evalBtn);
    });
  }

  function removeButtons() {
    document.querySelectorAll("." + BUTTON_CLASS).forEach(function (b) { b.remove(); });
  }

  function checkForBlocks() {
    var text = "";
    try { text = document.body ? document.body.innerText || "" : ""; } catch (e) {}
    var lower = text.toLowerCase();
    for (var i = 0; i < BLOCK_WORDS.length; i++) {
      if (lower.indexOf(BLOCK_WORDS[i]) !== -1) {
        try {
          chrome.runtime.sendMessage({ type: "RS_CONTENT_BLOCK_DETECTED", signal: BLOCK_WORDS[i] });
        } catch (e) {}
        return BLOCK_WORDS[i];
      }
    }
    return null;
  }

  // Messages from background.js / popup (via background).
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || !msg.type) return;
    if (msg.type === "RS_GET_VISIBLE_POSTS") {
      sendResponse({ posts: visiblePosts() });
    } else if (msg.type === "RS_GET_POST") {
      var found = visiblePosts().find(function (p) { return String(p.id) === String(msg.postId); });
      sendResponse({ post: found || null });
    } else if (msg.type === "RS_COPY_TEXT") {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg.text || "").then(function () { sendResponse({ ok: true }); });
          return true;
        }
      } catch (e) {}
      sendResponse({ ok: false });
    }
  });

  // Re-inject on feed scroll / navigation (X is a SPA).
  var observer = new MutationObserver(function () {
    if (enabled) injectButtons();
    checkForBlocks();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  refreshState();
  setInterval(refreshState, 30000);
  checkForBlocks();
})();
