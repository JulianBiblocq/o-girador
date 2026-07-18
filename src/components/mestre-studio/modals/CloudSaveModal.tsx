import React, { useState } from 'react';
import { Trash2, Square, Cloud } from 'lucide-react';
import { Language } from '../../../types';

interface CloudSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  activeTab: string;
  onSave: (name: string) => Promise<void>;
}

export const CloudSaveModal: React.FC<CloudSaveModalProps> = ({
  isOpen,
  onClose,
  lang,
  activeTab,
  onSave
}) => {
  const [cloudSaveName, setCloudSaveName] = useState('');
  const [cloudSaveError, setCloudSaveError] = useState('');
  const [cloudSaveSuccess, setCloudSaveSuccess] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!cloudSaveName.trim()) {
      setCloudSaveError(lang === 'fr' ? "Veuillez entrer un nom." : "Por favor, insira um nome.");
      return;
    }

    setIsSavingCloud(true);
    setCloudSaveError('');
    setCloudSaveSuccess('');

    try {
      await onSave(cloudSaveName);
      setCloudSaveSuccess(lang === 'fr' ? "Sauvegardé avec succès !" : "Salvo com sucesso !");
      setTimeout(() => {
        setCloudSaveName('');
        setCloudSaveSuccess('');
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err.message === 'NAME_EXISTS') {
        setCloudSaveError(lang === 'fr' ? "Un élément avec ce nom existe déjà." : "Um item com este nome já existe.");
      } else {
        setCloudSaveError(lang === 'fr' ? "Erreur de sauvegarde." : "Erro ao salvar.");
      }
    } finally {
      setIsSavingCloud(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-md p-6 relative flex flex-col gap-4">
        <button onClick={onClose} className="absolute top-2 right-2 text-[var(--cordel-text)]/50 hover:text-[var(--cordel-text)]">
          <Trash2 className="w-5 h-5"/>
        </button>
        <h3 className="font-cactus text-2xl font-black text-[var(--cordel-wood)] text-center uppercase">
          {lang === 'fr' ? 'Enregistrer sur le Cloud' : 'Salvar na Nuvem'}
        </h3>
        
        <p className="text-sm text-center text-[var(--cordel-text)]/80 mb-4 font-bold">
          {activeTab === 'varal'
            ? (lang === 'fr' ? 'Nommez cette progression (ex: "Débutant 2026")' : 'Nomeie esta progressão (ex: "Iniciante 2026")')
            : (lang === 'fr' ? 'Nommez cet exercice (ex: "Quiz Difficile")' : 'Nomeie este exercice (ex: "Quiz Difícil")')}
        </p>

        <input
          type="text"
          placeholder={lang === 'fr' ? 'Nom...' : 'Nome...'}
          value={cloudSaveName}
          onChange={(e) => setCloudSaveName(e.target.value)}
          className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-3 rounded font-bold text-lg text-[var(--cordel-text)]"
        />

        {cloudSaveError && <p className="text-red-600 text-sm font-bold text-center">{cloudSaveError}</p>}
        {cloudSaveSuccess && <p className="text-green-600 text-sm font-bold text-center">{cloudSaveSuccess}</p>}

        <button
          onClick={handleSubmit}
          disabled={isSavingCloud}
          className="w-full bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-black uppercase tracking-widest py-3 mt-2 flex justify-center items-center gap-2 hover:bg-[var(--cordel-wood)] transition-colors disabled:opacity-50"
        >
          {isSavingCloud ? <Square className="w-4 h-4 animate-spin"/> : <Cloud className="w-5 h-5" />}
          {lang === 'fr' ? 'Valider' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};
