import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import { OWNER_EMAIL } from '../../lib/constants';

export function NotConnected({ what }: { what: string }) {
  return (
    <p className="mt-4 rounded-lg bg-amber-900/40 border border-amber-700 px-3 py-2 text-sm text-amber-200">
      Backend not connected — {what} will load from Supabase once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. No rows are shown until then; nothing here is fabricated.
    </p>
  );
}

export default function AdminOverview() {
  const { configured } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
      <p className="text-slate-400 mt-1 text-sm">Owner: {OWNER_EMAIL}</p>
      {!configured ? <NotConnected what="User, license and usage counts" /> : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard label="Total users" value={configured ? '—' : '—'} sub="Loads from profiles when connected" />
        <StatCard label="Active licenses" value="—" sub="Loads from licenses when connected" />
        <StatCard label="API calls today" value="—" sub="Loads from usage_logs when connected" />
        <StatCard label="Active plans" value="—" sub="Loads from subscription_plans when connected" />
      </div>
    </div>
  );
}
