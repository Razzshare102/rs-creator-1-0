import { supabase, isSupabaseConfigured, getSupabaseUrl } from './supabase';
import type { AiEvaluateResponse, AiGenerateRequest, AiGenerateResponse, LicenseStatus } from './types';

export interface VerifyLicenseResult {
  valid: boolean;
  status: LicenseStatus;
  plan?: string;
  expires_at?: string | null;
  message?: string;
}

async function callEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('You must be signed in to use this feature.');
  }
  const url = `${getSupabaseUrl()}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Edge function ${name} failed with status ${res.status}.`);
  }
  return (await res.json()) as T;
}

export async function verifyLicense(licenseKey: string): Promise<VerifyLicenseResult> {
  return callEdgeFunction<VerifyLicenseResult>('verify-license', { licenseKey });
}

export async function aiGenerate(req: AiGenerateRequest): Promise<AiGenerateResponse> {
  return callEdgeFunction<AiGenerateResponse>('ai-generate', { ...req });
}

export async function aiEvaluate(postText: string): Promise<AiEvaluateResponse> {
  // Edge function returns { quality_score, relevance_score, sentiment, topic,
  // spam_score, recommendation: 'reply'|'like'|'skip', explanation } — normalise
  // to the UI shape (quality/relevance, capitalised recommendation).
  const raw = await callEdgeFunction<{
    quality_score: number;
    relevance_score: number;
    sentiment: string;
    topic: string;
    spam_score: number;
    recommendation: 'reply' | 'like' | 'skip';
    explanation: string;
  }>('ai-evaluate', { postText });
  const cap = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)) as 'Reply' | 'Like' | 'Skip';
  return {
    quality: raw.quality_score,
    relevance: raw.relevance_score,
    sentiment: raw.sentiment,
    topic: raw.topic,
    spam_score: raw.spam_score,
    recommendation: cap(raw.recommendation),
    explanation: raw.explanation,
  };
}

export async function testAiConnection(provider: 'groq' | 'openrouter'): Promise<{ ok: boolean; message: string }> {
  // No dedicated test endpoint exists; probe via ai-generate with a minimal
  // prompt. This consumes one AI request against the caller's quota.
  const res = await aiGenerate({ prompt: 'Reply with the single word OK.', provider, model: '', style: 'Natural' });
  return { ok: true, message: `Connected via ${res.provider} (${res.model}). Probe reply: ${res.text}` };
}
