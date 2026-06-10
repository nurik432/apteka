import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header />
      <Navbar />
      
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="animate-fadeIn h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
