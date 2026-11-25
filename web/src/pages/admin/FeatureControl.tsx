import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';

const MODULES = ['reply-generator', 'post-evaluator', 'feed-assistant', 'account-monitor', 'link-queue', 'content-creator'] as const;

export default function FeatureControl() {
  const { configured } = useAuth();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Global defaults live in feature_permissions with user_id = NULL.
  // (Postgres treats NULLs as distinct in unique constraints, so upsert
  // on the composite key cannot match NULL rows — select-then-update/insert.)
  useEffect(() => {
    if (!configured) return;
    supabase.from('feature_permissions').select('feature_key, enabled').is('user_id', null).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) {
        const map: Record<string, boolean> = {};
        for (const row of data as { feature_key: string; enabled: boolean }[]) map[row.feature_key] = row.enabled;
        setToggles(map);
      }
    });
  }, [configured]);

  async function setToggle(module: string, enabled: boolean) {
    setToggles({ ...toggles, [module]: enabled });
    if (!configured) return;
    const { data: existing } = await supabase
      .from('feature_permissions')
      .select('id')
      .is('user_id', null)
      .eq('feature_key', module)
      .maybeSingle();
    const { error: err } = existing
      ? await supabase.from('feature_permissions').update({ enabled }).eq('id', (existing as { id: string }).id)
      : await supabase.from('feature_permissions').insert({ user_id: null, feature_key: module, enabled });
    if (err) setError(err.message);
    else setMsg(`${module} ${enabled ? 'enabled' : 'disabled'} globally.`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Feature Control</h1>
      <p className="text-slate-400 mt-1 text-sm">Global module toggles — disabling a module hides it for all users.</p>
      {!configured ? <NotConnected what="Feature flags" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {msg ? <p className="mt-2 text-sm text-emerald-300">{msg}</p> : null}
      <div className="mt-4 grid gap-3">
        {MODULES.map((m) => (
          <label key={m} className="flex items-center justify-between rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white">
            <span className="capitalize">{m.replace('-', ' ')}</span>
            <input type="checkbox" checked={toggles[m] ?? true} onChange={(e) => void setToggle(m, e.target.checked)} />
          </label>
        ))}
      </div>
    </div>
  );
}
