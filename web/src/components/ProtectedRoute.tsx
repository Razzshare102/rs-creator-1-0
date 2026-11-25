import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { session, loading, configured } = useAuth();
  if (loading) return <div className="p-8 text-slate-300">Loading…</div>;
  if (!configured) {
    return (
      <div className="p-8 text-slate-300">
        <h1 className="text-xl font-bold text-white">RS Creator is not configured</h1>
        <p className="mt-2">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to sign in.</p>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
