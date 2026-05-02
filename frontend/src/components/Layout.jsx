import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: '📊' },
  { to: '/appointments', label: 'Appointments', icon: '📅' },
  { to: '/patients',     label: 'Patients',     icon: '🧑' },
  { to: '/doctors',      label: 'Doctors',      icon: '👨‍⚕️' },
  { to: '/invoices',     label: 'Invoices',     icon: '💰' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center text-white text-lg">🏥</div>
            <div>
              <div className="font-semibold text-slate-900 leading-tight">HCMS</div>
              <div className="text-xs text-slate-500">Clinic Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start">
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
