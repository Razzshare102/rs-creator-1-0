/* RS Creator 1.0 — modules/replyGenerator.js
 * Calls the ai-generate Edge Function with style/length/emoji options,
 * then validates the result with qualityChecker before returning it.
 * Returns a DRAFT only — never posts.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.replyGenerator = (function () {
  async function generateReply(post, opts) {
    opts = opts || {};
    if (!post || !post.text) throw new Error("A post with text is required to generate a reply.");
    var fn = (RSCreator.CONFIG.EDGE_FUNCTIONS || {}).AI_GENERATE || "ai-generate";
    var token = await RSCreator.auth.getAccessToken();
    var allowed = await RSCreator.apiUsage.checkQuota();
    if (!allowed.ok) throw new Error("Daily AI quota reached (" + allowed.used + "/" + allowed.quota + ").");
    var payload = {
      post_id: post.id || null, author: post.author || null, text: post.text,
      style: opts.style || "engaging", length: opts.length || "short",
      allowEmoji: opts.allowEmoji !== false, maxHashtags: opts.maxHashtags || 0
    };
    var data = await RSCreator.supabase.invokeFunction(fn, payload, token);
    await RSCreator.apiUsage.recordRequest(1);
    var draft = data.reply || data.text || data.draft || "";
    var check = RSCreator.qualityChecker.checkReply(draft, opts);
    return { draft: draft, postId: post.id || null, quality: check, raw: data };
  }
  return { generateReply: generateReply };
})();
