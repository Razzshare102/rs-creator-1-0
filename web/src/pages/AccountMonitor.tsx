import { useState } from 'react';
import type { MonitoredAccount } from '../lib/types';

export default function AccountMonitor() {
  const [username, setUsername] = useState('');
  const [accounts, setAccounts] = useState<MonitoredAccount[]>([]);

  function addAccount() {
    const name = username.trim().replace(/^@/, '');
    if (!name) return;
    if (accounts.some((a) => a.username.toLowerCase() === name.toLowerCase())) return;
    setAccounts([
      ...accounts,
      { id: crypto.randomUUID(), username: name, replies_generated: 0, last_checked_at: null, created_at: new Date().toISOString() },
    ]);
    setUsername('');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Account Monitor — Module D</h1>
      <p className="text-slate-400 mt-1 text-sm">Note: no replies are sent to historical posts when an account is first added — monitoring starts from new posts only. Duplicate usernames are ignored.</p>
      <div className="mt-4 flex gap-2">
        <input className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white" placeholder="X username (without @)" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addAccount(); }} />
        <button onClick={addAccount} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Add account</button>
      </div>
      {accounts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No monitored accounts yet. Local demo list — saved to the backend once connected.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead><tr className="text-left text-slate-400"><th className="py-2">Username</th><th>Replies</th><th>Last checked</th><th></th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-slate-800 text-white">
                <td className="py-2">@{a.username}</td>
                <td>{a.replies_generated}</td>
                <td className="text-slate-400">{a.last_checked_at ?? '—'}</td>
                <td><button onClick={() => setAccounts(accounts.filter((x) => x.id !== a.id))} className="text-red-400">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
