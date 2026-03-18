import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CategoryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    budget: '',
    icon: 'shopping_cart',
    color: 'blue',
    closingDay: '',
    dueDay: ''
  });

  const icons = ['shopping_cart', 'home', 'directions_bus', 'restaurant', 'health_and_safety', 'school', 'more_horiz', 'payments', 'flight', 'pets'];
  const colors = ['blue', 'purple', 'pink', 'cyan', 'orange', 'green', 'red', 'yellow'];

  // Generate days 1-31 for select options
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    if (isEdit && id) {
      fetchCategory(id);
    }
  }, [isEdit, id]);

  const fetchCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          status: data.status,
          budget: data.budget?.toString() || '',
          icon: data.icon,
          color: data.color || 'blue',
          closingDay: data.closing_day?.toString() || '',
          dueDay: data.due_day?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      alert('Erro ao carregar categoria');
      navigate('/categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        status: formData.status,
        budget: parseFloat(formData.budget.replace('.', '').replace(',', '.')) || 0,
        icon: formData.icon,
        color: formData.color,
        user_id: user.id,
        closing_day: formData.closingDay ? parseInt(formData.closingDay) : null,
        due_day: formData.dueDay ? parseInt(formData.dueDay) : null
      };

      if (isEdit) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload);
        if (error) throw error;
      }

      navigate('/categories');
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erro ao salvar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout-container flex h-full grow flex-col animate-in fade-in duration-300">
      <div className="px-4 sm:px-10 md:px-20 xl:px-40 flex flex-1 justify-center py-5">
        <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
          <div className="flex flex-wrap gap-2 p-4 text-sm font-medium">
            <button onClick={() => navigate('/settings')} className="text-slate-500 dark:text-[#92adc9] hover:underline">Configurações</button>
            <span className="text-slate-400">/</span>
            <button onClick={() => navigate('/categories')} className="text-slate-500 dark:text-[#92adc9] hover:underline">Categorias</button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 dark:text-white">{isEdit ? 'Editar Categoria' : 'Nova Categoria'}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black tracking-tight">{isEdit ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}</h1>
              <p className="text-slate-500 dark:text-[#92adc9] text-base max-w-lg">
                Preencha os dados abaixo para {isEdit ? 'atualizar a' : 'criar uma nova'} categoria de despesas e organizar melhor seus gastos.
              </p>
            </div>
          </div>

          <div className="p-4 w-full">
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-[#324d67] bg-white dark:bg-[#111a22] shadow-sm p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold" htmlFor="categoryName">Nome da Categoria</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633] text-slate-900 dark:text-white px-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                      id="categoryName"
                      placeholder="Ex: Alimentação, Transporte"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold" htmlFor="status">Status</label>
                    <div className="relative">
                      <select
                        className="w-full rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633] text-slate-900 dark:text-white px-4 py-2.5 appearance-none focus:ring-1 focus:ring-primary outline-none"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold" htmlFor="budget">Orçamento Mensal (BRL)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-medium">R$</div>
                      <input
                        className="w-full rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633] text-slate-900 dark:text-white pl-12 pr-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                        id="budget"
                        placeholder="0,00"
                        type="text"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold" htmlFor="dueDay">Dia de Vencimento</label>
                    <div className="relative">
                      <select
                        className="w-full rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633] text-slate-900 dark:text-white px-4 py-2.5 appearance-none focus:ring-1 focus:ring-primary outline-none"
                        id="dueDay"
                        value={formData.dueDay}
                        onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold" htmlFor="closingDay">Melhor Dia de Compra</label>
                    <div className="relative">
                      <select
                        className="w-full rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633] text-slate-900 dark:text-white px-4 py-2.5 appearance-none focus:ring-1 focus:ring-primary outline-none"
                        id="closingDay"
                        value={formData.closingDay}
                        onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold">Cor da Categoria</label>
                    <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633]">
                      {colors.map(color => (
                        <label key={color} className="cursor-pointer">
                          <input
                            className="peer sr-only"
                            name="color"
                            type="radio"
                            value={color}
                            checked={formData.color === color}
                            onChange={() => setFormData({ ...formData, color })}
                          />
                          <div className={`size-8 rounded-full border-2 border-transparent peer-checked:border-slate-400 dark:peer-checked:border-white transition-all bg-${color}-500 hover:opacity-80`}></div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-900 dark:text-white text-sm font-semibold">Ícone da Categoria</label>
                    <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#324d67] bg-slate-50 dark:bg-[#1A2633]">
                      {icons.map(icon => (
                        <label key={icon} className="cursor-pointer">
                          <input
                            className="peer sr-only"
                            name="icon"
                            type="radio"
                            value={icon}
                            checked={formData.icon === icon}
                            onChange={() => setFormData({ ...formData, icon })}
                          />
                          <div className="flex items-center justify-center size-10 rounded-full border border-transparent bg-white dark:bg-[#233648] text-slate-500 dark:text-[#92adc9] hover:bg-slate-100 peer-checked:bg-primary peer-checked:text-white transition-all">
                            <span className="material-symbols-outlined">{icon}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100 dark:border-[#233648] mt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/categories')}
                    className="flex items-center justify-center rounded-lg h-10 px-6 bg-slate-100 dark:bg-[#233648] hover:bg-slate-200 text-slate-900 dark:text-white text-sm font-bold transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center rounded-lg h-10 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : (isEdit ? 'Atualizar Categoria' : 'Salvar Categoria')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;
