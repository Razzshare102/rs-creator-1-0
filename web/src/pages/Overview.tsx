import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';

export default function Overview() {
  const { user, profile, configured, isOwner } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Welcome back{user?.email ? `, ${user.email}` : ''}</h1>
      <p className="text-slate-400 mt-1">RS Creator — your AI-powered X creator assistant.</p>
      {!configured ? (
        <p className="mt-4 rounded-lg bg-amber-900/40 border border-amber-700 px-3 py-2 text-sm text-amber-200">
          Backend not connected — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Values below are local demo data, not server data.
        </p>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard label="Plan" value={profile?.plan ?? 'free'} sub="From your profile / license" />
        <StatCard label="License status" value={profile?.license_status ?? 'not_configured'} sub={profile?.license_expires_at ? `Expires ${profile.license_expires_at}` : 'No expiry on file'} />
        <StatCard label="AI provider status" value={configured ? 'Ready' : 'Not configured'} sub="Groq / OpenRouter via Edge Functions" />
        <StatCard label="Daily usage" value="0 / 20" sub="Local demo data — remaining quota shown once backend is connected" />
      </div>
      <div className="mt-6 rounded-xl bg-slate-800 border border-slate-700 p-4">
        <h2 className="font-semibold text-white">Recent activity</h2>
        <p className="text-sm text-slate-400 mt-2">No activity yet. Activity is user-isolated and appears here once the backend is connected.</p>
        {isOwner ? <p className="text-sm text-sky-300 mt-2">You are signed in as the owner.</p> : null}
      </div>
    </div>
  );
}
