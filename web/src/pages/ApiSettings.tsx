import { useState } from 'react';
import { testAiConnection } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ApiSettings() {
  const { user, configured } = useAuth();
  const [groqKey, setGroqKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(provider: 'groq' | 'openrouter', key: string) {
    setError('');
    setMsg('');
    if (!configured || !user) {
      setError('Backend not connected or not signed in.');
      return;
    }
    // Keys are stored via ai_configurations (BYOK) — never in localStorage
    // and never hardcoded. Admin-managed keys are used when no BYOK key
    // is set for the account.
    const { supabase } = await import('../lib/supabase');
    const { error: err } = await supabase.from('ai_configurations').upsert(
      { user_id: user.id, provider, api_key: key, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,provider' },
    );
    if (err) setError(err.message);
    else setMsg(`${provider} key saved to ai_configurations.`);
  }

  async function test(provider: 'groq' | 'openrouter') {
    setError('');
    setMsg('');
    setBusy(true);
    try {
      const res = await testAiConnection(provider);
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">API Settings</h1>
      <p className="text-slate-400 mt-1 text-sm">Bring your own key (BYOK) for Groq or OpenRouter, stored in ai_configurations. If you leave a field empty, the admin-managed key is used instead.</p>
      {!configured ? <p className="mt-4 rounded-lg bg-amber-900/40 border border-amber-700 px-3 py-2 text-sm text-amber-200">Backend not connected — keys cannot be saved yet.</p> : null}
      <div className="mt-4 grid gap-4">
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="font-semibold text-white">Groq</h2>
          <div className="mt-2 flex gap-2">
            <input type="password" className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" placeholder="Groq API key" value={groqKey} onChange={(e) => setGroqKey(e.target.value)} />
            <button onClick={() => void save('groq', groqKey)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Save</button>
            <button disabled={busy} onClick={() => void test('groq')} className="rounded-lg bg-slate-700 px-4 py-2 text-white disabled:opacity-50">Test connection</button>
          </div>
        </div>
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="font-semibold text-white">OpenRouter</h2>
          <div className="mt-2 flex gap-2">
            <input type="password" className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" placeholder="OpenRouter API key" value={openRouterKey} onChange={(e) => setOpenRouterKey(e.target.value)} />
            <button onClick={() => void save('openrouter', openRouterKey)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Save</button>
            <button disabled={busy} onClick={() => void test('openrouter')} className="rounded-lg bg-slate-700 px-4 py-2 text-white disabled:opacity-50">Test connection</button>
          </div>
        </div>
      </div>
      {msg ? <p className="mt-3 text-sm text-emerald-300">{msg}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
