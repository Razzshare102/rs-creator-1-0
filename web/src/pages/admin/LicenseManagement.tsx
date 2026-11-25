import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';
import type { LicenseRecord } from '../../lib/types';

type LicenseType = LicenseRecord['type'];

function randomKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'RS-';
  for (let i = 0; i < 16; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7 || i === 11) out += '-';
  }
  return out;
}

export default function LicenseManagement() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<LicenseRecord[]>([]);
  const [type, setType] = useState<LicenseType>('monthly');
  const [count, setCount] = useState(1);
  const [generated, setGenerated] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!configured) return;
    supabase.from('licenses').select('id, key, type, status, plan_id, user_id, expires_at, created_at').then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as LicenseRecord[]);
    });
  }, [configured]);

  async function generate() {
    setError(''); setMsg('');
    const keys = Array.from({ length: Math.max(1, Math.min(100, count)) }, () => randomKey());
    setGenerated(keys);
    if (!configured) {
      setMsg('Backend not connected — keys shown above are local only and were NOT saved. Connect Supabase to persist them.');
      return;
    }
    const { error: err } = await supabase.from('licenses').insert(keys.map((k) => ({ key: k, type, status: 'unused' })));
    if (err) setError(err.message);
    else setMsg(`${keys.length} license key(s) generated and saved.`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">License Management</h1>
      {!configured ? <NotConnected what="License list" /> : null}
      <div className="mt-4 rounded-xl bg-slate-800 border border-slate-700 p-4 flex flex-wrap gap-2 items-end">
        <label className="text-sm text-slate-300">License type
          <select value={type} onChange={(e) => setType(e.target.value as LicenseType)} className="block mt-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white">
            <option value="monthly">monthly</option><option value="quarterly">quarterly</option><option value="yearly">yearly</option><option value="lifetime">lifetime</option><option value="custom">custom</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">Bulk count
          <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="block mt-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
        </label>
        <button onClick={() => void generate()} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Generate key(s)</button>
      </div>
      {msg ? <p className="mt-3 text-sm text-emerald-300">{msg}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      {generated.length > 0 ? <ul className="mt-3 text-sm text-white font-mono">{generated.map((k) => <li key={k}>{k}</li>)}</ul> : null}
      {rows.length === 0 && configured && !error ? <p className="mt-4 text-sm text-slate-500">No licenses found.</p> : null}
      {rows.length > 0 ? (
        <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-2">Key</th><th>Type</th><th>Status</th><th>Assigned to</th><th>Expires</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-800 text-white"><td className="py-2 font-mono">{r.key}</td><td>{r.type}</td><td>{r.status}</td><td className="text-slate-400 break-all">{r.user_id ?? '—'}</td><td className="text-slate-400">{r.expires_at ?? '—'}</td></tr>)}</tbody></table>
      ) : null}
    </div>
  );
}
