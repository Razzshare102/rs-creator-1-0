import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OWNER_EMAIL } from '../../lib/constants';
import { NotConnected } from './AdminOverview';

export default function SystemSettings() {
  const { configured } = useAuth();
  const [dailyLimit, setDailyLimit] = useState(20);
  const [msg, setMsg] = useState('');
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">System Settings</h1>
      <p className="text-slate-400 mt-1 text-sm">Owner: {OWNER_EMAIL}. Global defaults for RS Creator.</p>
      {!configured ? <NotConnected what="System settings" /> : null}
      <div className="mt-4 rounded-xl bg-slate-800 border border-slate-700 p-4">
        <label className="text-sm text-slate-300">Default daily AI usage limit
          <input type="number" min={1} value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} className="block mt-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
        </label>
        <button onClick={() => setMsg('Settings are saved to Supabase once the backend is connected; nothing was persisted yet.')} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-white">Save settings</button>
        {msg ? <p className="mt-2 text-sm text-emerald-300">{msg}</p> : null}
      </div>
    </div>
  );
}
