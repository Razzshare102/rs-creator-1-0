/* RS Creator 1.0 — modules/qualityChecker.js
 * Checks a generated reply: char limit, banned words, hashtag count,
 * link presence, generic-phrase filter.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.qualityChecker = (function () {
  var BANNED_WORDS = ["guaranteed profit", "100x", "free money", "click here", "dm me for signals"];
  var GENERIC_PHRASES = ["great post!", "nice!", "amazing post", "totally agree", "love this!"];
  var MAX_CHARS = 280;

  function checkReply(text, opts) {
    opts = opts || {};
    var issues = [];
    var t = String(text || "");
    if (!t.trim()) issues.push("empty");
    if (t.length > MAX_CHARS) issues.push("too_long:" + t.length + ">" + MAX_CHARS);
    var lower = t.toLowerCase();
    BANNED_WORDS.forEach(function (w) { if (lower.indexOf(w) !== -1) issues.push("banned_word:" + w); });
    GENERIC_PHRASES.forEach(function (p) { if (lower.trim() === p || lower.indexOf(p) !== -1 && t.length < 30) issues.push("generic_phrase:" + p); });
    var hashtags = (t.match(/#\w+/g) || []).length;
    var maxHashtags = typeof opts.maxHashtags === "number" ? opts.maxHashtags : 2;
    if (hashtags > maxHashtags) issues.push("too_many_hashtags:" + hashtags + ">" + maxHashtags);
    var hasLink = /https?:\/\/\S+/.test(t);
    if (hasLink && opts.allowLinks === false) issues.push("link_not_allowed");
    return {
      ok: issues.length === 0,
      issues: issues,
      charCount: t.length,
      hashtagCount: hashtags,
      hasLink: hasLink
    };
  }
  return { checkReply: checkReply, BANNED_WORDS: BANNED_WORDS, GENERIC_PHRASES: GENERIC_PHRASES, MAX_CHARS: MAX_CHARS };
})();
