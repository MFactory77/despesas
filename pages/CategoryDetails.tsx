import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { useDate } from '../contexts/DateContext';
import { startOfMonth, addMonths, formatISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Category } from '../types';

interface TransactionWithDetails {
  id: string;
  purchase_id: string;
  amount: number;
  due_date: string;
  type: string;
  purchase?: {
    description: string;
    observation?: string;
  };
  participant?: {
    name: string;
    avatar?: string;
  };
}

const CategoryDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedDate } = useDate();

  const [category, setCategory] = useState<Category | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionWithDetails | null>(null);

  useEffect(() => {
    if (id) {
      fetchCategoryDetails();
    }
  }, [id, selectedDate]);

  const fetchCategoryDetails = async () => {
    try {
      setLoading(true);
      const start = mapDateToISO(startOfMonth(selectedDate));
      const nextMonth = addMonths(startOfMonth(selectedDate), 1);
      const end = mapDateToISO(nextMonth);

      // 1. Fetch Category Info
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (catError) throw catError;
      setCategory(catData);

      // 2. Fetch Participants
      const { data: participants, error: partError } = await supabase
        .from('participants')
        .select('id, name, avatar');

      if (partError) throw partError;
      const participantMap = new Map(participants?.map(p => [p.id, p]));

      // 3. Fetch Transactions for this category in the selected month
      const { data: purchases, error: purchError } = await supabase
        .from('purchases')
        .select('id, description, observation')
        .eq('category_id', id);

      if (purchError) throw purchError;

      if (purchases && purchases.length > 0) {
        const purchaseIds = purchases.map(p => p.id);
        const purchaseMap = new Map(purchases.map(p => [p.id, p]));

        const { data: transData, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .in('purchase_id', purchaseIds)
          .gte('due_date', start)
          .lt('due_date', end)
          .order('due_date', { ascending: false });

        if (transError) throw transError;

        const formattedTransactions: TransactionWithDetails[] = (transData || []).map(t => ({
          ...t,
          purchase: purchaseMap.get(t.purchase_id),
          participant: participantMap.get(t.participant_id)
        }));

        setTransactions(formattedTransactions);
      } else {
        setTransactions([]);
      }

    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapDateToISO = (date: Date): string => {
    return formatISO(date, { representation: 'date' });
  };

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const handleDelete = (txId: string) => {
    setTransactionToDelete(txId);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete);

      if (error) throw error;
      setTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete));

      // Fetch transaction details to know who to notify before it's gone from local state (we have it in transactions state)
      const cachedTx = transactions.find(t => t.id === transactionToDelete);
      if (cachedTx) {
        const { data: partData } = await supabase.from('participants').select('user_id').eq('id', cachedTx.participant_id).single();
        if (partData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: partData.user_id,
            type: 'delete',
            message: `Despesa removida: ${cachedTx.description || 'Sem descrição'}`,
            read: false
          });
        }
      }

      toast.success('Parcela removida com sucesso.');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Não foi possível remover a parcela.');
    } finally {
      setTransactionToDelete(null);
    }
  };

  const handleEdit = (tx: TransactionWithDetails) => {
    setCurrentTransaction({ ...tx });
    setIsModalOpen(true);
  };

  const handleExportPDF = () => {
    if (!category) return;

    const doc = new jsPDF();

    // Add Header
    doc.setFontSize(22);
    doc.text('Detalhes da Categoria', 14, 20);

    doc.setFontSize(16);
    doc.text(category.name, 14, 35);
    doc.setFontSize(12);
    doc.text(format(selectedDate, 'MMMM yyyy', { locale: ptBR }), 14, 42);

    doc.setFontSize(14);
    doc.text(`Valor Total: R$ ${totalValue.toFixed(2)}`, 14, 52);

    // Add Table
    autoTable(doc, {
      startY: 60,
      head: [['Data', 'Descrição', 'Participante', 'Tipo', 'Valor']],
      body: transactions.map(tx => [
        format(new Date(tx.due_date), 'dd/MM'),
        tx.purchase?.description || 'Sem descrição',
        tx.participant?.name || 'Desconhecido',
        tx.type,
        `R$ ${Number(tx.amount).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: category.color === 'blue' ? [59, 130, 246] : [100, 100, 100] },
    });

    doc.save(`detalhes-categoria-${category.name}.pdf`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentTransaction) {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            amount: currentTransaction.amount,
            due_date: currentTransaction.due_date,
            type: currentTransaction.type
          })
          .eq('id', currentTransaction.id);

        if (error) throw error;

        // Update purchase observation if it exists
        if (currentTransaction.purchase) {
          const { error: purchaseError } = await supabase
            .from('purchases')
            .update({
              observation: currentTransaction.purchase.observation
            })
            .eq('id', currentTransaction.purchase_id);

          if (purchaseError) throw purchaseError;
        }

        // Update local state
        setTransactions(prev => prev.map(tx => {
          if (tx.id === currentTransaction.id) {
            return currentTransaction;
          }
          if (tx.purchase_id === currentTransaction.purchase_id && tx.purchase && currentTransaction.purchase) {
            return {
              ...tx,
              purchase: {
                ...tx.purchase,
                observation: currentTransaction.purchase.observation
              }
            };
          }
          return tx;
        }));

        setIsModalOpen(false);
        setCurrentTransaction(null);
        toast.success('Lançamento atualizado com sucesso!');

        // Notify
        const { data: partData } = await supabase.from('participants').select('user_id').eq('id', currentTransaction.participant_id).single();
        if (partData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: partData.user_id,
            type: 'update',
            message: `Despesa atualizada: ${currentTransaction.description || 'Item'} agora é R$ ${currentTransaction.amount}`,
            read: false
          });
        }
      } catch (err) {
        console.error('Error updating transaction:', err);
        toast.error('Erro ao atualizar lançamento.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (currentTransaction) {
      const { name, value } = e.target;
      setCurrentTransaction(prev => prev ? ({
        ...prev,
        [name]: name === 'amount' ? parseFloat(value) : value
      }) : null);
    }
  };

  const totalValue = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!category) {
    return <div className="p-8 text-center">Categoria não encontrada.</div>;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col animate-in slide-in-from-left duration-300">
      <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate('/dashboard')} className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar para Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-slate-900 dark:text-white">Detalhes da Categoria</span>
        </nav>

        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className={`flex items-center justify-center size-16 md:size-20 rounded-2xl ${category.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : category.color === 'purple' ? 'bg-purple-500/10 text-purple-500' : category.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-pink-500/10 text-pink-500'} shrink-0`}>
              <span className="material-symbols-outlined text-[40px]">{category.icon}</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{category.name}</h2>
              <p className="text-base font-medium text-gray-500 mt-1 capitalize">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</p>
            </div>
          </div>
          <div className="flex flex-col md:items-end w-full md:w-auto border-t md:border-t-0 border-gray-100 dark:border-gray-800 pt-4 md:pt-0">
            <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Valor Total</span>
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">R$ {totalValue.toFixed(2)}</span>
            <div className="mt-4 flex gap-3 w-full md:w-auto">
              <button
                onClick={handleExportPDF}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-slate-700 dark:text-gray-300 font-bold text-sm transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                Exportar para PDF
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-20">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Lançamentos</h3>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{transactions.length} registros</span>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-3 sm:col-span-2">Data</div>
              <div className="col-span-4 sm:col-span-3">Descrição</div>
              <div className="col-span-3 sm:col-span-2">Participante</div>
              <div className="hidden sm:block sm:col-span-2">Tipo</div>
              <div className="col-span-2 sm:col-span-2 text-right">Valor</div>
              <div className="hidden sm:block sm:col-span-1 text-right pr-2">Ações</div>
            </div>

            {transactions.map(tx => (
              <div key={tx.id} className="group grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-0 hidden-last-border">
                <div className="col-span-3 sm:col-span-2 text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400">calendar_today</span>
                  {format(new Date(tx.due_date), 'dd MMM', { locale: ptBR })}
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tx.purchase?.description || 'Sem descrição'}</p>
                  <p className="text-xs text-gray-500 truncate sm:hidden">{tx.type}</p>
                </div>
                <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                  {tx.participant?.avatar ? (
                    <div className="size-6 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${tx.participant.avatar}')` }}></div>
                  ) : (
                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {tx.participant?.name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                  )}
                  <span className="text-sm text-slate-700 dark:text-gray-300 truncate">{tx.participant?.name || 'Desconhecido'}</span>
                </div>
                <div className="hidden sm:block sm:col-span-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tx.type === 'single' ? 'bg-blue-500/10 text-blue-600' : tx.type === 'installment' ? 'bg-purple-500/10 text-purple-600' : 'bg-orange-500/10 text-orange-600'}`}>
                    {tx.type === 'single' ? 'À Vista' : tx.type === 'installment' ? 'Parcelado' : 'Mensal'}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-2 text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {Number(tx.amount).toFixed(2)}</p>
                </div>
                <div className="col-span-12 sm:col-span-1 flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(tx)}
                    className="flex items-center justify-center size-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="flex items-center justify-center size-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhum lançamento encontrado para este período.
              </div>
            )}
          </div>
        </section>
      </div>

      <button
        onClick={() => navigate('/expenses/new')}
        className="fixed bottom-8 right-8 flex items-center justify-center size-14 bg-primary text-white rounded-full shadow-xl shadow-primary/40 hover:bg-blue-600 hover:scale-105 transition-all z-40"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Lançamento">
        {currentTransaction && (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Descrição (da compra original)</label>
              <input
                disabled
                value={currentTransaction.purchase?.description || ''}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-slate-700 p-2.5 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-orange-500">A descrição não pode ser alterada aqui pois pertence à compra original.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Participante</label>
              <input
                disabled
                value={currentTransaction.participant?.name || 'Desconhecido'}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-slate-700 p-2.5 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Observação (da compra original)</label>
              <textarea
                value={currentTransaction.purchase?.observation || ''}
                onChange={(e) => setCurrentTransaction(prev => prev ? ({ ...prev, purchase: { ...prev.purchase!, observation: e.target.value } }) : null)}
                className="w-full h-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Data de Vencimento</label>
                <input
                  name="due_date"
                  type="date"
                  value={currentTransaction.due_date}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Valor</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  value={currentTransaction.amount}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Tipo</label>
              <select
                name="type"
                value={currentTransaction.type}
                onChange={handleInputChange}
                disabled
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-slate-700 p-2.5 text-sm text-gray-500 cursor-not-allowed outline-none"
              >
                <option value="single">À vista</option>
                <option value="installment">Parcelado</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-blue-600 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        title="Confirmar Exclusão"
      >
        <div className="flex flex-col gap-4">
          <p className="text-slate-600 dark:text-gray-300">
            Tem certeza que deseja remover esta parcela?<br />
            <span className="text-sm text-slate-500 mt-1 block">Esta ação não pode ser desfeita e a compra original será mantida.</span>
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setTransactionToDelete(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryDetails;
