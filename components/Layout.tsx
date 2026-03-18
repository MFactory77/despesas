
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

interface LayoutProps {
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  return (
    <div className="flex flex-col min-h-screen transition-colors duration-200 bg-gray-50 dark:bg-[#0b1219]">
      <Header onLogout={onLogout} />
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
