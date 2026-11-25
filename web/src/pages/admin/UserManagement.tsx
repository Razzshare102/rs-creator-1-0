import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';

interface Row { id: string; email: string; username: string | null; status: string; plan_id: string | null; created_at: string }

export default function UserManagement() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    supabase.from('profiles').select('id, email, username, status, plan_id, created_at').then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as Row[]);
    });
  }, [configured]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">User Management</h1>
      {!configured ? <NotConnected what="User list" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {configured && rows.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">No users found.</p> : null}
      {rows.length > 0 ? (
        <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-2">Email</th><th>Username</th><th>Status</th><th>Plan ID</th><th>Created</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-800 text-white"><td className="py-2">{r.email}</td><td>{r.username ?? '—'}</td><td>{r.status}</td><td className="text-slate-400 break-all">{r.plan_id ?? '—'}</td><td className="text-slate-400">{r.created_at}</td></tr>)}</tbody></table>
      ) : null}
    </div>
  );
}
