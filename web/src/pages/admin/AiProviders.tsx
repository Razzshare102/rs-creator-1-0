import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';

interface Row { id: string; provider: string; model: string; is_active: boolean; is_admin_managed: boolean }

export default function AiProviders() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    supabase.from('ai_configurations').select('id, provider, model, is_active, is_admin_managed').eq('is_admin_managed', true).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as Row[]);
    });
  }, [configured]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">AI Providers</h1>
      <p className="text-slate-400 mt-1 text-sm">Groq and OpenRouter providers, models, and defaults. Admin-managed keys live server-side — never in this app.</p>
      {!configured ? <NotConnected what="Provider list" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {configured && rows.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">No providers configured yet.</p> : null}
      {rows.length > 0 ? (
        <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-2">Provider</th><th>Model</th><th>Active</th><th>Admin-managed</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-800 text-white"><td className="py-2">{r.provider}</td><td>{r.model}</td><td>{r.is_active ? 'Yes' : 'No'}</td><td>{r.is_admin_managed ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
      ) : null}
    </div>
  );
}
