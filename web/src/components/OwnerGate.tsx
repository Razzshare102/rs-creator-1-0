import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OWNER_EMAIL } from '../lib/constants';

// Owner gate: the owner account is OWNER_EMAIL (razzshares@gmail.com).
// This is a client-side UI gate only; server RLS on user_roles is
// authoritative for admin data.
export default function OwnerGate() {
  const { isOwner, loading, user } = useAuth();
  if (loading) return <div className="p-8 text-slate-300">Loading…</div>;
  if (!isOwner) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-white">Access denied</h1>
        <p className="mt-2 text-slate-400">
          This area is for the RS Creator owner only ({OWNER_EMAIL}). Signed in as {user?.email ?? 'unknown'}.
        </p>
      </div>
    );
  }
  return <Outlet />;
}
