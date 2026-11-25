/* RS Creator 1.0 — modules/aiAnalyzer.js
 * Calls the ai-evaluate Edge Function and returns a recommendation object.
 * No API key here — the Edge Function holds the provider key server-side.
 */
var RSCreator = globalThis.RSCreator || (globalThis.RSCreator = {});

RSCreator.aiAnalyzer = (function () {
  async function evaluatePost(post, opts) {
    opts = opts || {};
    if (!post || !post.text) throw new Error("A post with text is required to evaluate.");
    var fn = (RSCreator.CONFIG.EDGE_FUNCTIONS || {}).AI_EVALUATE || "ai-evaluate";
    var token = await RSCreator.auth.getAccessToken();
    var allowed = await RSCreator.apiUsage.checkQuota();
    if (!allowed.ok) throw new Error("Daily AI quota reached (" + allowed.used + "/" + allowed.quota + ").");
    var data = await RSCreator.supabase.invokeFunction(fn, {
      post_id: post.id || null, author: post.author || null, text: post.text, options: opts
    }, token);
    await RSCreator.apiUsage.recordRequest(1);
    // Normalised recommendation object.
    return {
      postId: post.id || null,
      score: typeof data.score === "number" ? data.score : null,
      recommendation: data.recommendation || data.verdict || "neutral",
      reasons: Array.isArray(data.reasons) ? data.reasons : [],
      suggestedAction: data.suggested_action || data.suggestedAction || "none",
      raw: data
    };
  }
  return { evaluatePost: evaluatePost };
})();
