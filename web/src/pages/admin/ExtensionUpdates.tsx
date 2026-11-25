import { useAuth } from '../../context/AuthContext';
import { NotConnected } from './AdminOverview';

export default function ExtensionUpdates() {
  const { configured } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Extension Updates</h1>
      <p className="text-slate-400 mt-1 text-sm">RS Creator browser-extension releases and rollout notes.</p>
      {!configured ? <NotConnected what="Extension release list" /> : null}
      {configured ? <p className="mt-4 text-sm text-slate-500">No extension releases published yet.</p> : null}
    </div>
  );
}
