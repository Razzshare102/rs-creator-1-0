export type Plan = 'free' | 'basic' | 'pro' | 'premium' | 'lifetime';

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'unused' | 'not_configured' | 'pending' | 'suspended' | 'banned';

export interface ActivityItem {
  id: string;
  user_id: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface QueueItem {
  id: string;
  url: string;
  post_id: string;
  status: 'Pending' | 'Processing' | 'Draft Ready' | 'Approved' | 'Completed' | 'Skipped' | 'Failed';
  created_at: string;
}

export interface MonitoredAccount {
  id: string;
  username: string;
  replies_generated: number;
  last_checked_at?: string | null;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  duration_days: number | null;
  features: string[];
  daily_ai_limit: number;
  monthly_ai_limit: number;
  is_active: boolean;
}

export interface LicenseRecord {
  id: string;
  key: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'custom';
  status: 'unused' | 'active' | 'expired' | 'suspended' | 'revoked';
  plan_id?: string | null;
  user_id?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface AiGenerateRequest {
  prompt: string;
  provider: 'groq' | 'openrouter';
  model: string;
  style: string;
}

export interface AiGenerateResponse {
  text: string;
  model: string;
  provider: string;
}

export interface AiEvaluateResponse {
  quality: number;
  relevance: number;
  sentiment: string;
  topic: string;
  spam_score: number;
  recommendation: 'Reply' | 'Like' | 'Skip';
  explanation: string;
}

export const REPLY_STYLES = [
  'Natural',
  'Analytical',
  'Professional',
  'Casual',
  'Curious',
  'Supportive',
  'Educational',
  'Crypto Native',
] as const;

export type ReplyStyle = (typeof REPLY_STYLES)[number];
