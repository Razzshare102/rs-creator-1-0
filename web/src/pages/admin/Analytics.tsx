import { useAuth } from '../../context/AuthContext';
import { NotConnected } from './AdminOverview';

export default function Analytics() {
  const { configured } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      {!configured ? <NotConnected what="Analytics aggregates" /> : null}
      {configured ? <p className="mt-4 text-sm text-slate-500">Analytics load from Supabase aggregates once the backend tables are populated.</p> : null}
    </div>
  );
}
