
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Profile State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
    }
  }, [user]);

  // Apply theme on mount and change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleUpdateProfile = async () => {
    try {
      setLoadingProfile(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      });

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoadingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha. Tente novamente.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    toast((t) => (
      <span>
        Para excluir sua conta, entre em contato com o suporte em <b>suporte@sharecost.com</b>
        <button onClick={() => toast.dismiss(t.id)} className="ml-2 border border-gray-400 rounded px-2 text-xs">OK</button>
      </span>
    ), { duration: 5000 });
  };

  const fullName = `${firstName} ${lastName}`.trim() || user?.email || 'Usuário';
  const avatarUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between gap-3 pb-8">
        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">Configurações</p>
          <p className="text-slate-500 dark:text-gray-400 text-base">Gerencie seu perfil e preferências da conta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3">
          <div className="flex flex-col gap-2 bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 sticky top-24">
            <div className="flex gap-3 items-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="size-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${avatarUrl}')` }}></div>
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-slate-900 dark:text-white text-sm font-bold truncate">{fullName}</h1>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'perfil' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400'}`}
            >
              <span className={`material-symbols-outlined ${activeTab === 'perfil' ? 'filled' : ''}`}>person</span>
              <p className="text-sm font-bold">Perfil</p>
            </button>
            <button
              onClick={() => setActiveTab('tema')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'tema' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400'}`}
            >
              <span className={`material-symbols-outlined ${activeTab === 'tema' ? 'filled' : ''}`}>palette</span>
              <p className="text-sm font-bold">Tema</p>
            </button>
            <button
              onClick={() => setActiveTab('seguranca')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'seguranca' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400'}`}
            >
              <span className={`material-symbols-outlined ${activeTab === 'seguranca' ? 'filled' : ''}`}>lock</span>
              <p className="text-sm font-bold">Conta & Segurança</p>
            </button>
          </div>
        </aside>

        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* PERFIL */}
          {(activeTab === 'perfil') && (
            <section className="flex flex-col bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Perfil do Usuário</h2>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer">
                    <div className="size-24 rounded-full border-4 border-white dark:border-slate-800 shadow-md bg-cover bg-center" style={{ backgroundImage: `url('${avatarUrl}')` }}></div>
                    {/* Placeholder for future avatar upload */}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">Foto de Perfil</h3>
                    <p className="text-sm text-slate-500">Exibida nos grupos e despesas</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Primeiro Nome</p>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 h-12 px-4 focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-white"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Sobrenome</p>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 h-12 px-4 focus:ring-1 focus:ring-primary outline-none text-slate-900 dark:text-white"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-300">E-mail</p>
                    <input
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 h-12 px-4 focus:ring-1 focus:ring-primary outline-none text-slate-500 cursor-not-allowed"
                      value={user?.email || ''}
                      disabled
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={loadingProfile}
                    className="h-10 px-6 bg-primary hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loadingProfile && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* TEMA */}
          {(activeTab === 'tema') && (
            <section className="flex flex-col bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aparência</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="cursor-pointer group" onClick={() => { if (darkMode) setDarkMode(false); }}>
                    <input className="peer sr-only" name="theme" type="radio" checked={!darkMode} readOnly />
                    <div className="rounded-xl border-2 border-transparent peer-checked:border-primary p-1 bg-gray-100 dark:bg-slate-800 transition-all">
                      <div className="h-32 bg-[#f6f7f8] rounded-lg border border-gray-200 mb-3 flex items-center justify-center relative overflow-hidden">
                        {/* Light Mode Preview */}
                        <div className="w-3/4 h-3/4 bg-white rounded shadow-sm p-3 gap-2 flex flex-col items-start z-10">
                          <div className="h-2 w-1/3 bg-gray-200 rounded"></div>
                          <div className="h-2 w-full bg-gray-100 rounded"></div>
                          <div className="mt-auto h-6 w-16 bg-blue-500 rounded-md"></div>
                        </div>
                      </div>
                      <div className="px-2 pb-2 flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-700 dark:text-gray-300">Modo Claro</span>
                        <span className={`material-symbols-outlined text-primary text-xl ${!darkMode ? 'opacity-100' : 'opacity-0'}`}>check_circle</span>
                      </div>
                    </div>
                  </label>
                  <label className="cursor-pointer group" onClick={() => { if (!darkMode) setDarkMode(true); }}>
                    <input className="peer sr-only" name="theme" type="radio" checked={darkMode} readOnly />
                    <div className="rounded-xl border-2 border-transparent peer-checked:border-primary p-1 bg-slate-900 transition-all">
                      <div className="h-32 bg-[#101922] rounded-lg border border-gray-800 mb-3 flex items-center justify-center relative overflow-hidden">
                        {/* Dark Mode Preview */}
                        <div className="w-3/4 h-3/4 bg-[#1e293b] rounded shadow-sm p-3 gap-2 flex flex-col items-start z-10 border border-gray-700">
                          <div className="h-2 w-1/3 bg-gray-600 rounded"></div>
                          <div className="h-2 w-full bg-gray-700 rounded"></div>
                          <div className="mt-auto h-6 w-16 bg-blue-500 rounded-md"></div>
                        </div>
                      </div>
                      <div className="px-2 pb-2 flex items-center justify-between">
                        <span className="font-bold text-sm text-white">Modo Escuro</span>
                        <span className={`material-symbols-outlined text-primary text-xl ${darkMode ? 'opacity-100' : 'opacity-0'}`}>check_circle</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* SEGURANÇA */}
          {(activeTab === 'seguranca') && (
            <section className="flex flex-col bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conta & Segurança</h2>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">Alterar Senha</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 h-10 px-4 focus:ring-primary text-sm outline-none text-slate-900 dark:text-white"
                      type="password"
                      placeholder="Nova Senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 h-10 px-4 focus:ring-primary text-sm outline-none text-slate-900 dark:text-white"
                      type="password"
                      placeholder="Confirmar Senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleUpdatePassword}
                    disabled={loadingPassword}
                    className="text-primary text-sm font-bold text-left hover:underline w-fit disabled:opacity-50"
                  >
                    {loadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
                <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-red-600">Excluir Conta</h3>
                    <p className="text-sm text-slate-500">Esta ação é irreversível.</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-bold transition-all"
                  >
                    Excluir minha conta
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* NOTIFICAÇÕES (Placeholder) */}
          {(activeTab === 'notificacoes') && (
            <section className="flex flex-col bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                <p>Configurações de notificação em breve.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
