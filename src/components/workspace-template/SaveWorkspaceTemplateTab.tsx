import React from 'react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { Language } from '../../types';
import { XiloScroll } from '../XiloIcons';
import { WorkspaceTemplateOptionsCheckboxes } from './WorkspaceTemplateOptionsCheckboxes';
import { useSaveWorkspaceTemplate } from './useSaveWorkspaceTemplate';

interface SaveWorkspaceTemplateTabProps {
  lang: Language;
  onClose: () => void;
}

export const SaveWorkspaceTemplateTab: React.FC<SaveWorkspaceTemplateTabProps> = ({
  lang,
  onClose,
}) => {
  const isPt = lang === 'pt';
  const {
    name, setName, computedDefaultName, isSaving, successMessage,
    options, toggleOption, handleSave, tracks,
  } = useSaveWorkspaceTemplate({ lang, onClose });

  const visibleInstruments = tracks
    .filter((t) => !t.isBusFolder || t.isLinkFolder)
    .map((t) => instrumentsConfig[t.instrumentIdx])
    .filter(Boolean);

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 text-[var(--cordel-text)]">
      <div className="flex flex-col gap-1">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]">
          {isPt ? 'Nome do Gabarito' : 'Nom du Gabarit'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={computedDefaultName}
          className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] p-2 text-sm font-cactus font-bold tracking-wider outline-none focus:border-[var(--cordel-accent-readable)] transition-colors"
          autoFocus
        />
        <span className="text-[10px] text-[var(--cordel-text-muted)] font-sans">
          {isPt ? `Padrão : "${computedDefaultName}" (ex: Batuque de Rua, Ensaio...)` : `Par défaut : "${computedDefaultName}" (ex: Batuque de Rue, Répétition...)`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text-muted)]">
          {isPt ? `Instrumentos detectados (${visibleInstruments.length}) :` : `Instruments détectés (${visibleInstruments.length}) :`}
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1.5 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]">
          {visibleInstruments.map((inst, i) => (
            <div key={`${inst.id}-${i}`} className="flex items-center gap-1 bg-[var(--cordel-surface-elevated)] px-2 py-0.5 border border-[var(--cordel-border)] text-[10px] font-cactus font-bold text-[var(--cordel-text)]">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-3.5 h-3.5 object-contain" />
              <span>{inst.name}</span>
            </div>
          ))}
        </div>
      </div>

      <WorkspaceTemplateOptionsCheckboxes options={options} toggleOption={toggleOption} lang={lang} />

      {successMessage && (
        <div className="bg-[var(--cordel-status-success)] border-2 border-[var(--cordel-border-strong)] text-[var(--cordel-on-accent)] px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-2 pt-3 border-t-2 border-[var(--cordel-border)]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:border-[var(--cordel-accent-readable)] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
        >
          {isPt ? 'Cancelar' : 'Annuler'}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] cursor-pointer disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
        >
          <XiloScroll size={14} className="shrink-0 stroke-[2.5]" />
          <span>{isSaving ? (isPt ? 'Salvando...' : 'Enregistrement...') : isPt ? 'Memorizar o gabarito' : 'Mémoriser le gabarit'}</span>
        </button>
      </div>
    </form>
  );
};
