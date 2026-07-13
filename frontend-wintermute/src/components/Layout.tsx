import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearToken, api } from '../lib/api';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, LogOut, Menu } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
];

export default function Layout() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.me().then(r => setUser(r.user)).catch(() => {});
  }, []);

  const logout = () => { clearToken(); nav('/login'); };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <aside className={`${menuOpen ? 'block' : 'hidden'} md:block fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col`}>
        <div className="text-xl font-bold mb-8 px-3 text-white">Wintermute</div>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
              }>
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-800 pt-4 mt-4">
          <div className="px-3 mb-3 text-sm text-gray-400 truncate">{user?.name || 'User'}</div>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg w-full transition">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMenuOpen(false)} />}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between md:hidden">
          <button onClick={() => setMenuOpen(true)}><Menu size={24} /></button>
          <span className="font-bold">Wintermute</span>
          <div />
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
