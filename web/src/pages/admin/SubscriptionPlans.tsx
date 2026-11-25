import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';
import type { SubscriptionPlan } from '../../lib/types';

export default function SubscriptionPlans() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    supabase.from('subscription_plans').select('id, name, slug, price, currency, duration_days, features, daily_ai_limit, monthly_ai_limit, is_active').then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as SubscriptionPlan[]);
    });
  }, [configured]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
      <p className="text-slate-400 mt-1 text-sm">Prices live in the subscription_plans table — the storefront never hardcodes them.</p>
      {!configured ? <NotConnected what="Plan list" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {configured && rows.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">No plans yet — add them in Supabase (subscription_plans table).</p> : null}
      {rows.length > 0 ? (
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <h2 className="font-semibold text-white">{p.name}</h2>
              <p className="text-xl font-bold text-white mt-1">{p.currency} {p.price}{p.duration_days ? ` / ${p.duration_days} days` : ' — lifetime'}</p>
              <p className="text-sm text-slate-400 mt-1">{p.is_active ? 'Active' : 'Inactive'} · {p.daily_ai_limit} AI/day · {p.monthly_ai_limit} AI/month</p>
              <ul className="mt-2 text-sm text-slate-400 list-disc list-inside">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
