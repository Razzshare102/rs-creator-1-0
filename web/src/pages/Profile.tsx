import { useAuth } from '../context/AuthContext';
import { OWNER_EMAIL } from '../lib/constants';

export default function Profile() {
  const { user, profile, isOwner } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Profile</h1>
      <div className="mt-4 rounded-xl bg-slate-800 border border-slate-700 p-4 text-sm">
        <p className="text-slate-400">Email</p>
        <p className="text-white">{user?.email ?? '—'}</p>
        <p className="text-slate-400 mt-3">User ID</p>
        <p className="text-white break-all">{user?.id ?? '—'}</p>
        <p className="text-slate-400 mt-3">Plan</p>
        <p className="text-white">{profile?.plan ?? 'free'}</p>
        <p className="text-slate-400 mt-3">License status</p>
        <p className="text-white">{profile?.license_status ?? 'not_configured'}</p>
        {profile?.license_expires_at ? <p className="text-slate-400 mt-1">Expires: {profile.license_expires_at}</p> : null}
        {isOwner ? <p className="mt-3 text-sky-300">Owner account ({OWNER_EMAIL}) — admin access enabled.</p> : null}
      </div>
    </div>
  );
}
