import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  const location = useLocation();
  const isPos = location.pathname.startsWith('/pos');

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header compact={isPos} />

      <main className={`flex-1 min-h-0 ${isPos ? 'overflow-hidden' : 'px-4 py-5 sm:px-6 overflow-auto'}`}>
        <div className={`animate-fadeIn h-full ${isPos ? '' : 'max-w-[1600px] mx-auto w-full'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
