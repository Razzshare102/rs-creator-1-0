import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const nav = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/reply-generator', label: 'Reply Generator' },
  { to: '/dashboard/post-evaluator', label: 'Post Evaluator' },
  { to: '/dashboard/feed-assistant', label: 'Feed Assistant' },
  { to: '/dashboard/account-monitor', label: 'Account Monitor' },
  { to: '/dashboard/link-queue', label: 'Link Queue' },
  { to: '/dashboard/content-creator', label: 'Content Creator' },
  { to: '/dashboard/activity', label: 'Activity History' },
  { to: '/dashboard/api-settings', label: 'API Settings' },
  { to: '/dashboard/subscription', label: 'Subscription' },
  { to: '/dashboard/profile', label: 'Profile' },
  { to: '/dashboard/help', label: 'Help' },
];

export default function Layout() {
  const { user, isOwner, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800 p-4 flex flex-col">
        <Link to="/dashboard"><Logo /></Link>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isOwner ? (
            <NavLink to="/admin" className="px-3 py-2 rounded-lg text-sm text-sky-300 hover:bg-slate-800">
              Admin Panel
            </NavLink>
          ) : null}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          <button onClick={() => void signOut()} className="mt-2 text-sm text-slate-300 hover:text-white">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-5xl">
        <Outlet />
      </main>
    </div>
  );
}
