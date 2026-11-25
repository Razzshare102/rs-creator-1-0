import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';

interface Row { id: string; user_id: string; provider: string; model: string; input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost: number; created_at: string }

export default function ApiUsage() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    supabase.from('usage_logs').select('id, user_id, provider, model, input_tokens, output_tokens, total_tokens, estimated_cost, created_at').order('created_at', { ascending: false }).limit(100).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as Row[]);
    });
  }, [configured]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">API Usage</h1>
      {!configured ? <NotConnected what="API usage records" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {configured && rows.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">No API usage recorded yet.</p> : null}
      {rows.length > 0 ? (
        <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-2">When</th><th>Provider</th><th>Model</th><th>Tokens</th><th>Est. cost</th><th>User</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-800 text-white"><td className="py-2">{r.created_at}</td><td>{r.provider}</td><td>{r.model}</td><td>{r.total_tokens} ({r.input_tokens} in / {r.output_tokens} out)</td><td>${r.estimated_cost}</td><td className="text-slate-400 break-all">{r.user_id}</td></tr>)}</tbody></table>
      ) : null}
    </div>
  );
}
