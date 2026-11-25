// RS Creator 1.0 — verify-license Edge Function
// POST { license_key, user_id }
// Validates a license key, activates an unused license for the user,
// and returns { valid, plan, expires_at } or a 4xx error JSON.
// Uses the service-role client (env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
// No secrets are hardcoded in this file. Never log API keys.

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Server misconfigured: missing Supabase env" });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { license_key?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const licenseKey = (body.license_key ?? "").trim();
  const userId = (body.user_id ?? "").trim();
  if (!licenseKey || !userId) {
    return json(400, { error: "license_key and user_id are required" });
  }

  // 1. Look up the license.
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("id, key, plan_id, user_id, type, status, expires_at, device_limit")
    .eq("key", licenseKey)
    .maybeSingle();

  if (licenseError) {
    console.error("verify-license: license lookup failed", licenseError.message);
    return json(500, { error: "License lookup failed" });
  }
  if (!license) {
    return json(404, { valid: false, error: "License key not found" });
  }
  if (license.status === "revoked" || license.status === "suspended") {
    return json(403, { valid: false, error: `License is ${license.status}` });
  }
  if (license.status === "expired") {
    return json(403, { valid: false, error: "License is expired" });
  }
  if (license.expires_at && new Date(license.expires_at) <= new Date()) {
    return json(403, { valid: false, error: "License is expired" });
  }
  if (license.status !== "active" && license.status !== "unused") {
    return json(403, { valid: false, error: `License status '${license.status}' is not usable` });
  }
  if (license.status === "active" && license.user_id && license.user_id !== userId) {
    return json(403, { valid: false, error: "License is already assigned to another user" });
  }

  // 2. Load the plan (for duration + response payload).
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id, name, slug, duration_days, daily_ai_limit, monthly_ai_limit")
    .eq("id", license.plan_id)
    .maybeSingle();
  if (planError) {
    console.error("verify-license: plan lookup failed", planError.message);
    return json(500, { error: "Plan lookup failed" });
  }

  // 3. Activate an unused license: assign user, set status active, and
  //    set expires_at from the plan duration (lifetime / null duration
  //    keeps expires_at null = never expires).
  let expiresAt: string | null = license.expires_at ?? null;
  if (license.status === "unused") {
    if (license.type !== "lifetime" && plan?.duration_days) {
      expiresAt = new Date(
        Date.now() + plan.duration_days * 24 * 60 * 60 * 1000,
      ).toISOString();
    } else {
      expiresAt = null;
    }
    const { error: updateError } = await supabase
      .from("licenses")
      .update({ user_id: userId, status: "active", expires_at: expiresAt })
      .eq("id", license.id);
    if (updateError) {
      console.error("verify-license: activation failed", updateError.message);
      return json(500, { error: "License activation failed" });
    }
  }

  // 4. Link the license + plan to the profile and ensure an active
  //    subscription row exists.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      license_key_id: license.id,
      plan_id: license.plan_id,
      status: "active",
    })
    .eq("id", userId);
  if (profileError) {
    console.error("verify-license: profile update failed", profileError.message);
    // License was activated; profile link failure is reported, not hidden.
    return json(500, { error: "License activated but profile update failed" });
  }

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("license_id", license.id)
    .eq("status", "active")
    .maybeSingle();
  if (!existingSub) {
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: license.plan_id,
      license_id: license.id,
      status: "active",
      started_at: new Date().toISOString(),
      ends_at: expiresAt,
    });
  }

  // 5. Audit trail (best-effort; do not fail the verification on it).
  const audit = {
    admin_id: null,
    action: "license_verified",
    target_user_id: userId,
    target_resource: `licenses:${license.id}`,
    previous_value: { status: license.status },
    new_value: { status: "active", plan_id: license.plan_id, expires_at: expiresAt },
  };
  const { error: auditError } = await supabase.from("admin_audit_logs").insert(audit);
  if (auditError) console.error("verify-license: audit insert failed", auditError.message);

  const { error: activityError } = await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "license_verified",
    resource_type: "license",
    resource_id: license.id,
    details: { plan: plan?.slug ?? null, expires_at: expiresAt },
  });
  if (activityError) console.error("verify-license: activity insert failed", activityError.message);

  return json(200, {
    valid: true,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          daily_ai_limit: plan.daily_ai_limit,
          monthly_ai_limit: plan.monthly_ai_limit,
        }
      : null,
    expires_at: expiresAt,
  });
});
