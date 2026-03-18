
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Participant } from '../types';

const ManageParticipants: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchParticipants();
    }
  }, [user]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        setParticipants(data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este participante?')) return;

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting participant:', error);
      alert('Erro ao excluir participante');
    }
  };

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col w-full h-full animate-in slide-in-from-right duration-300 gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 dark:text-gray-400 font-medium hover:underline">Dashboard</button>
          <span className="text-gray-500 dark:text-gray-400 font-medium">/</span>
          <span className="text-slate-900 dark:text-white font-medium">Gerenciar Participantes</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-end">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Gerenciar Participantes</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">Gerencie as pessoas envolvidas em suas despesas compartilhadas.</p>
          </div>
          <button
            onClick={() => navigate('/participants/new')}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-900/10"
          >
            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
            <span>Adicionar Participante</span>
          </button>
        </div>
      </div>

      <div className="w-full relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">search</span>
        </div>
        <input
          className="w-full bg-white dark:bg-surface-dark border-none rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-primary shadow-sm"
          placeholder="Buscar participantes por nome ou e-mail"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="hidden md:flex px-4 py-3 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">
          <div className="flex-1">Membro</div>
          <div className="hidden sm:block w-32 text-center">Status</div>
          <div className="w-32 text-right">Ações</div>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Carregando participantes...
            </div>
          ) : participants.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Nenhum participante encontrado.
            </div>
          ) : (
            filteredParticipants.map(p => (
              <div
                key={p.id}
                className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-0 cursor-pointer"
              >
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => navigate(`/participants/${p.id}`)}>
                  {p.avatar ? (
                    <div className="size-12 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${p.avatar}')` }}></div>
                  ) : (
                    <div className="flex items-center justify-center bg-primary/20 text-primary rounded-full size-12 text-lg font-bold shrink-0">
                      {getInitials(p.name)}
                    </div>
                  )}
                  <div className="flex flex-col justify-center min-w-0">
                    <p className="text-slate-900 dark:text-white text-base font-bold truncate">{p.name}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{p.email}</p>
                  </div>
                </div>

                <div className="hidden sm:flex w-32 justify-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {p.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 w-32">
                  <button
                    onClick={() => navigate(`/participants/edit/${p.id}`)}
                    className="flex items-center justify-center size-9 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex items-center justify-center size-9 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 pt-2">
        <span>Mostrando {filteredParticipants.length} participantes</span>
      </div>
    </div>
  );
};

export default ManageParticipants;
