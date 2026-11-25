import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { NotConnected } from './AdminOverview';
import type { ActivityItem } from '../../lib/types';

export default function ActivityLogs() {
  const { configured } = useAuth();
  const [rows, setRows] = useState<ActivityItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    supabase.from('activity_logs').select('id, user_id, action, resource_type, resource_id, details, created_at').order('created_at', { ascending: false }).limit(100).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (data) setRows(data as ActivityItem[]);
    });
  }, [configured]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
      {!configured ? <NotConnected what="Activity log entries" /> : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {configured && rows.length === 0 && !error ? <p className="mt-4 text-sm text-slate-500">No activity logged yet.</p> : null}
      {rows.length > 0 ? (
        <table className="mt-4 w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-2">When</th><th>Resource</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-800 text-white"><td className="py-2">{r.created_at}</td><td>{r.resource_type ?? '—'}</td><td>{r.action}</td><td className="text-slate-400">{r.details ? JSON.stringify(r.details) : '—'}</td></tr>)}</tbody></table>
      ) : null}
    </div>
  );
}
