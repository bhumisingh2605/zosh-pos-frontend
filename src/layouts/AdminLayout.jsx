import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Receipt, ChevronDown, AlertTriangle, RefreshCw, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWorkspace } from '../store/workspaceContext';
import { useThemeStore } from '../store/themeStore';
import { navForRole } from '../lib/nav';
import { initials, roleLabel } from '../lib/format';

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { store, branches, activeBranch, setActiveBranchId, isBranchScoped, error: workspaceError, refresh } = useWorkspace();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const items = navForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 shrink-0 bg-ink text-paper flex flex-col dark-scroll">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-ink-line">
          <div className="w-8 h-8 rounded-sm bg-brass flex items-center justify-center">
            <Receipt size={17} className="text-ink" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Zosh POS</p>
            <p className="text-[11px] text-paper/50 mt-0.5">{store?.brand || 'No store yet'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 dark-scroll">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `mx-2 mb-0.5 flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-ledger text-white' : 'text-paper/70 hover:bg-ink-soft hover:text-paper'
                }`
              }
            >
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {branches?.length > 0 && (
          <div className="border-t border-ink-line px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-paper/40 mb-1.5">Active branch</p>
            {isBranchScoped ? (
              <p className="text-sm text-paper/90">{activeBranch?.name || '—'}</p>
            ) : (
              <div className="relative">
                <select
                  value={activeBranch?.id || ''}
                  onChange={(e) => setActiveBranchId(Number(e.target.value))}
                  className="w-full appearance-none rounded-sm bg-ink-soft border border-ink-line text-sm text-paper px-2.5 py-1.5 pr-7 cursor-pointer focus:outline-none focus:border-brass"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-2.5 text-paper/40 pointer-events-none" />
              </div>
            )}
          </div>
        )}

        <div className="border-t border-ink-line px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brass/20 border border-brass/40 flex items-center justify-center text-xs font-semibold text-brass shrink-0">
            {initials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate leading-tight">{user?.fullName}</p>
            <p className="text-[11px] text-paper/50 leading-tight">{roleLabel(user?.role)}</p>
          </div>
          <button onClick={toggleTheme} aria-label="Toggle theme" className="text-paper/50 hover:text-brass p-1">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={handleLogout} aria-label="Sign out" className="text-paper/50 hover:text-receipt-red p-1">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8 sm:px-8">
          {workspaceError && (
            <div className="mb-6 flex items-center justify-between gap-3 border border-receipt-red/30 bg-receipt-red-soft text-receipt-red text-sm rounded-sm px-4 py-3">
              <span className="flex items-center gap-2"><AlertTriangle size={15} /> {workspaceError}</span>
              <button onClick={refresh} className="inline-flex items-center gap-1 text-ink-text hover:text-ledger shrink-0">
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}