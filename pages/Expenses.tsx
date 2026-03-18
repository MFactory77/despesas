import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Category, Participant } from '../types';
import CalculatorModal from '../components/CalculatorModal';

const Expenses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [observation, setObservation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'single' | 'monthly' | 'installment'>('single');

  const [installments, setInstallments] = useState(2);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [catResult, partResult] = await Promise.all([
        supabase.from('categories').select('*').eq('status', 'active').order('name'),
        supabase.from('participants').select('*').eq('status', 'active').order('name')
      ]);

      if (catResult.data) setCategories(catResult.data);
      if (partResult.data) setParticipants(partResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const calculateDueDate = (purchaseDate: Date, dueDay: number): Date => {
    const pDate = new Date(purchaseDate);
    let targetMonth = pDate.getMonth();
    let targetYear = pDate.getFullYear();

    if (pDate.getDate() > dueDay) {
      targetMonth++;
    }

    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }

    return new Date(targetYear, targetMonth, dueDay);
  };

  const calculateNextMonthDueDate = (baseDate: Date, monthOffset: number, dueDay: number): Date => {
    let year = baseDate.getFullYear();
    let month = baseDate.getMonth() + monthOffset;
    return new Date(year, month, dueDay);
  };



  const handleCalculatorConfirm = (value: string) => {
    // Ensure the value is formatted correctly for the input (using comma for decimals)
    // The calculator returns string with comma, so we just set it
    setAmount(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedParticipants.length === 0 || !categoryId) {
      toast.error('Por favor, selecione os participantes e a categoria.');
      return;
    }

    try {
      setLoading(true);
      const totalValue = parseFloat(amount.replace('.', '').replace(',', '.'));
      if (isNaN(totalValue) || totalValue <= 0) {
        toast.error('O valor informado é inválido.');
        setLoading(false);
        return;
      }

      // 1. Insert Purchase
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          user_id: user.id,
          description,
          observation,
          total_amount: totalValue,
          date,
          category_id: categoryId
        }])
        .select()
        .single();

      if (purchaseError || !purchaseData) throw purchaseError;

      const purchaseId = purchaseData.id;
      const category = categories.find(c => c.id === categoryId);
      const dueDay = category?.due_day || 10;
      const purchaseDateObj = new Date(date + 'T12:00:00');

      const transactions = [];
      const splitValue = totalValue / selectedParticipants.length;

      if (paymentType === 'single') {
        const firstDueDate = calculateDueDate(purchaseDateObj, dueDay);

        selectedParticipants.forEach(partId => {
          transactions.push({
            purchase_id: purchaseId,
            participant_id: partId,
            amount: splitValue,
            due_date: firstDueDate.toISOString().split('T')[0],
            status: 'pending',
            type: 'single',
            installment_number: 1,
            total_installments: 1
          });
        });

      } else if (paymentType === 'monthly') {
        const firstDueDate = calculateDueDate(purchaseDateObj, dueDay);

        selectedParticipants.forEach(partId => {
          for (let i = 0; i < 12; i++) {
            const dueDate = calculateNextMonthDueDate(firstDueDate, i, dueDay);
            transactions.push({
              purchase_id: purchaseId,
              participant_id: partId,
              amount: splitValue,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'pending',
              type: 'monthly',
              installment_number: i + 1,
              total_installments: 12
            });
          }
        });

      } else if (paymentType === 'installment') {
        const installmentValue = splitValue / installments;
        const firstDueDate = calculateDueDate(purchaseDateObj, dueDay);

        selectedParticipants.forEach(partId => {
          for (let i = 0; i < installments; i++) {
            const dueDate = calculateNextMonthDueDate(firstDueDate, i, dueDay);
            transactions.push({
              purchase_id: purchaseId,
              participant_id: partId,
              amount: installmentValue,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'pending',
              type: 'installment',
              installment_number: i + 1,
              total_installments: installments
            });
          }
        });
      }

      const { error: transError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (transError) throw transError;

      toast.success('Lançamento registrado com sucesso.');

      // Notify participants
      try {
        const { data: participantsToNotify } = await supabase
          .from('participants')
          .select('user_id')
          .in('id', selectedParticipants);

        if (participantsToNotify && participantsToNotify.length > 0) {
          const notificationsToInsert = participantsToNotify
            .filter(p => p.user_id)
            .map(p => ({
              user_id: p.user_id,
              type: 'create',
              message: `Nova despesa: ${description} - R$ ${amount}`,
              read: false
            }));

          if (notificationsToInsert.length > 0) {
            await supabase.from('notifications').insert(notificationsToInsert);
          }
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      navigate('/dashboard');

    } catch (error) {
      console.error('Error saving expenses:', error);
      toast.error('Não foi possível registrar o lançamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex justify-center py-8 px-4 md:px-10 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col max-w-[900px] w-full gap-8">
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Nova Despesa
          </div>
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-extrabold tracking-tight">Novo Lançamento</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Preencha os detalhes para dividir com o grupo.</p>
        </div>

        <form className="flex flex-col gap-8 w-full" onSubmit={handleSubmit}>
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-8 flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Descrição da Compra</label>
                <div className="relative group">
                  <input
                    className="w-full h-14 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 px-4 pl-12 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium outline-none"
                    placeholder="Ex: Jantar de Sábado"
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined">edit_note</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor Total</label>
                <div className="relative group">
                  <input
                    className="w-full h-14 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 px-4 pl-12 pr-14 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-2xl font-bold tracking-tight text-right outline-none"
                    placeholder="0,00"
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-bold">
                    <span className="material-symbols-outlined filled">attach_money</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[24px]">calculate</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Categoria</label>
                <div className="relative">
                  <select
                    className="w-full h-12 appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 pl-11 pr-10 text-slate-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium outline-none cursor-pointer"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">category</span>
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Data da Compra</label>
                <div className="relative">
                  <input
                    className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 pl-11 text-slate-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium outline-none [color-scheme:light] dark:[color-scheme:dark]"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">event</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Observação</label>
              <div className="relative group">
                <textarea
                  className="w-full h-24 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 px-4 py-3 pl-12 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium outline-none resize-none"
                  placeholder="Detalhes adicionais..."
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
                <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined">description</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-3 lg:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de Pagamento</label>
                  <div className="bg-gray-100 dark:bg-slate-800/50 p-1.5 rounded-xl flex">
                    {[
                      { value: 'single', label: 'À vista' },
                      { value: 'monthly', label: 'Mensal' },
                      { value: 'installment', label: 'Parcelado' }
                    ].map(type => (
                      <label key={type.value} className="flex-1 cursor-pointer">
                        <input
                          className="peer sr-only"
                          name="payment_type"
                          type="radio"
                          checked={paymentType === type.value}
                          onChange={() => setPaymentType(type.value as any)}
                        />
                        <div className="w-full py-2.5 flex items-center justify-center rounded-lg border border-transparent peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-primary peer-checked:shadow-sm transition-all text-sm font-semibold text-slate-500 hover:text-slate-700">
                          {type.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentType === 'installment' && (
                  <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nº Parcelas</label>
                    <div className="relative group">
                      <input
                        className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 pl-11 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium outline-none"
                        min="2"
                        placeholder="Ex: 2"
                        type="number"
                        value={installments}
                        onChange={(e) => setInstallments(parseInt(e.target.value) || 2)}
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary">
                        <span className="material-symbols-outlined text-[20px]">layers</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  Seleção de Participantes
                </label>
                <span className="text-sm text-slate-500">Quem vai dividir essa conta?</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
                <span className="text-xs font-semibold text-slate-500">Modo:</span>
                <span className="text-xs font-bold text-primary">Divisão Igualitária</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {participants.length === 0 ? (
                <p className="text-slate-500 col-span-4 text-center py-4">Nenhum participante ativo encontrado.</p>
              ) : (
                participants.map(p => {
                  const isSelected = selectedParticipants.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`relative cursor-pointer group flex items-center gap-3 p-3 rounded-2xl border-2 transition-all hover:shadow-md ${isSelected ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-transparent bg-slate-50 dark:bg-slate-800/50'}`}
                      onClick={() => toggleParticipant(p.id)}
                    >
                      <div className="relative shrink-0">
                        {p.avatar ? (
                          <div className={`size-12 rounded-full bg-cover bg-center shadow-sm transition-all ${isSelected ? 'grayscale-0' : 'grayscale'}`} style={{ backgroundImage: `url('${p.avatar}')` }}></div>
                        ) : (
                          <div className={`flex items-center justify-center size-12 rounded-full bg-primary/20 text-primary font-bold transition-all ${isSelected ? 'opacity-100' : 'opacity-60'}`}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-[2px] border-2 border-white dark:border-surface-dark shadow-sm">
                            <span className="material-symbols-outlined text-[10px] font-bold block">check</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-slate-900 dark:text-white font-bold text-sm truncate ${isSelected ? 'opacity-100' : 'opacity-60'}`}>{p.name}</span>
                        <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                          {isSelected ?
                            `R$ ${(() => {
                              const baseVal = parseFloat(amount.replace('.', '').replace(',', '.') || '0');
                              const numParts = selectedParticipants.length || 1;
                              let finalVal = baseVal / numParts;
                              if (paymentType === 'installment') {
                                finalVal = finalVal / (installments || 1);
                              }
                              return finalVal.toFixed(2).replace('.', ',');
                            })()}`
                            : 'R$ 0,00'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 transition-colors text-sm uppercase tracking-wide"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <span className="material-symbols-outlined">check_circle</span>
              {loading ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>

      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onConfirm={handleCalculatorConfirm}
        initialValue={amount}
      />
    </main>
  );
};

export default Expenses;
