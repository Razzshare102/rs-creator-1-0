import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ActivityItem } from '../lib/types';

// Local demo data, clearly labelled — real rows come from the
// user-isolated activity table once the backend is connected.
const DEMO: ActivityItem[] = [];

export default function ActivityHistory() {
  const { configured } = useAuth();
  const [filter, setFilter] = useState('');
  const [module, setModule] = useState('all');
  const rows = DEMO.filter(
    (r) => (module === 'all' || r.resource_type === module) && (filter === '' || r.action.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Activity History — Module G</h1>
      <p className="text-slate-400 mt-1 text-sm">Activity is user-isolated: you only ever see your own rows (enforced by RLS on the server).</p>
      {!configured ? <p className="mt-4 rounded-lg bg-amber-900/40 border border-amber-700 px-3 py-2 text-sm text-amber-200">Backend not connected — showing an empty local demo table, not server data.</p> : null}
      <div className="mt-4 flex gap-2">
        <input className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" placeholder="Filter by action…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={module} onChange={(e) => setModule(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white">
          <option value="all">All modules</option>
          <option value="reply">Reply Generator</option>
          <option value="evaluator">Post Evaluator</option>
          <option value="feed">Feed Assistant</option>
          <option value="monitor">Account Monitor</option>
          <option value="queue">Link Queue</option>
          <option value="content">Content Creator</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No activity yet.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead><tr className="text-left text-slate-400"><th className="py-2">When</th><th>Module</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 text-white">
                <td className="py-2">{r.created_at}</td><td>{r.resource_type ?? '—'}</td><td>{r.action}</td><td className="text-slate-400">{r.details ? JSON.stringify(r.details) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
