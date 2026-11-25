// RS Creator 1.0 — ai-generate Edge Function
// POST { prompt, provider ('groq'|'openrouter'), model, style, user_id }
// Auth: Authorization Bearer JWT, verified with the anon client getUser().
// Key resolution: user's own BYOK ai_configurations row first, else the
// admin-managed ai_configurations row (user_id null), else the env key
// (GROQ_API_KEY / OPENROUTER_API_KEY). If none exists -> 402 "no AI key configured".
// Daily quota comes from the user's subscription_plans row, counted
// against usage_logs rows created today. Usage is logged after the call.
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

const PROVIDER_URLS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

const DEFAULT_MODELS: Record<string, string> = {
  groq: "openai/gpt-oss-20b",
  openrouter: "",
};

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

  let body: {
    prompt?: string;
    provider?: string;
    model?: string;
    style?: string;
    user_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return json(400, { error: "prompt is required" });
  const provider = (body.provider ?? "groq").toLowerCase();
  if (provider !== "groq" && provider !== "openrouter") {
    return json(400, { error: "provider must be 'groq' or 'openrouter'" });
  }
  // The JWT subject is authoritative; a user_id in the body must match it.
  if (body.user_id && body.user_id !== user.id) {
    return json(403, { error: "user_id does not match authenticated user" });
  }
  const userId = user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // --- Daily quota: plan limit vs usage_logs rows today (UTC) ---
  const { data: profile } = await adminClient
    .from("profiles")
    .select("plan_id")
    .eq("id", userId)
    .maybeSingle();
  let dailyLimit = 10; // Free-plan default
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
    console.error("ai-generate: quota count failed", countError.message);
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
  let model = (body.model ?? "").trim() || DEFAULT_MODELS[provider];
  const { data: userConfig } = await adminClient
    .from("ai_configurations")
    .select("model, api_key_encrypted, is_active")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .maybeSingle();
  if (userConfig?.api_key_encrypted) {
    apiKey = userConfig.api_key_encrypted;
    if (userConfig.model) model = userConfig.model;
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
      if (adminConfig.model) model = adminConfig.model;
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
    return json(400, { error: `No model configured for provider '${provider}'` });
  }

  // --- Call the provider (OpenAI-compatible chat completions) ---
  const style = (body.style ?? "").trim();
  const systemPrompt = style
    ? `You are RS Creator, an AI assistant for X (Twitter) creators. Write in this style: ${style}.`
    : "You are RS Creator, an AI assistant for X (Twitter) creators. Write concise, engaging posts.";
  const endpoint = PROVIDER_URLS[provider];

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
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (err) {
    console.error("ai-generate: provider request failed", (err as Error).message);
    return json(502, { error: "AI provider request failed" });
  }
  if (!providerRes.ok) {
    const errText = await providerRes.text().catch(() => "");
    console.error("ai-generate: provider error", providerRes.status, errText.slice(0, 500));
    return json(502, { error: `AI provider returned ${providerRes.status}` });
  }
  const providerJson = await providerRes.json();
  const text: string = providerJson?.choices?.[0]?.message?.content ?? "";
  const usage = providerJson?.usage ?? {};
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;

  // --- Log usage + content history (best-effort) ---
  const { error: logError } = await adminClient.from("usage_logs").insert({
    user_id: userId,
    provider,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    estimated_cost: 0,
    endpoint: "ai-generate",
  });
  if (logError) console.error("ai-generate: usage log failed", logError.message);

  const { error: historyError } = await adminClient.from("content_history").insert({
    user_id: userId,
    kind: "generate",
    prompt,
    output: text,
    provider,
    model,
  });
  if (historyError) console.error("ai-generate: history insert failed", historyError.message);

  return json(200, {
    text,
    provider,
    model,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
  });
});
