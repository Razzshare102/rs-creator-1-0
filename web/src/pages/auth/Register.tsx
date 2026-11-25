import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { verifyLicense } from '../../lib/api';
import Logo from '../../components/Logo';

export default function Register() {
  const { signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'account' | 'license'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [licenseMsg, setLicenseMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signUp(email, password);
      setStep('license');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyLicense(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLicenseMsg('');
    setBusy(true);
    try {
      const result = await verifyLicense(licenseKey.trim());
      setLicenseMsg(result.valid ? `License valid — plan: ${result.plan ?? 'unknown'}.` : `License not valid: ${result.message ?? result.status}.`);
      if (result.valid) navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'License verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6">
        <Logo />
        <h1 className="text-xl font-bold text-white mt-4">
          {step === 'account' ? 'Create your RS Creator account' : 'Enter your license key'}
        </h1>
        {!configured ? <p className="mt-2 text-sm text-amber-300">Backend not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p> : null}
        {step === 'account' ? (
          <form onSubmit={onRegister} className="mt-4 flex flex-col gap-3">
            <input className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button disabled={busy} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-white font-medium disabled:opacity-50">
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerifyLicense} className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-slate-400">Account created. Enter a license key to activate your plan, or skip for now.</p>
            <input className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white" placeholder="License key" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} required />
            {licenseMsg ? <p className="text-sm text-emerald-300">{licenseMsg}</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button disabled={busy} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-white font-medium disabled:opacity-50">
              {busy ? 'Verifying…' : 'Verify license'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="text-sm text-slate-300 hover:text-white">
              Skip for now
            </button>
          </form>
        )}
        <p className="mt-4 text-sm text-slate-400">
          Already have an account? <Link className="text-sky-400" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
