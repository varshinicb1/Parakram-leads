import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="ml-56 flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
