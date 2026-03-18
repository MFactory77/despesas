
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    // Note: Social login requires additional setup in Supabase dashboard
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });
    if (error) setError(error.message);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative overflow-hidden bg-background-light dark:bg-background-dark">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-[480px] flex flex-col gap-6">
        <div className="flex items-center justify-center gap-3 text-slate-900 dark:text-white mb-2">
          <div className="size-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary">
            <span className="material-symbols-outlined filled text-2xl">account_balance_wallet</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-[-0.015em]">ShareCost</h2>
        </div>

        <div className="flex flex-col rounded-2xl bg-white dark:bg-[#161e27] shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 p-6 sm:p-10">
          <div className="flex flex-col gap-2 mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">Bem-vindo de Volta</h1>
            <p className="text-slate-500 dark:text-[#92adc9] text-base font-normal">Faça login para gerenciar suas despesas compartilhadas.</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm">
              <strong>Configuração Necessária:</strong> As chaves do Supabase não foram encontradas. Verifique seu arquivo .env.
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <label className="flex flex-col flex-1">
              <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal pb-2">Endereço de E-mail</p>
              <div className="relative">
                <input
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#192633] focus:ring-2 focus:ring-primary/50 h-12 px-4 text-base font-normal transition-all"
                  placeholder="user@example.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 dark:text-[#92adc9]">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
              </div>
            </label>

            <label className="flex flex-col flex-1">
              <div className="flex justify-between items-baseline pb-2">
                <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal">Senha</p>
                <button type="button" className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors">Esqueceu a Senha?</button>
              </div>
              <div className="relative">
                <input
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#192633] focus:ring-2 focus:ring-primary/50 h-12 px-4 text-base font-normal transition-all"
                  placeholder="••••••••"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-slate-400 dark:text-[#92adc9] hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </div>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl h-12 px-5 bg-primary hover:bg-blue-600 text-white text-base font-bold transition-all shadow-lg shadow-primary/25 mt-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span>Entrar</span>}
            </button>
          </form>

          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs uppercase font-bold tracking-wider">Ou continue com</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 h-10 rounded-lg border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#192633] hover:bg-slate-50 dark:hover:bg-[#203040] transition-colors">
              <img alt="Google" className="size-5" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
              <span className="text-sm font-medium text-slate-700 dark:text-[#92adc9]">Google</span>
            </button>
            <button onClick={() => handleSocialLogin('apple')} className="flex items-center justify-center gap-2 h-10 rounded-lg border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#192633] hover:bg-slate-50 dark:hover:bg-[#203040] transition-colors">
              <span className="material-symbols-outlined text-slate-900 dark:text-white text-[22px]">phone_iphone</span>
              <span className="text-sm font-medium text-slate-700 dark:text-[#92adc9]">Apple</span>
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-500 dark:text-[#92adc9] text-base font-normal">
            Não tem uma conta?
            <Link to="/register" className="text-primary font-bold hover:underline ml-1">Criar uma Conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
