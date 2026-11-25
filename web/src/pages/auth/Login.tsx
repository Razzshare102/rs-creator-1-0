import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

export default function Login() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6">
        <Logo />
        <h1 className="text-xl font-bold text-white mt-4">Sign in to RS Creator</h1>
        {!configured ? <p className="mt-2 text-sm text-amber-300">Backend not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p> : null}
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <input className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button disabled={busy} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-white font-medium disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          No account? <Link className="text-sky-400" to="/register">Register</Link> ·{' '}
          <Link className="text-sky-400" to="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
