// RS Creator 1.0 — ai-evaluate Edge Function
// POST { post_text, user_id }
// Auth: Authorization Bearer JWT, verified with the anon client getUser().
// Same auth + quota + key-resolution pattern as ai-generate: user's BYOK
// ai_configurations row first, else admin-managed config, else the env
// key (GROQ_API_KEY / OPENROUTER_API_KEY). If none exists -> 402.
// Prompts the model to return STRICT JSON only:
//   { quality_score, relevance_score, sentiment, topic, spam_score,
//     recommendation ('reply'|'like'|'skip'), explanation }
// Parses and returns that JSON; logs usage to usage_logs.
// No secrets are hardcoded. Never log API keys.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EVALUATE_SYSTEM_PROMPT = `You evaluate X (Twitter) posts for a creator assistant.
Return STRICT JSON only — no markdown fences, no extra text — with exactly these fields:
{
  "quality_score": number 0-100,
  "relevance_score": number 0-100,
  "sentiment": "positive" | "neutral" | "negative",
  "topic": string (short topic label, e.g. "crypto", "ai", "general"),
  "spam_score": number 0-100 (higher = more spammy),
  "recommendation": "reply" | "like" | "skip",
  "explanation": string (one or two short sentences)
}
Rules: recommend "skip" when spam_score is high (>= 70) or quality is low (< 30).
Recommend "reply" only when quality_score >= 60 and relevance_score >= 60.
Otherwise recommend "like".`;

type Evaluation = {
  quality_score: number;
  relevance_score: number;
  sentiment: string;
  topic: string;
  spam_score: number;
  recommendation: "reply" | "like" | "skip";
  explanation: string;
};

function parseEvaluation(raw: string): Evaluation | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const quality = num(p.quality_score);
  const relevance = num(p.relevance_score);
  const spam = num(p.spam_score);
  if (quality === null || relevance === null || spam === null) return null;
  if (p.recommendation !== "reply" && p.recommendation !== "like" && p.recommendation !== "skip") {
    return null;
  }
  if (typeof p.sentiment !== "string" || typeof p.topic !== "string" || typeof p.explanation !== "string") {
    return null;
  }
  return {
    quality_score: Math.max(0, Math.min(100, quality)),
    relevance_score: Math.max(0, Math.min(100, relevance)),
    sentiment: p.sentiment,
    topic: p.topic,
    spam_score: Math.max(0, Math.min(100, spam)),
    recommendation: p.recommendation,
    explanation: p.explanation,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Server misconfigured: missing Supabase env" });
  }

  // --- Auth: verify the caller's JWT ---
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing Authorization Bearer token" });
  }
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) {
    return json(401, { error: "Invalid or expired token" });
  }

  let body: { post_text?: string; user_id?: string; provider?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const postText = (body.post_text ?? "").trim();
  if (!postText) return json(400, { error: "post_text is required" });
  if (body.user_id && body.user_id !== user.id) {
    return json(403, { error: "user_id does not match authenticated user" });
  }
  const userId = user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // --- Provider + model: default to the configured default provider ---
  // The caller may pass provider/model, otherwise fall back to the
  // system_settings default_ai_provider / default_groq_model.
  let provider = (body.provider ?? "").toLowerCase();
  if (provider !== "groq" && provider !== "openrouter") {
    const { data: setting } = await adminClient
      .from("system_settings")
      .select("value")
      .eq("key", "default_ai_provider")
      .maybeSingle();
    provider = typeof setting?.value === "string" ? setting.value : "groq";
    if (provider !== "groq" && provider !== "openrouter") provider = "groq";
  }
  let model = (body.model ?? "").trim();

  // --- Daily quota (same pattern as ai-generate) ---
  const { data: profile } = await adminClient
    .from("profiles")
    .select("plan_id")
    .eq("id", userId)
    .maybeSingle();
  let dailyLimit = 10;
  if (profile?.plan_id) {
    const { data: plan } = await adminClient
      .from("subscription_plans")
      .select("daily_ai_limit")
      .eq("id", profile.plan_id)
      .maybeSingle();
    if (plan?.daily_ai_limit != null) dailyLimit = plan.daily_ai_limit;
  }
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: usedToday, error: countError } = await adminClient
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());
  if (countError) {
    console.error("ai-evaluate: quota count failed", countError.message);
    return json(500, { error: "Quota check failed" });
  }
  if ((usedToday ?? 0) >= dailyLimit) {
    return json(429, {
      error: "Daily AI quota reached",
      daily_limit: dailyLimit,
      used_today: usedToday ?? 0,
    });
  }

  // --- Key resolution: BYOK -> admin-managed config -> env fallback ---
  // NOTE: ai_configurations.api_key_encrypted is treated here as the
  // stored key value; real at-rest encryption/decryption belongs in a
  // dedicated secrets layer and is out of scope for this function.
  let apiKey: string | null = null;
  const { data: userConfig } = await adminClient
    .from("ai_configurations")
    .select("model, api_key_encrypted, is_active")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();
  if (userConfig?.api_key_encrypted) {
    apiKey = userConfig.api_key_encrypted;
    if (!model && userConfig.model) model = userConfig.model;
  } else {
    const { data: adminConfig } = await adminClient
      .from("ai_configurations")
      .select("model, api_key_encrypted, is_active")
      .is("user_id", null)
      .eq("provider", provider)
      .eq("is_admin_managed", true)
      .eq("is_active", true)
      .maybeSingle();
    if (adminConfig?.api_key_encrypted) {
      apiKey = adminConfig.api_key_encrypted;
      if (!model && adminConfig.model) model = adminConfig.model;
    }
  }
  if (!apiKey) {
    apiKey = provider === "groq"
      ? (Deno.env.get("GROQ_API_KEY") ?? null)
      : (Deno.env.get("OPENROUTER_API_KEY") ?? null);
  }
  if (!apiKey) {
    return json(402, { error: "no AI key configured" });
  }
  if (!model) {
    if (provider === "groq") {
      const { data: setting } = await adminClient
        .from("system_settings")
        .select("value")
        .eq("key", "default_groq_model")
        .maybeSingle();
      model = typeof setting?.value === "string" ? setting.value : "openai/gpt-oss-20b";
    } else {
      const { data: setting } = await adminClient
        .from("system_settings")
        .select("value")
        .eq("key", "default_openrouter_model")
        .maybeSingle();
      model = typeof setting?.value === "string" ? setting.value : "";
    }
  }
  if (!model) {
    return json(400, { error: `No model configured for provider '${provider}'` });
  }

  // --- Call the provider ---
  const endpoint = provider === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  let providerRes: Response;
  try {
    providerRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider === "openrouter"
          ? { "HTTP-Referer": "https://rs-creator.app", "X-Title": "RS Creator 1.0" }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EVALUATE_SYSTEM_PROMPT },
          { role: "user", content: postText },
        ],
        temperature: 0.2,
      }),
    });
  } catch (err) {
    console.error("ai-evaluate: provider request failed", (err as Error).message);
    return json(502, { error: "AI provider request failed" });
  }
  if (!providerRes.ok) {
    const errText = await providerRes.text().catch(() => "");
    console.error("ai-evaluate: provider error", providerRes.status, errText.slice(0, 500));
    return json(502, { error: `AI provider returned ${providerRes.status}` });
  }
  const providerJson = await providerRes.json();
  const rawText: string = providerJson?.choices?.[0]?.message?.content ?? "";
  const usage = providerJson?.usage ?? {};
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;

  const evaluation = parseEvaluation(rawText);
  if (!evaluation) {
    console.error("ai-evaluate: could not parse model JSON", rawText.slice(0, 500));
    return json(502, { error: "AI provider did not return valid evaluation JSON" });
  }

  // --- Log usage (best-effort) ---
  const { error: logError } = await adminClient.from("usage_logs").insert({
    user_id: userId,
    provider,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    estimated_cost: 0,
    endpoint: "ai-evaluate",
  });
  if (logError) console.error("ai-evaluate: usage log failed", logError.message);

  return json(200, {
    ...evaluation,
    provider,
    model,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
  });
});
