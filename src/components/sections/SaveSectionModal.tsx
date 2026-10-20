/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SongSection } from '../../types';
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a] mb-4">
          {lang === 'fr' ? 'Sauvegarder Section Cloud' : 'Salvar Seção na Nuvem'}
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
            {lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
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
              className="w-4 h-4 accent-[#8b2a1a]"
            />
            <label htmlFor="visibilityGlobal" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">
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
            className="w-4 h-4 accent-[#8b2a1a]"
          />
          <label htmlFor="autoGenerateAudio" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">
            {lang === 'fr' ? "Générer l'aperçu audio (☁️)" : 'Gerar áudio (☁️)'}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 font-bold text-[#1a1a1a] hover:bg-[#1a1a1a]/10 transition-colors" disabled={busy}>
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || busy || !userProfile}
            className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[120px]"
            title={!userProfile ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : ''}
          >
            {busy ? (lang === 'fr' ? 'En cours...' : 'Salvando...') : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};
