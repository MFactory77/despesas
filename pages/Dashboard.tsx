
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Category, Participant } from '../types';
import { useDate } from '../contexts/DateContext';
import { startOfMonth, addMonths, formatISO } from 'date-fns';

interface CategoryWithStats extends Category {
  transactionCount: number;
  totalAmount: number;
}

interface ParticipantWithStats extends Participant {
  balance: number;
  lastPayment: string;
}

interface MonthlyTransaction {
  id: string;
  description: string;
  participant: {
    name: string;
    avatar?: string;
  };
  type: string;
  amount: number;
  due_date: string;
}



import MonthlyChart from '../components/MonthlyChart';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedDate } = useDate();
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [participants, setParticipants] = useState<ParticipantWithStats[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<MonthlyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart State
  const [chartData, setChartData] = useState<{ name: string; total: number }[]>([]);
  const [selectedChartCategory, setSelectedChartCategory] = useState<string>('');
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  // Fetch chart data when category or year changes
  useEffect(() => {
    if (selectedChartCategory) {
      fetchChartData();
    }
  }, [selectedChartCategory, selectedDate]); // re-fetch if year changes (implied by selectedDate change)

  const fetchChartData = async () => {
    if (!selectedChartCategory) return;

    setChartLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      // Fetch transactions for the selected category and year
      // We need to join with purchases to filter by category, 
      // but Supabase simple client doesn't do deep joins easily.
      // So we fetch purchases first.

      const { data: purchases, error: purchError } = await supabase
        .from('purchases')
        .select('id')
        .eq('category_id', selectedChartCategory)
        .gte('date', startOfYear)
        .lte('date', endOfYear);

      if (purchError) throw purchError;

      const purchaseIds = purchases?.map(p => p.id) || [];

      if (purchaseIds.length === 0) {
        setChartData([]);
        return;
      }

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount, due_date')
        .in('purchase_id', purchaseIds);

      if (transError) throw transError;

      // Group by month
      const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];

      const monthlyTotals = new Array(12).fill(0);

      transactions?.forEach(t => {
        const date = new Date(t.due_date);
        // Ensure it's the correct year (transactions might slightly vary if we used purchase date filter but transaction due_date)
        // But here we filtered purchases by date. Let's assume due_date is close enough or strictly check year.
        if (date.getFullYear() === year) {
          monthlyTotals[date.getMonth()] += Number(t.amount);
        }
      });

      // Filter up to current month?? Or show whole year?
      // Request said "inicio em janeiro do ano vigente". 
      // Showing whole year is fine, future months will be 0 or projected.

      const chartDataFormatted = months.map((name, index) => ({
        name,
        total: monthlyTotals[index]
      }));

      setChartData(chartDataFormatted);

    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const start = mapDateToISO(startOfMonth(selectedDate));
      const nextMonth = addMonths(startOfMonth(selectedDate), 1);
      const end = mapDateToISO(nextMonth);

      // 1. Fetch Categories and Participants
      const [catRes, partRes] = await Promise.all([
        supabase.from('categories').select('*').eq('status', 'active'),
        supabase.from('participants').select('*').eq('status', 'active')
      ]);

      if (catRes.error) throw catRes.error;
      if (partRes.error) throw partRes.error;

      // Set default category for chart if not set
      if (!selectedChartCategory && catRes.data && catRes.data.length > 0) {
        // Try to find "Estilo Gof"
        const defaultCat = catRes.data.find(c => c.name.toLowerCase().includes('estilo gof'));
        setSelectedChartCategory(defaultCat ? defaultCat.id : catRes.data[0].id);
      }

      // 2. Fetch Transactions for the selected month (Due Date)
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .gte('due_date', start)
        .lt('due_date', end);

      if (transError) throw transError;

      const transactions = transactionsData || [];


      // 3. Fetch related Purchases to get Category IDs
      // We need the purchases that correspond to these transactions to know the category
      const purchaseIds = [...new Set(transactions.map(t => t.purchase_id))];

      let purchases: any[] = [];
      if (purchaseIds.length > 0) {
        const { data: purchasesData, error: purchError } = await supabase
          .from('purchases')
          .select('id, category_id, description') // key change: added description
          .in('id', purchaseIds);

        if (purchError) throw purchError;
        purchases = purchasesData || [];
      }



      // Create a map of purchase_id -> category_id for fast lookup
      const purchaseCategoryMap = new Map<string, string>();
      purchases.forEach(p => {
        purchaseCategoryMap.set(p.id, p.category_id);
      });

      const rawCategories = catRes.data || [];
      const rawParticipants = partRes.data || [];

      // Calculate Category Stats
      const categoriesStats = rawCategories.map(cat => {
        // Find transactions belonging to this category
        const catTransactions = transactions.filter(t => {
          const catId = purchaseCategoryMap.get(t.purchase_id);
          return catId === cat.id;
        });

        const totalAmount = catTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          ...cat,
          transactionCount: catTransactions.length,
          totalAmount
        };
      });

      // Calculate Participant Stats
      const participantsStats = rawParticipants.map(part => {
        const partTransactions = transactions.filter(t => t.participant_id === part.id);
        const totalBalance = partTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

        // Logic for status and last payment could be refined. 
        // For now, if they have any pending transactions, we show "Deve"
        const hasPending = partTransactions.some(t => t.status === 'pending');
        // Simple heuristic for "Last Payment" - we don't track payments yet, so placeholder

        return {
          ...part,
          balance: totalBalance,
          status: hasPending ? 'Deve' : 'Quitado', // Simplified logic
          lastPayment: 'Sem pagamentos recentes' // Placeholder until payments are implemented
        };
      });

      setCategories(categoriesStats);
      setParticipants(participantsStats);

      // Process Monthly Transactions
      const purchaseMap = new Map((purchases || []).map(p => [p.id, p]));
      const participantMap = new Map((rawParticipants || []).map(p => [p.id, p]));

      const monthly = transactions
        .filter(t => t.type === 'monthly')
        .map(t => {
          const purchase = purchaseMap.get(t.purchase_id);
          const participant = participantMap.get(t.participant_id);
          return {
            id: t.id,
            description: purchase?.description || 'Sem descrição',
            participant: {
              name: participant?.name || 'Desconhecido',
              avatar: participant?.avatar
            },
            type: 'Mensal',
            amount: t.amount,
            due_date: t.due_date
          };
        });

      setMonthlyTransactions(monthly);

      // Check for Last Installments and Notify
      const lastInstallments = transactions.filter(t =>
        t.type === 'installment' &&
        t.installment_number === t.total_installments
      );

      // We only want to notify if we haven't already for this specific transaction
      // This is a bit expensive to check one by one, so we can do it optimistically or just check local storage/cache
      // For a robust solution, we'd query the notifications table. 
      // Let's do a simple check: "Have we notified this user about this transaction ID as a reminder?"

      const { data: existingReminders } = await supabase
        .from('notifications')
        .select('data')
        .eq('type', 'reminder')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      const notifiedTxIds = new Set(existingReminders?.map((n: any) => n.data?.transaction_id) || []);

      for (const tx of lastInstallments) {
        if (!notifiedTxIds.has(tx.id)) {
          const purchase = purchaseMap.get(tx.purchase_id);
          const description = purchase?.description || 'Parcela';

          await supabase.from('notifications').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id, // Notify the CURRENT user viewing the dashboard? Or the participant?
            // "Dashboard is consulting" implies the viewer. But logically, the participant should know.
            // Let's notify the participant of that transaction.
            type: 'reminder',
            message: `Última parcela de ${description} vence neste mês!`,
            read: false,
            data: { transaction_id: tx.id }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate generic max for bars
  const maxCategoryAmount = Math.max(...categories.map(c => c.totalAmount), 1) * 1.2;
  const maxParticipantBalance = Math.max(...participants.map(p => p.balance), 1) * 1.2;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Total por Categorias</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="group flex flex-col justify-between rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 p-5 hover:border-primary/50 transition-all shadow-sm cursor-pointer"
              onClick={() => navigate(`/categories/${cat.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`flex items-center justify-center size-12 rounded-full ${cat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : cat.color === 'purple' ? 'bg-purple-500/10 text-purple-500' : cat.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-pink-500/10 text-pink-500'}`}>
                  <span className="material-symbols-outlined">{cat.icon}</span>
                </div>
                <button className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{cat.transactionCount} Lançamentos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">R$ {cat.totalAmount.toFixed(2)}</p>
              </div>
              <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                <div className={`h-1 rounded-full ${cat.color === 'blue' ? 'bg-blue-500' : cat.color === 'purple' ? 'bg-purple-500' : cat.color === 'yellow' ? 'bg-yellow-500' : 'bg-pink-500'}`} style={{ width: `${Math.min(100, (cat.totalAmount / maxCategoryAmount) * 100)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Total por Participantes</h2>
        </div>
        <div className="flex flex-col bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-5 sm:col-span-4">Participante</div>
            <div className="hidden sm:block sm:col-span-3">Status</div>
            <div className="col-span-4 sm:col-span-3 text-right sm:text-left">Contribuição Total</div>
            <div className="col-span-3 sm:col-span-2 text-right">Ações</div>
          </div>
          {participants.map(p => (
            <div
              key={p.id}
              className="group grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-0 cursor-pointer"
              onClick={() => navigate(`/participants/${p.id}`)}
            >
              <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${p.avatar}')` }}></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.lastPayment}</p>
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${p.status.includes('Deve') ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  <span className={`size-1.5 rounded-full ${p.status.includes('Deve') ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                  {p.status}
                </span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-right sm:text-left">
                <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {p.balance.toFixed(2)}</p>
                <div className="w-24 ml-auto sm:ml-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1.5">
                  <div className="bg-primary h-1 rounded-full" style={{ width: `${(p.balance / maxParticipantBalance) * 100}%` }}></div>
                </div>
              </div>
              <div className="col-span-3 sm:col-span-2 flex justify-end gap-2">
                <button className="hidden sm:flex p-2 text-gray-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Despesas Mensais</h2>
        </div>

        {/* NEW MONTHLY CHART */}
        <MonthlyChart
          data={chartData}
          categories={categories}
          selectedCategoryId={selectedChartCategory}
          onCategoryChange={setSelectedChartCategory}
          loading={chartLoading}
        />

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-4 sm:col-span-4">Descrição</div>
            <div className="col-span-4 sm:col-span-3">Participante</div>
            <div className="hidden sm:block sm:col-span-2">Tipo</div>
            <div className="col-span-2 sm:col-span-2 text-right">Valor</div>
            <div className="col-span-2 sm:col-span-1 text-right">Ação</div>
          </div>
          {monthlyTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma despesa mensal para este mês.
            </div>
          ) : (
            monthlyTransactions.map(tx => (
              <div key={tx.id} className="group grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-0">
                <div className="col-span-4 sm:col-span-4">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tx.description}</p>
                </div>
                <div className="col-span-4 sm:col-span-3 flex items-center gap-2">
                  {tx.participant.avatar ? (
                    <div className="size-6 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${tx.participant.avatar}')` }}></div>
                  ) : (
                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {tx.participant.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-slate-700 dark:text-gray-300 truncate">{tx.participant.name}</span>
                </div>
                <div className="hidden sm:block sm:col-span-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600">
                    Mensal
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-2 text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {Number(tx.amount).toFixed(2)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <button className="flex items-center justify-center size-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors" title="Visualizar">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <button
        className="fixed bottom-8 right-8 size-14 rounded-full bg-primary text-white shadow-xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        onClick={() => navigate('/expenses/new')}
      >
        <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
};


const mapDateToISO = (date: Date): string => {
  return formatISO(date, { representation: 'date' });
};

export default Dashboard;
