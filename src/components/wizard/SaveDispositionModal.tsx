/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatDispositionSummary } from '../../utils/dispositionUtils';
import { SaveDispositionVisibilitySelector } from './save-disposition/SaveDispositionVisibilitySelector';
import { useSaveDispositionAction } from './save-disposition/useSaveDispositionAction';

interface SaveDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'pt';
  onSuccess?: (presetName: string) => void;
}

export const SaveDispositionModal: React.FC<SaveDispositionModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess,
}) => {
  const {
    name,
    setName,
    visibility,
    setVisibility,
    isSubmitting,
    errorMsg,
    handleSave,
    hasGroup,
    isMestreOrAdmin,
    userProfile,
    placedInstruments,
    hasToada,
  } = useSaveDispositionAction({ lang, onSuccess, onClose });

  if (!isOpen) return null;

  const summary = formatDispositionSummary(
    placedInstruments.map((i) => ({ instrumentType: i.instrumentType, x: i.x, y: i.y })),
    lang
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#f4ecd8] border-3 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] text-[#1a1a1a] flex flex-col gap-4 font-cactus" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
            <span></span>
            {lang === 'fr' ? 'Enregistrer la Disposition' : 'Salvar a Disposição'}
          </h3>
          <button onClick={onClose} type="button" className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer"></button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-[#1a1a1a]">{lang === 'fr' ? 'Nom de la disposition :' : 'Nome da disposição :'}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maracatu de Baque Virado"
              autoFocus
              className="w-full bg-[#fdfaf3] text-[#1a1a1a] border-2 border-[#1a1a1a] px-3 py-2 text-sm font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] outline-none focus:bg-white"
            />
          </div>

          <div className="p-2.5 bg-[#ece4d0] border-2 border-[#1a1a1a] text-[11px] flex flex-col gap-1">
            <span className="font-bold uppercase tracking-wider text-[#8b2a1a]">{lang === 'fr' ? 'Configuration actuelle :' : 'Configuração atual :'}</span>
            <span className="leading-tight text-[#1a1a1a]/80">{summary}</span>
            {hasToada && <span className="text-[10px] text-[#2e5339] font-bold mt-0.5">{lang === 'fr' ? 'Chant / Toada inclus' : 'Canto / Toada incluído'}</span>}
          </div>

          <SaveDispositionVisibilitySelector
            visibility={visibility}
            onChange={setVisibility}
            hasGroup={hasGroup}
            groupName={userProfile?.groupName || userProfile?.groupId}
            isMestreOrAdmin={isMestreOrAdmin}
            lang={lang}
          />

          {errorMsg && <div className="p-2 bg-[#8b2a1a]/10 border-2 border-[#8b2a1a] text-[#8b2a1a] text-xs font-bold">{errorMsg}</div>}

          <div className="flex justify-end gap-2 pt-2 border-t-2 border-[#1a1a1a]">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[#d7cfbb] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer uppercase font-bold text-xs">{lang === 'fr' ? 'Annuler' : 'Cancelar'}</button>
            <button type="submit" disabled={isSubmitting || placedInstruments.length === 0} className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer uppercase font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (lang === 'fr' ? 'Enregistrement...' : 'Salvando...') : lang === 'fr' ? 'Enregistrer' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
