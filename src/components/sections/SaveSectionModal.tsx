import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SongSection } from '../../types';
import { guardFeatureWithModal } from '../../utils/cloudWriteGuard';
import { useSaveSectionAction } from './useSaveSectionAction';

interface SaveSectionModalProps {
  section: SongSection;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SaveSectionModal: React.FC<SaveSectionModalProps> = ({ section, onClose, lang }) => {
  const { isAdmin } = useAuth();
  const {
    name,
    setName,
    visibility,
    setVisibility,
    autoGenerateAudio,
    setAutoGenerateAudio,
    handleSave,
    busy,
    userProfile,
  } = useSaveSectionAction({ section, onClose, lang });

  React.useEffect(() => {
    if (!guardFeatureWithModal('cloud_library', userProfile)) {
      onClose();
    }
  }, [userProfile, onClose]);

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-6 max-w-sm w-full rounded-sm cordel-shadow" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-cactus text-2xl font-bold mb-4">
          {lang === 'fr' ? 'Sauvegarder Section Cloud' : 'Salvar Seção na Nuvem'}
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">
            {lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-2 text-sm font-bold text-[var(--cordel-text)] outline-none focus:ring-1 focus:ring-[var(--cordel-border)]"
            disabled={busy}
          />
        </div>
        {(userProfile?.role === 'mestre' || isAdmin) && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="visibilityGlobal"
              checked={visibility === 'admin_global'}
              onChange={(e) => setVisibility(e.target.checked ? 'admin_global' : 'private')}
              disabled={busy}
              className="w-4 h-4 accent-[var(--cordel-wood)]"
            />
            <label htmlFor="visibilityGlobal" className="text-sm font-bold cursor-pointer">
              {lang === 'fr' ? 'Partager dans le catalogue public' : 'Compartilhar no catálogo público'}
            </label>
          </div>
        )}
        <div className="mb-6 flex items-center gap-2">
          <input
            type="checkbox"
            id="autoGenerateAudio"
            checked={autoGenerateAudio}
            onChange={(e) => setAutoGenerateAudio(e.target.checked)}
            disabled={busy}
            className="w-4 h-4 accent-[var(--cordel-wood)]"
          />
          <label htmlFor="autoGenerateAudio" className="text-sm font-bold cursor-pointer">
            {lang === 'fr' ? "Générer l'aperçu audio (Cloud)" : 'Gerar áudio (Cloud)'}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 font-bold border border-[var(--cordel-border)] hover:bg-[var(--cordel-border)]/10 transition-colors cursor-pointer" disabled={busy}>
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || busy || !userProfile}
            className="px-4 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] font-bold disabled:opacity-50 hover:opacity-90 transition-opacity cordel-border-sm flex items-center justify-center min-w-[120px] cursor-pointer"
            title={!userProfile ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : ''}
          >
            {busy ? (lang === 'fr' ? 'En cours...' : 'Salvando...') : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};
