/* RS Creator 1.0 — modules/humanEngine.js
 * Configurable, FIXED delays and reading-time estimation — NOT randomized
 * human-like evasion behaviour. Delays come from settings (min/max) and
 * are applied as a plain, documented pause between steps.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.humanEngine = (function () {
  function defaults() {
    return (RSCreator.CONFIG && RSCreator.CONFIG.DEFAULTS) || {};
  }
  // Plain pause. Uses the configured midpoint unless a specific ms is given.
  function sleep(ms) {
    if (typeof ms !== "number") {
      var d = defaults();
      ms = Math.round(((d.minDelayMs || 1500) + (d.maxDelayMs || 4000)) / 2);
    }
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }
  // Reading time: words / 200 wpm, in milliseconds. Minimum 1s, capped at 30s.
  function readingTimeMs(text) {
    var words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    var wpm = defaults().readingWpm || 200;
    var ms = Math.round((words / wpm) * 60 * 1000);
    return Math.min(30000, Math.max(1000, ms));
  }
  function wordCount(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }
  // Smooth scroll to an element (or absolute Y), then resolve.
  function smoothScrollTo(target) {
    return new Promise(function (resolve) {
      var y = typeof target === "number" ? target : 0;
      if (target && target.getBoundingClientRect) {
        y = window.scrollY + target.getBoundingClientRect().top - 80;
      }
      window.scrollTo({ top: y, behavior: "smooth" });
      setTimeout(resolve, 600);
    });
  }
  // Save / restore scroll position (chrome.storage.local in extension pages,
  // sessionStorage fallback in content scripts).
  var savedY = 0;
  function saveScrollPosition() {
    savedY = window.scrollY || 0;
    try { sessionStorage.setItem("rs_creator_scroll_y", String(savedY)); } catch (e) {}
    return savedY;
  }
  function restoreScrollPosition() {
    var y = savedY;
    try {
      var stored = sessionStorage.getItem("rs_creator_scroll_y");
      if (stored !== null) y = parseInt(stored, 10) || 0;
    } catch (e) {}
    window.scrollTo({ top: y, behavior: "auto" });
    return y;
  }
  return { sleep: sleep, readingTimeMs: readingTimeMs, wordCount: wordCount, smoothScrollTo: smoothScrollTo, saveScrollPosition: saveScrollPosition, restoreScrollPosition: restoreScrollPosition };
})();
