import { Link, NavLink, Outlet } from 'react-router-dom';
import Logo from '../../components/Logo';
import { OWNER_EMAIL } from '../../lib/constants';

const nav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'User Management' },
  { to: '/admin/licenses', label: 'License Management' },
  { to: '/admin/plans', label: 'Subscription Plans' },
  { to: '/admin/features', label: 'Feature Control' },
  { to: '/admin/providers', label: 'AI Providers' },
  { to: '/admin/api-usage', label: 'API Usage' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/activity-logs', label: 'Activity Logs' },
  { to: '/admin/audit-logs', label: 'Audit Logs' },
  { to: '/admin/settings', label: 'System Settings' },
  { to: '/admin/extension-updates', label: 'Extension Updates' },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800 p-4 flex flex-col">
        <Link to="/admin"><Logo /></Link>
        <p className="mt-2 text-xs text-slate-500">Admin — owner: {OWNER_EMAIL}</p>
        <nav className="mt-4 flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/dashboard" className="mt-auto pt-4 text-sm text-sky-300">← Back to dashboard</Link>
      </aside>
      <main className="flex-1 p-6 max-w-5xl"><Outlet /></main>
    </div>
  );
}
