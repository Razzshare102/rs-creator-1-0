/* RS Creator 1.0 — modules/feed.js
 * Scan visible feed posts, keyword filter (case-insensitive), age filter,
 * dedupe via duplicateDetector, respects scan interval + max posts/session.
 * Scanning only reads the DOM — it never clicks Like/Reply.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.feed = (function () {
  var LAST_SCAN_KEY = "rs_creator_last_scan_at";

  function parsePost(article) {
    if (!article) return null;
    var textEl = article.querySelector('[data-testid="tweetText"]');
    var text = textEl ? textEl.innerText : "";
    var link = article.querySelector('a[href*="/status/"]');
    var id = null;
    if (link) {
      var m = link.getAttribute("href").match(/\/status\/(\d+)/);
      if (m) id = m[1];
    }
    var timeEl = article.querySelector("time");
    var postedAt = timeEl ? timeEl.getAttribute("datetime") : null;
    var authorEl = article.querySelector('[data-testid="User-Name"]');
    var author = authorEl ? authorEl.innerText.split("\n")[0] : "";
    return { id: id, text: text, author: author, postedAt: postedAt };
  }
  function scanVisiblePosts(doc) {
    var root = doc || document;
    var articles = Array.prototype.slice.call(root.querySelectorAll('article[data-testid="tweet"]'));
    return articles.map(parsePost).filter(function (p) { return p && p.id && p.text; });
  }
  function filterPosts(posts, opts) {
    opts = opts || {};
    var keywords = (opts.keywords || []).map(function (k) { return String(k).toLowerCase(); });
    var maxAgeHours = typeof opts.maxAgeHours === "number" ? opts.maxAgeHours : 24;
    var now = Date.now();
    return posts.filter(function (p) {
      if (keywords.length) {
        var hay = (p.text + " " + (p.author || "")).toLowerCase();
        if (!keywords.some(function (k) { return hay.indexOf(k) !== -1; })) return false;
      }
      if (p.postedAt) {
        var ageH = (now - new Date(p.postedAt).getTime()) / 3600000;
        if (ageH > maxAgeHours) return false;
      }
      return true;
    });
  }
  async function scanFeed(opts) {
    opts = opts || {};
    var state = await RSCreator.behaviorController.getState();
    if (state.stopped) return { posts: [], stopped: true, reason: state.stopReason };
    if (state.paused) return { posts: [], paused: true };
    var maxPosts = opts.maxPosts || ((RSCreator.CONFIG.DEFAULTS || {}).maxPostsPerSession || 20);
    var posts = filterPosts(scanVisiblePosts(opts.doc), opts);
    var fresh = [];
    for (var i = 0; i < posts.length && fresh.length < maxPosts; i++) {
      if (await RSCreator.duplicateDetector.hasProcessed(posts[i].id)) continue;
      fresh.push(posts[i]);
    }
    await new Promise(function (resolve) {
      chrome.storage.local.set({ [LAST_SCAN_KEY]: Date.now() }, resolve);
    });
    return { posts: fresh, totalVisible: posts.length };
  }
  return { parsePost: parsePost, scanVisiblePosts: scanVisiblePosts, filterPosts: filterPosts, scanFeed: scanFeed };
})();
