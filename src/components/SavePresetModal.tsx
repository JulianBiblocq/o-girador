import React from 'react';
import { Preset } from '../types';
import { useSavePresetToCloud } from '../hooks/useSavePresetToCloud';
import { SavePresetFields } from './save-preset/SavePresetFields';
import { SavePresetProgressBar } from './save-preset/SavePresetProgressBar';
import { SavePresetActionButtons } from './save-preset/SavePresetActionButtons';

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
    stepLabel,
    isExistingPreset,
    isLocked,
    isMestre,
    isDraft,
    setIsDraft,
  } = useSavePresetToCloud(props);

  const busy = isSaving || isBouncingCloud;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] border-4 border-[var(--cordel-border,#1a1a1a)] shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full flex flex-col gap-6 relative">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold uppercase leading-none mb-1">
            {lang === 'fr' ? 'Sauvegarder Preset Cloud' : 'Salvar Preset na Nuvem'}
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-2xl hover:scale-110 transition-transform font-bold leading-none disabled:opacity-30 disabled:pointer-events-none"
          >
            ×
          </button>
        </div>

        <SavePresetFields
          name={name}
          setName={setName}
          disabled={busy}
          groupDisplayName={groupDisplayName}
          autoGenerateAudio={autoGenerateAudio}
          setAutoGenerateAudio={setAutoGenerateAudio}
          isDraft={isDraft}
          setIsDraft={setIsDraft}
          lang={lang}
        />

        {isExistingPreset && isLocked && (
          <div className={`p-2.5 border-2 text-xs font-bold flex items-center gap-2 ${
            isMestre ? 'bg-amber-100 text-amber-950 border-amber-800' : 'bg-stone-200 text-stone-800 border-stone-600'
          }`}>
            <span className="text-base shrink-0">{isMestre ? '' : ''}</span>
            <span>
              {isMestre
                ? (lang === 'fr' ? 'Morceau officiel sanctuarisé : En tant que Mestre, la mise à jour directe est autorisée.' : 'Música oficial santuarizada: Como Mestre, a atualização direta é permitida.')
                : (lang === 'fr' ? 'Morceau officiel verrouillé. Utilisez "Sauvegarder une copie" pour votre version personnelle.' : 'Música oficial bloqueada. Use "Salvar como cópia" para sua versão pessoal.')}
            </span>
          </div>
        )}

        {busy && (
          <SavePresetProgressBar progress={progress} stepLabel={stepLabel} lang={lang} />
        )}

        <SavePresetActionButtons
          onClose={onClose}
          handleSave={handleSave}
          isExistingPreset={isExistingPreset}
          name={name}
          isSaving={isSaving}
          isBouncingCloud={isBouncingCloud}
          hasUser={Boolean(userProfile)}
          isMestre={isMestre}
          isLocked={isLocked}
          lang={lang}
        />
      </div>
    </div>
  );
};
