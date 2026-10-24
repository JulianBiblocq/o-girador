/**
 * Onglet de memorisation/sauvegarde d'un gabarit de batuque (< 110 lignes).
 */
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
  const {
    name, setName, computedDefaultName, isSaving, successMessage,
    options, toggleOption, handleSave, tracks,
  } = useSaveWorkspaceTemplate({ lang, onClose });

  const visibleInstruments = tracks
    .filter((t) => !t.isBusFolder || t.isLinkFolder)
    .map((t) => instrumentsConfig[t.instrumentIdx])
    .filter(Boolean);

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#1a1a1a]">
          {lang === 'pt' ? 'Nome do Gabarito' : 'Nom du Gabarit'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={computedDefaultName}
          className="bg-white border-2 border-[#1a1a1a] p-2 text-sm font-cactus font-bold tracking-wider outline-none focus:bg-[#fbf8f0] transition-colors"
          autoFocus
        />
        <span className="text-[10px] text-[#1a1a1a]/60 font-sans">
          {lang === 'pt' ? `Padrão : "${computedDefaultName}" (ex: Samambaia, Batuque Nação...)` : `Par défaut : "${computedDefaultName}" (ex: Samambaia, Batuque Nação...)`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#1a1a1a]/70">
          {lang === 'pt' ? `Instrumentos detectados (${visibleInstruments.length}) :` : `Instruments détectés (${visibleInstruments.length}) :`}
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1.5 bg-white/40 border border-[#1a1a1a]/20">
          {visibleInstruments.map((inst, i) => (
            <div key={`${inst.id}-${i}`} className="flex items-center gap-1 bg-white px-2 py-0.5 border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] text-[10px] font-cactus font-bold text-[#1a1a1a]">
              <img src={`${ASSETS_BASE_URL}${inst.iconImg}`} alt={inst.name} className="w-3.5 h-3.5 object-contain" />
              <span>{inst.name}</span>
            </div>
          ))}
        </div>
      </div>

      <WorkspaceTemplateOptionsCheckboxes options={options} toggleOption={toggleOption} lang={lang} />

      {successMessage && (
        <div className="bg-emerald-100 border-2 border-emerald-800 text-emerald-900 px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_#065f46]">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-2 pt-3 border-t-2 border-[#1a1a1a]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#1a1a1a]/5 cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
        >
          {lang === 'pt' ? 'Cancelar' : 'Annuler'}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#a83220] cursor-pointer disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5"
        >
          <XiloScroll size={14} className="shrink-0 stroke-[2.5]" />
          <span>{isSaving ? (lang === 'pt' ? 'Salvando...' : 'Enregistrement...') : lang === 'pt' ? 'Memorizar o gabarito' : 'Mémoriser le gabarit'}</span>
        </button>
      </div>
    </form>
  );
};
