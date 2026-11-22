import React from 'react';
import { X } from 'lucide-react';
import { Preset } from '../types';
import { useSavePresetToCloud } from '../hooks/useSavePresetToCloud';
import { SavePresetFields } from './save-preset/SavePresetFields';
import { SavePresetProgressBar } from './save-preset/SavePresetProgressBar';
import { SavePresetActionButtons } from './save-preset/SavePresetActionButtons';
import { XiloInfo, XiloLock, XiloMestre } from './XiloIcons';

interface SavePresetModalProps {
  presetData: Preset;
  defaultName: string;
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const SavePresetModal: React.FC<SavePresetModalProps> = (props) => {
  const { onClose, lang } = props;
  const {
    name, setName, isSaving, autoGenerateAudio, setAutoGenerateAudio, isBouncingCloud,
    handleSave, userProfile, groupDisplayName, progress, stepLabel, isExistingPreset,
    isLocked, isMestre, canUpdate, isForeignActivePreset, hasMestreNameConflict,
    isDraft, setIsDraft, isSavedOnCloud, isSuperAdmin, isShowcase, setIsShowcase,
    keepInGroup, setKeepInGroup, canPublishToGroup, canUploadAudio, ownedPrivateCount, maxPrivateCloudPresets,
  } = useSavePresetToCloud(props);

  const busy = isSaving || isBouncingCloud;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] shadow-[8px_8px_0px_var(--cordel-shadow-color)] p-6 max-w-md w-full flex flex-col gap-5 relative">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold uppercase leading-none mb-1 font-cactus">
            {lang === 'fr' ? 'Sauvegarder Preset Cloud' : 'Salvar Preset na Nuvem'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={lang === 'fr' ? 'Fermer' : 'Fechar'}
            className="p-1 text-[var(--cordel-text)] hover:text-[var(--cordel-accent-readable)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {isForeignActivePreset && (
          <div
            data-testid="foreign-mestre-preset-banner"
            className="p-2.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] text-xs font-bold flex items-start gap-2"
          >
            <XiloInfo size={16} className="shrink-0 mt-0.5 text-[var(--cordel-accent-readable)]" />
            <span>
              {lang === 'fr'
                ? 'Ce morceau ouvert appartient au Mestre. La sauvegarde créera un nouveau morceau dans le catalogue.'
                : 'Esta música aberta pertence ao Mestre. Salvar criará uma nova música no catálogo.'}
            </span>
          </div>
        )}

        <SavePresetFields
          name={name} setName={setName} disabled={busy} groupDisplayName={groupDisplayName}
          canPublishToGroup={canPublishToGroup} canUploadAudio={canUploadAudio}
          autoGenerateAudio={autoGenerateAudio} setAutoGenerateAudio={setAutoGenerateAudio}
          isDraft={isDraft} setIsDraft={setIsDraft} isSuperAdmin={isSuperAdmin}
          isShowcase={isShowcase} setIsShowcase={setIsShowcase}
          keepInGroup={keepInGroup} setKeepInGroup={setKeepInGroup}
          ownedPrivateCount={ownedPrivateCount} maxPrivateCloudPresets={maxPrivateCloudPresets}
          lang={lang}
        />

        {hasMestreNameConflict && Boolean(name.trim()) && (
          <div
            data-testid="mestre-homonym-conflict-banner"
            className="p-2.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-status-danger)] border-2 border-[var(--cordel-status-danger)] text-xs font-bold flex items-start gap-2"
          >
            <XiloLock size={16} className="shrink-0 mt-0.5 text-[var(--cordel-status-danger)]" />
            <span>
              {lang === 'fr'
                ? 'Ce titre est déjà utilisé par un morceau du Mestre dans ce groupe. Veuillez saisir un titre distinct.'
                : 'Este título já é usado por uma música do Mestre neste grupo. Digite um título distinto.'}
            </span>
          </div>
        )}

        {isExistingPreset && isLocked && isMestre && (
          <div className="p-2.5 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-gold)] text-xs font-bold flex items-center gap-2">
            <XiloMestre size={16} className="shrink-0 text-[var(--cordel-gold)]" />
            <span>
              {lang === 'fr'
                ? 'Morceau officiel sanctuarisé : En tant que Mestre, la mise à jour directe est autorisée.'
                : 'Música oficial santuarizada: Como Mestre, a atualização direta é permitida.'}
            </span>
          </div>
        )}

        {busy && <SavePresetProgressBar progress={progress} stepLabel={stepLabel} lang={lang} />}

        <SavePresetActionButtons
          onClose={onClose}
          handleSave={handleSave}
          isExistingPreset={isExistingPreset}
          canUpdate={canUpdate}
          isForeignActivePreset={isForeignActivePreset}
          hasMestreNameConflict={hasMestreNameConflict}
          name={name}
          isSaving={isSaving}
          isBouncingCloud={isBouncingCloud}
          hasUser={Boolean(userProfile)}
          isMestre={isMestre}
          isLocked={isLocked}
          isSavedOnCloud={isSavedOnCloud}
          lang={lang}
        />
      </div>
    </div>
  );
};
