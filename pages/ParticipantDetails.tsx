import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { useDate } from '../contexts/DateContext';
import { startOfMonth, addMonths, formatISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Participant, Category } from '../types';

interface TransactionWithDetails {
  id: string;
  purchase_id: string;
  amount: number;
  due_date: string;
  type: string;
  purchase?: {
    description: string;
    category?: Category;
    observation?: string;
  };
}

const ParticipantDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedDate } = useDate();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionWithDetails | null>(null);

  useEffect(() => {
    if (id) {
      fetchParticipantDetails();
    }
  }, [id, selectedDate]);

  const fetchParticipantDetails = async () => {
    try {
      setLoading(true);
      const start = mapDateToISO(startOfMonth(selectedDate));
      const nextMonth = addMonths(startOfMonth(selectedDate), 1);
      const end = mapDateToISO(nextMonth);

      // 1. Fetch Participant Info
      const { data: partData, error: partError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();

      if (partError) throw partError;
      setParticipant(partData);

      // 2. Fetch Transactions for this participant in the selected month
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('participant_id', id)
        .gte('due_date', start)
        .lt('due_date', end)
        .order('due_date', { ascending: false });

      if (transError) throw transError;

      const rawTransactions = transData || [];

      if (rawTransactions.length > 0) {
        // 3. Fetch related Purchases and Categories
        const purchaseIds = [...new Set(rawTransactions.map(t => t.purchase_id))];

        const { data: purchasesData, error: purchError } = await supabase
          .from('purchases')
          .select('id, description, observation, category_id, categories(*)')
          .in('id', purchaseIds);

        if (purchError) throw purchError;

        // Create a map for fast lookup
        const purchaseMap = new Map();
        purchasesData?.forEach(p => {
          // Flatten structure: purchase has description and "categories" (which is the joined category object)
          // Note: supabase-js usually returns the relation name or singular/plural based on setup.
          // Assuming 'categories' returns a single object if it's many-to-one, or we used select query correctly.
          // Let's assume standard join returns 'categories' property.
          purchaseMap.set(p.id, {
            description: p.description,
            observation: p.observation,
            category: p.categories // This will be the category object
          });
        });

        const formattedTransactions: TransactionWithDetails[] = rawTransactions.map(t => ({
          ...t,
          purchase: purchaseMap.get(t.purchase_id)
        }));

        setTransactions(formattedTransactions);
      } else {
        setTransactions([]);
      }

    } catch (error) {
      console.error('Error fetching participant details:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapDateToISO = (date: Date): string => {
    return formatISO(date, { representation: 'date' });
  };

  const calculateBalance = () => {
    return transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);
  };

  const balance = calculateBalance();
  const hasDebt = balance > 0; // In this context, positive balance usually means amount to pay (debt)

  const handleDelete = async (txId: string) => {
    if (confirm('Tem certeza que deseja excluir esta parcela?')) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', txId);

        if (error) throw error;
        setTransactions(prev => prev.filter(tx => tx.id !== txId));
      } catch (err) {
        console.error('Error deleting transaction:', err);
        alert('Erro ao excluir lançamento.');
      }
    }
  };

  const handleEdit = (tx: TransactionWithDetails) => {
    setCurrentTransaction({ ...tx });
    setIsModalOpen(true);
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
      } catch (err) {
        console.error('Error updating transaction:', err);
        alert('Erro ao atualizar lançamento.');
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

  const handleExportPDF = () => {
    if (!participant) return;

    const doc = new jsPDF();

    // Add Header
    doc.setFontSize(22);
    doc.text(participant.name, 14, 20);

    doc.setFontSize(12);
    doc.text(participant.email, 14, 28);
    doc.text(format(selectedDate, 'MMMM yyyy', { locale: ptBR }), 14, 35);

    doc.setFontSize(14);
    if (hasDebt) {
      doc.setTextColor(220, 38, 38); // Red
      doc.text(`Saldo Devedor: R$ ${balance.toFixed(2)}`, 14, 45);
    } else {
      doc.setTextColor(22, 163, 74); // Green
      doc.text(`Saldo Credor: R$ ${balance.toFixed(2)}`, 14, 45);
    }
    doc.setTextColor(0, 0, 0); // Reset to black

    // Add Table
    autoTable(doc, {
      startY: 55,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: transactions.map(tx => [
        format(new Date(tx.due_date), 'dd/MM'),
        tx.purchase?.description || 'Sem descrição',
        tx.purchase?.category?.name || 'Sem Categoria',
        tx.type === 'single' ? 'À Vista' : tx.type === 'installment' ? 'Parcelado' : 'Mensal',
        `R$ ${Number(tx.amount).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244] },
    });

    const fileName = `detalhes-${participant.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!participant) {
    return <div className="p-8 text-center">Participante não encontrado.</div>;
  }

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 animate-in zoom-in duration-300">
      <nav className="flex mb-8 text-sm font-medium text-slate-500 dark:text-slate-400">
        <ol className="flex items-center space-x-2">
          <li><button onClick={() => navigate('/dashboard')} className="hover:text-primary">Início</button></li>
          <li><span className="material-symbols-outlined text-base">chevron_right</span></li>
          <li><button onClick={() => navigate('/participants')} className="hover:text-primary">Participantes</button></li>
          <li><span className="material-symbols-outlined text-base">chevron_right</span></li>
          <li className="text-slate-900 dark:text-white font-bold">{participant.name}</li>
        </ol>
      </nav>

      <div className="space-y-8">
        <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            <div className="relative shrink-0">
              <div
                className="size-32 rounded-full border-4 border-white dark:border-slate-700 shadow-xl bg-cover bg-center"
                style={{ backgroundImage: `url('${participant.avatar || 'https://via.placeholder.com/150'}')` }}
              ></div>
              <div className="absolute bottom-1 right-1 bg-green-500 size-6 rounded-full border-4 border-surface-light dark:border-surface-dark"></div>
            </div>

            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{participant.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  {participant.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-6 text-sm">
                <span className="material-symbols-outlined text-lg">mail</span>
                <span>{participant.email}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Saldo Devedor</p>
                <div className="flex items-center gap-3">
                  <h3 className={`text-3xl font-bold ${hasDebt ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}`}>
                    R$ {balance.toFixed(2).replace('.', ',')}
                  </h3>
                  {hasDebt && (
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                      <span className="material-symbols-outlined text-base block">priority_high</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleExportPDF}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Lançamentos
          </h3>

          <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 font-semibold">Data da Compra</th>
                    <th className="px-6 py-4 font-semibold min-w-[200px]">Descrição</th>
                    <th className="px-6 py-4 font-semibold">Tipo</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base opacity-50">calendar_today</span>
                          {format(new Date(tx.due_date), 'dd MMM, yyyy', { locale: ptBR })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tx.purchase?.category?.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                            <span className="material-symbols-outlined text-lg">{tx.purchase?.category?.icon || 'category'}</span>
                          </div>
                          <div>
                            <p className="font-medium">{tx.purchase?.description || 'Sem descrição'}</p>
                            <p className="text-xs text-slate-500">{tx.purchase?.category?.name || 'Sem Categoria'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${tx.type === 'single' ? 'bg-green-100 text-green-800 border-green-200' : tx.type === 'monthly' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                          {tx.type === 'single' ? 'À vista' : tx.type === 'installment' ? 'Parcelado' : 'Mensal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">R$ {Number(tx.amount).toFixed(2).replace('.', ',')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tx)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        Nenhum lançamento encontrado para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Observação (da compra original)</label>
              <textarea
                value={currentTransaction.purchase?.observation || ''}
                onChange={(e) => setCurrentTransaction(prev => prev ? ({ ...prev, purchase: { ...prev.purchase!, observation: e.target.value } }) : null)}
                className="w-full h-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">Categoria</label>
              <input
                disabled
                value={currentTransaction.purchase?.category?.name || ''}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-slate-700 p-2.5 text-sm text-gray-500 cursor-not-allowed"
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
    </main >
  );
};

export default ParticipantDetails;
