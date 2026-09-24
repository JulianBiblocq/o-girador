import React from 'react';
import { Preset } from '../types';
import { useSavePresetToCloud } from '../hooks/useSavePresetToCloud';

interface SavePresetModalProps {
  presetData: Preset;
  defaultName: string;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SavePresetModal: React.FC<SavePresetModalProps> = (props) => {
  const { onClose, lang } = props;
  const {
    name,
    setName,
    isSaving,
    autoGenerateAudio,
    setAutoGenerateAudio,
    isBouncingCloud,
    handleSave,
    userProfile,
    groupDisplayName,
    progress,
    stepLabel
  } = useSavePresetToCloud(props);

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full flex flex-col gap-6 relative">
        {/* En-tête de la modale */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] uppercase leading-none mb-1">
              {lang === 'fr' ? 'Sauvegarder Preset Cloud' : 'Salvar Preset na Nuvem'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving || isBouncingCloud}
            className="text-2xl hover:scale-110 transition-transform font-bold leading-none disabled:opacity-30 disabled:pointer-events-none"
          >
            ×
          </button>
        </div>

        {/* Champs du formulaire */}
        <div className="flex flex-col gap-4">
          {/* Nom du preset */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Nom du Preset' : 'Nome do Preset'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving || isBouncingCloud}
              placeholder="Ex: Opanijé"
              className="w-full bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 text-sm font-bold outline-none focus:bg-[#1a1a1a]/5 disabled:opacity-50"
            />
          </div>

          {/* Destination / Visibilité */}
          <div className="flex flex-col gap-1 p-3 bg-black/5 border-2 border-[#1a1a1a]">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">
              {lang === 'fr' ? 'Destination' : 'Destino'}
            </label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-[#1a1a1a] flex items-center gap-1.5">
                🔒 {lang === 'fr' ? `Catalogue ${groupDisplayName} (Privé)` : `Catálogo ${groupDisplayName} (Privado)`}
              </span>
            </div>
          </div>

          {/* Option aperçu audio */}
          <div className="flex items-center gap-2 p-3 bg-[#1a1a1a]/5 border-2 border-[#1a1a1a]">
            <input
              type="checkbox"
              id="autoGenerateAudio"
              checked={autoGenerateAudio}
              onChange={(e) => setAutoGenerateAudio(e.target.checked)}
              disabled={isSaving || isBouncingCloud}
              className="w-4 h-4 accent-[#8b2a1a]"
            />
            <label htmlFor="autoGenerateAudio" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">
              {lang === 'fr' ? 'Générer l\'audio' : 'Gerar áudio'}
            </label>
          </div>
        </div>

        {/* Barre de progression Cordel lors du rebond audio / sauvegarde */}
        {(isSaving || isBouncingCloud) && (
          <div className="flex flex-col gap-1.5 p-3 bg-black/5 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center text-xs font-bold text-[#1a1a1a]">
              <span className="flex items-center gap-1.5 truncate">
                <svg className="animate-spin h-3.5 w-3.5 text-[#8b2a1a] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {stepLabel || (lang === 'fr' ? 'Sauvegarde en cours...' : 'Salvando...')}
              </span>
              <span className="font-mono text-xs font-extrabold text-[#8b2a1a] ml-2 shrink-0">
                {progress}%
              </span>
            </div>

            {/* Rail de progression */}
            <div className="w-full h-3 bg-stone-200 dark:bg-stone-800 border border-[#1a1a1a] overflow-hidden">
              {/* Jauge */}
              <div
                className="h-full bg-[#8b2a1a] transition-all duration-200 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>

            {/* Mention d'aide tab focus */}
            <p className="text-[10px] text-stone-600 dark:text-stone-400 italic mt-0.5 leading-tight">
              {lang === 'fr' 
                ? '⚠️ Veuillez laisser l\'onglet ouvert au premier plan pendant l\'enregistrement.'
                : '⚠️ Por favor, mantenha esta aba aberta em primeiro plano durante a gravação.'}
            </p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-[#1a1a1a] hover:bg-[#1a1a1a]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={isSaving || isBouncingCloud}
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || isBouncingCloud || !userProfile}
            className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[120px]"
            title={!userProfile ? (lang === 'fr' ? 'Connectez-vous pour sauvegarder' : 'Conecte-se para salvar') : ''}
          >
            {(isSaving || isBouncingCloud) ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {lang === 'fr' ? 'En cours...' : 'Salvando...'}
              </span>
            ) : (lang === 'fr' ? 'Sauvegarder' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
};
