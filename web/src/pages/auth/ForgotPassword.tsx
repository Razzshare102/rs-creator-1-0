import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import Logo from '../../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) throw err;
      setMsg('If an account exists for that email, a password-reset link was sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6">
        <Logo />
        <h1 className="text-xl font-bold text-white mt-4">Reset your password</h1>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <input className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button disabled={busy} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-white font-medium disabled:opacity-50">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400"><Link className="text-sky-400" to="/login">Back to sign in</Link></p>
      </div>
    </div>
  );
}
