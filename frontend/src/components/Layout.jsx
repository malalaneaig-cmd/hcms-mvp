import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermissions } from '../hooks/usePermissions.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const NAV_KEYS = [
  { to: '/',             key: 'dashboard',    icon: '📊' },
  { to: '/appointments', key: 'appointments', icon: '📅' },
  { to: '/patients',     key: 'patients',     icon: '🧑' },
  { to: '/doctors',      key: 'doctors',      icon: '👨‍⚕️' },
  { to: '/invoices',     key: 'invoices',     icon: '💰' },
  { to: '/conversations', key: 'conversations', icon: '💬' },
];

const NAV_ADMIN = [{ to: '/staff', key: 'staff', icon: '🔑' }];
const STAFF_ONLY_KEYS = new Set(['invoices', 'conversations']);

export default function Layout() {
  const { user, logout } = useAuth();
  const { canManageClinic } = usePermissions();
  const { t } = useI18n();
  const navigate = useNavigate();

  let nav = NAV_KEYS.filter((n) => canManageClinic || !STAFF_ONLY_KEYS.has(n.key));
  if (user?.role === 'admin') nav = [...nav, ...NAV_ADMIN];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center text-white text-lg shrink-0">🏥</div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 leading-tight">HCMS</div>
                <div className="text-xs text-slate-500 truncate">{t('layout.subtitle')}</div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => (
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
              {t(`nav.${n.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start">
            <span>↩</span> {t('layout.signOut')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
