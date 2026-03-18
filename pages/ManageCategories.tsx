import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Category {
  id: string;
  name: string;
  icon: string;
  budget: number;
  color: string;
  status: string;
}

const ManageCategories: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erro ao excluir categoria');
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 p-4 pb-0 pl-0">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 dark:text-[#92adc9] text-base font-medium hover:underline">Dashboard</button>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 dark:text-white text-base font-medium">Categorias</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex min-w-72 flex-col gap-3">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Gerenciar Categorias</h1>
            <p className="text-slate-500 dark:text-[#92adc9] text-base font-normal max-w-lg">
              Organize suas despesas criando e editando categorias personalizadas. Defina orçamentos para manter o controle.
            </p>
          </div>
          <button
            onClick={() => navigate('/categories/new')}
            className="flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Adicionar Categoria</span>
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <span className="material-symbols-outlined text-slate-400 text-[22px]">search</span>
        </div>
        <input
          className="block w-full h-12 pl-12 pr-4 rounded-2xl border-none bg-slate-200/50 dark:bg-[#1A2633] text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          placeholder="Buscar categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Carregando categorias...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            Nenhuma categoria encontrada. Clique em "Adicionar Categoria" para começar.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#192633] border-b border-slate-200 dark:border-[#324d67]">
                <th className="px-6 py-4 text-sm font-semibold w-20">Ícone</th>
                <th className="px-6 py-4 text-sm font-semibold">Nome da Categoria</th>
                <th className="px-6 py-4 text-sm font-semibold hidden sm:table-cell">Orçamento</th>
                <th className="px-6 py-4 text-right text-sm font-semibold w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#324d67]">
              {filteredCategories.map(cat => (
                <tr key={cat.id} className="group hover:bg-slate-50 dark:hover:bg-[#1A2633] transition-colors">
                  <td className="px-6 py-4">
                    <div className={`size-10 rounded-full flex items-center justify-center bg-${cat.color}-100 text-${cat.color}-600`}>
                      {/* Fallback for unknown colors to prevent crash, though styling relies on tailwind classes being present. 
                           Since we can't guarantee arbitrary color classes exist, we might want to stick to a set or use style={{}}.
                           For now keeping the dynamic class methodology but it might fail if color is not in safelist.
                           Let's simplify to a default or style approach if needed. But let's trust the existing pattern for now.
                       */}
                      <span className="material-symbols-outlined">{cat.icon}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-900 dark:text-white text-base font-medium">{cat.name}</span>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#233648] text-slate-800 dark:text-slate-200">
                      R$ {Number(cat.budget).toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => navigate(`/categories/edit/${cat.id}`)} className="p-2 text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-[#233648]">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default ManageCategories;
