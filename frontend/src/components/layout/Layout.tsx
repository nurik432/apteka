import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Header from './Header';

export default function Layout() {
  const location = useLocation();
  const isPos = location.pathname.startsWith('/pos');

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <Navbar />
      
      <main className={`flex-1 ${isPos ? 'overflow-hidden' : 'p-4 sm:p-6 overflow-auto'}`}>
        <div className={`animate-fadeIn h-full ${isPos ? '' : 'max-w-[1600px] mx-auto w-full'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
