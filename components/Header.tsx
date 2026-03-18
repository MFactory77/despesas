import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDate } from '../contexts/DateContext';
import { useNotifications } from '../contexts/NotificationContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HeaderProps {
  onLogout: () => void;
}

const NotificationDropdown: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative notification-container">
      <button
        className="relative p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-surface-light dark:border-surface-dark animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-[#161e27] shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary font-medium hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 ${notif.read ? 'opacity-60' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={`mt-1 size-2 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : 'bg-primary'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 dark:text-white leading-relaxed">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { selectedDate, prevMonth, nextMonth } = useDate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handlePrevMonth = () => {
    prevMonth();
  };

  const handleNextMonth = () => {
    nextMonth();
  };

  const formattedDate = format(selectedDate, 'MMMM yyyy', { locale: ptBR });
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const showMonthSelector = location.pathname === '/dashboard';

  const firstName = user?.user_metadata?.first_name || 'Usuário';
  const lastName = user?.user_metadata?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const email = user?.email || '';

  return (
    <header className="sticky top-0 z-50 flex flex-col border-b border-gray-200 dark:border-gray-800 bg-surface-light/80 dark:bg-surface-dark/90 backdrop-blur-md">
      <div className="relative flex w-full items-center justify-between px-6 py-4">
        {/* Logo Section */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight hidden sm:block">
            Despesas<span className="text-primary">Compartilhadas</span>
          </h1>
        </div>

        {/* Month Selector */}
        {showMonthSelector && (
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center bg-gray-100 dark:bg-[#0b1219] rounded-lg p-1 border border-gray-200 dark:border-gray-800">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white dark:hover:bg-surface-dark rounded-md text-gray-500 dark:text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <div className="px-6 py-1 text-sm font-bold min-w-[150px] text-center select-none">
                {displayDate}
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-white dark:hover:bg-surface-dark rounded-md text-gray-500 dark:text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}

        {/* User Actions */}
        <div className="flex items-center gap-4">
          <NotificationDropdown />

          <div className="relative flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-700">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{fullName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{email}</span>
            </div>

            <div
              className="relative"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div
                className="size-9 rounded-full bg-cover bg-center ring-2 ring-gray-100 dark:ring-gray-700 cursor-pointer hover:ring-primary/50 transition-all"
                style={{ backgroundImage: `url('https://picsum.photos/seed/${user?.id || 'user'}/100/100')` }}
              ></div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); }}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white dark:bg-[#161e27] shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50">
                    <div className="py-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/settings'); setIsDropdownOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        Configurações
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="w-full px-6 border-t border-gray-200 dark:border-gray-800">
        <nav className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `flex items-center py-3 text-sm font-bold border-b-[2px] transition-all whitespace-nowrap ${isActive ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/expenses/new"
            className={({ isActive }) => `flex items-center py-3 text-sm font-medium border-b-[2px] transition-all whitespace-nowrap ${isActive ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
          >
            Lançamentos
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) => `flex items-center py-3 text-sm font-medium border-b-[2px] transition-all whitespace-nowrap ${isActive ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
          >
            Categorias
          </NavLink>
          <NavLink
            to="/participants"
            className={({ isActive }) => `flex items-center py-3 text-sm font-medium border-b-[2px] transition-all whitespace-nowrap ${isActive ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'}`}
          >
            Participantes
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
export default Header;
