import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';

interface Row { id: string; admin_id: string; action: string; target_user_id: string | null; target_resource: string | null; created_at: string }

export default function AuditLogs() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    supabase.from('admin_audit_logs').select('id, admin_id, action, target_user_id, target_resource, created_at').order('created_at', { ascending: false }).limit(100).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as Row[]);
    });
  }, [configured]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
      {!configured ? <NotConnected what="Audit log entries" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {configured && rows.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">No audit entries yet.</p> : null}
      {rows.length > 0 ? (
        <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-2">When</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-800 text-white"><td className="py-2">{r.created_at}</td><td className="break-all">{r.admin_id}</td><td>{r.action}</td><td className="text-slate-400">{r.target_resource ?? r.target_user_id ?? '—'}</td></tr>)}</tbody></table>
      ) : null}
    </div>
  );
}
