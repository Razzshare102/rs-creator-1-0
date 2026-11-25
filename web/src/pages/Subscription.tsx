import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlan } from '../lib/types';

export default function Subscription() {
  const { profile, configured } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!configured) return;
    supabase
      .from('subscription_plans')
      .select('id, name, slug, price, currency, duration_days, features, daily_ai_limit, monthly_ai_limit, is_active')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setPlans(data as SubscriptionPlan[]);
        setLoaded(true);
      });
  }, [configured]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Subscription</h1>
      <p className="text-slate-400 mt-1 text-sm">Current plan: <span className="text-white">{profile?.plan ?? 'free'}</span> · License: {profile?.license_status ?? 'not_configured'}</p>
      <p className="text-slate-500 mt-1 text-xs">Prices come from the subscription_plans table — they are never hardcoded in this app.</p>
      {!configured || !loaded ? (
        <p className="mt-4 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-300">
          {configured ? 'Loading plans…' : 'Backend not connected — plans are configured in admin once Supabase is connected.'}
        </p>
      ) : plans.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No plans published yet — configure them in Admin → Subscription Plans.</p>
      ) : (
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <h2 className="font-semibold text-white">{p.name}</h2>
              <p className="text-2xl font-bold text-white mt-1">{p.currency} {p.price}<span className="text-sm font-normal text-slate-400">{p.duration_days ? ` / ${p.duration_days} days` : ' — lifetime'}</span></p>
              <ul className="mt-2 text-sm text-slate-400 list-disc list-inside">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
