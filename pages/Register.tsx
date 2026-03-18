
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      // Typically show a message to check email, or if auto-confirm is on, navigate
      // For now, let's navigate or show success
      alert('Conta criada com sucesso! Verifique seu email se necessário.');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="font-display bg-background-light text-slate-900 min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-solid border-slate-200 px-10 py-4 bg-white w-full z-10">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary">
            <span className="material-symbols-outlined filled text-3xl">account_balance_wallet</span>
          </div>
          <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">SplitWise Clone</h2>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-600 text-sm font-medium self-center hidden sm:block">Já possui uma conta?</span>
          <Link to="/login" className="flex items-center justify-center rounded-lg h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-full">
        <div className="flex-1 flex justify-center items-center p-6 md:p-12 lg:p-16 bg-white">
          <div className="w-full max-w-[480px] flex flex-col gap-6">
            <div className="flex flex-col gap-2 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Crie sua conta</h1>
              <p className="text-slate-500 text-base">Comece a rastrear despesas e dividir contas sem esforço.</p>
            </div>

            <div className="flex flex-col gap-3">
              <button className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white h-12 px-4 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-all">
                <img alt="Google" className="w-5 h-5" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
                <span>Registrar com Google</span>
              </button>
              <button className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white h-12 px-4 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-all">
                <span className="material-symbols-outlined text-xl">phone_iphone</span>
                <span>Registrar com Apple</span>
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold tracking-wider">OU CONTINUAR COM E-MAIL</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleRegister}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex flex-col flex-1 gap-1.5">
                  <span className="text-slate-700 text-sm font-medium">Primeiro Nome</span>
                  <input
                    className="w-full rounded-lg border-slate-300 bg-white text-slate-900 h-12 px-4 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Jane"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col flex-1 gap-1.5">
                  <span className="text-slate-700 text-sm font-medium">Sobrenome</span>
                  <input
                    className="w-full rounded-lg border-slate-300 bg-white text-slate-900 h-12 px-4 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Doe"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 group">
                <span className="text-slate-700 text-sm font-medium">Endereço de E-mail</span>
                <input
                  className="w-full rounded-lg border-slate-300 bg-white text-slate-900 h-12 px-4 focus:ring-primary focus:border-primary transition-all"
                  placeholder="jane@example.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-700 text-sm font-medium">Senha</span>
                <div className="relative">
                  <input
                    className="w-full rounded-lg border-slate-300 bg-white text-slate-900 h-12 px-4 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Mín. 8 caracteres"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" type="button">
                    <span className="material-symbols-outlined text-xl">visibility</span>
                  </button>
                </div>
                <div className="flex gap-1 mt-1 h-1">
                  <div className="flex-1 bg-red-500 rounded-full"></div>
                  <div className="flex-1 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 bg-slate-200 rounded-full"></div>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Força da senha: Fraca</p>
              </label>

              <div className="flex gap-3 items-start mt-2">
                <input className="rounded border-slate-300 text-primary focus:ring-primary mt-1" type="checkbox" required />
                <p className="text-sm text-slate-600 leading-normal">
                  Concordo com os <button type="button" className="text-primary hover:underline">Termos de Serviço</button> e <button type="button" className="text-primary hover:underline">Política de Privacidade</button>.
                </p>
              </div>

              <button
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-primary h-12 px-4 text-white text-base font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Criar Conta'}
              </button>
            </form>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 relative bg-blue-50 overflow-hidden items-center justify-center p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-0"></div>
          <div className="relative z-10 w-full max-w-lg">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">DESPESAS MENSAIS</p>
                  <h3 className="text-slate-900 text-2xl font-bold">$2,450.00</h3>
                </div>
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img key={i} alt={`User ${i}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src={`https://picsum.photos/seed/reg${i}/100/100`} />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-primary flex items-center justify-center text-white text-xs font-bold shadow-sm">+2</div>
                </div>
              </div>

              <div className="flex items-end gap-3 h-48 mb-6">
                {[40, 65, 85, 55, 30].map((h, i) => (
                  <div key={i} className={`w-full ${i === 2 ? 'bg-primary' : 'bg-primary/20'} rounded-t-lg transition-all cursor-pointer`} style={{ height: `${h}%` }}></div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">shopping_cart</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-slate-900 text-sm font-medium">Mercado</h4>
                    <p className="text-slate-500 text-xs">Dividido por 3 pessoas</p>
                  </div>
                  <span className="text-slate-900 font-bold text-sm">-$124.50</span>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Divida contas facilmente</h2>
              <p className="text-slate-600 max-w-sm mx-auto">Acompanhe suas despesas compartilhadas e saldos com colegas de casa, viagens, grupos, amigos e família.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
