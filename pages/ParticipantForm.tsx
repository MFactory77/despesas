import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ParticipantForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'active',
    avatar: ''
  });
  const [avatarTab, setAvatarTab] = useState<'select' | 'upload'>('select');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // Cartoon style avatars (DiceBear Avataaars)
  const presetAvatars = [
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Bob',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Calista',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Jocelyn',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Midnight',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Shadow',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Tinkerbell',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Bubba',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Leo',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Misty'
  ];

  useEffect(() => {
    if (isEdit && id) {
      fetchParticipant(id);
    }
  }, [isEdit, id]);

  // Update default avatar when name changes if no custom avatar is set
  useEffect(() => {
    if (!formData.avatar && formData.name) {
      // Just a visual helper, avoiding complex state loops. 
      // We won't auto-set it strictly to avoid overwriting user choice, 
      // but we can use it as a fallback for the preview if avatar is empty.
    }
  }, [formData.name]);

  const fetchParticipant = async (participantId: string) => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('participants')
        .select('name, email, status, avatar')
        .eq('id', participantId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          email: data.email,
          status: data.status || 'active',
          avatar: data.avatar || ''
        });
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
      alert('Erro ao carregar dados do participante.');
      navigate('/participants');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const avatarToSave = formData.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`;

      if (isEdit) {
        const { error } = await supabase
          .from('participants')
          .update({
            name: formData.name,
            email: formData.email,
            status: formData.status,
            avatar: avatarToSave
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('participants')
          .insert([{
            user_id: user.id,
            name: formData.name,
            email: formData.email,
            status: formData.status,
            avatar: avatarToSave
          }]);

        if (error) throw error;
      }

      navigate('/participants');
    } catch (error) {
      console.error('Error saving participant:', error);
      alert('Erro ao salvar participante.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id: fieldId, value } = e.target;
    // Map 'full_name' input id to 'name' state property
    const name = fieldId === 'full_name' ? 'name' : fieldId;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarSelect = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Determine avatar to show in preview
  // Use formData.avatar if set, otherwise generate one from name or use a default 'User' seed
  const previewAvatar = formData.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(formData.name || 'User')}`;

  return (
    <div className="layout-container flex h-full grow flex-col animate-in fade-in duration-300">
      <div className="md:px-10 lg:px-40 flex flex-1 justify-center py-5">
        <div className="layout-content-container flex flex-col max-w-[960px] flex-1 w-full">
          <div className="flex flex-wrap gap-2 px-4 py-2">
            <button onClick={() => navigate('/participants')} className="text-[#6b7280] dark:text-[#92adc9] text-sm font-medium hover:underline">Participantes</button>
            <span className="text-[#6b7280] dark:text-[#92adc9] text-sm font-medium">/</span>
            <span className="text-[#111418] dark:text-white text-sm font-medium">{isEdit ? 'Edição de Participante' : 'Cadastro de Participante'}</span>
          </div>

          <div className="flex flex-col gap-2 px-4 py-4">
            <h1 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
              {isEdit ? 'Editar Participante' : 'Cadastro de Participante'}
            </h1>
            <p className="text-[#6b7280] dark:text-[#92adc9] text-base font-normal leading-normal">
              Preencha as informações abaixo para {isEdit ? 'atualizar' : 'adicionar'} um novo participante às despesas compartilhadas.
            </p>
          </div>

          <div className="px-4 py-3 flex flex-col gap-6">
            <form className="flex flex-col gap-5 bg-white dark:bg-surface-dark p-8 rounded-xl shadow-sm border border-transparent dark:border-[#233648]" onSubmit={handleSubmit}>

              {/* Avatar Section - Centered Layout */}
              <div className="flex flex-col items-center gap-6">
                <h2 className="text-[#111418] dark:text-white text-lg font-bold">Foto de Perfil</h2>

                {/* Preview */}
                <div className="relative group">
                  <div
                    className="size-32 rounded-full bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-700 shadow-lg overflow-hidden"
                  >
                    <img
                      src={previewAvatar}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAvatarTab('select')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${avatarTab === 'select' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  >
                    Selecionar Avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarTab('upload')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${avatarTab === 'upload' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  >
                    Upload Foto
                  </button>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-md bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  {avatarTab === 'select' ? (
                    <div className="grid grid-cols-4 gap-4 justify-items-center">
                      {presetAvatars.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAvatarSelect(url)}
                          className={`size-14 rounded-full bg-white dark:bg-gray-700 overflow-hidden border-2 transition-all hover:scale-110 shadow-sm ${formData.avatar === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-300'}`}
                        >
                          <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => window.open('https://getavataaars.com/', '_blank')}
                        className="size-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title="Criar Customizado"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <input
                        className="w-full rounded-lg border-gray-300 dark:border-[#233648] bg-white dark:bg-background-dark text-[#111418] dark:text-white px-4 py-3 text-sm focus:border-primary focus:ring-primary focus:ring-opacity-50 transition-colors"
                        id="avatar_url"
                        placeholder="https://exemplo.com/sua-foto.png"
                        type="url"
                        value={formData.avatar}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                      />
                      <p className="text-xs text-center text-gray-500">
                        Cole o link de uma imagem da web (ex: GitHub, Gravatar).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>

              {/* Form Fields */}
              <div className="flex flex-col gap-2">
                <label className="text-[#111418] dark:text-white text-sm font-bold" htmlFor="full_name">Nome Completo</label>
                <input
                  className="w-full rounded-lg border-gray-300 dark:border-[#233648] bg-background-light dark:bg-background-dark text-[#111418] dark:text-white px-4 py-3 text-base focus:border-primary focus:ring-primary focus:ring-opacity-50 transition-colors"
                  id="full_name"
                  placeholder="Ex: João Silva"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[#111418] dark:text-white text-sm font-bold" htmlFor="email">E-mail</label>
                <input
                  className="w-full rounded-lg border-gray-300 dark:border-[#233648] bg-background-light dark:bg-background-dark text-[#111418] dark:text-white px-4 py-3 text-base focus:border-primary focus:ring-primary focus:ring-opacity-50 transition-colors"
                  id="email"
                  placeholder="Ex: joao.silva@exemplo.com"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[#111418] dark:text-white text-sm font-bold" htmlFor="status">Status</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-lg border-gray-300 dark:border-[#233648] bg-background-light dark:bg-background-dark text-[#111418] dark:text-white px-4 py-3 text-base focus:border-primary focus:ring-primary transition-colors"
                    id="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#6b7280] dark:text-[#92adc9]">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse md:flex-row gap-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/participants')}
                  className="w-full md:w-auto px-6 py-3 rounded-lg border border-gray-300 dark:border-[#233648] text-[#111418] dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-[#233648] transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-3 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/10 transition-colors flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : (isEdit ? 'Atualizar Participante' : 'Salvar Participante')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantForm;
