/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Barre de sélection par lot des signaux Cloud et Locaux (< 65 lignes).
 */

import React from 'react';

interface SettingsSignalsBatchBarProps {
  lang: string;
  rhythmSignals: Array<{ id: string; isCloud: boolean }>;
  allSignalIds: string[];
  setSignalsBatch: (ids: string[], enable: boolean, allIds: string[]) => void;
}

export const SettingsSignalsBatchBar: React.FC<SettingsSignalsBatchBarProps> = ({
  lang,
  rhythmSignals,
  allSignalIds,
  setSignalsBatch,
}) => {
  const handleCloudBatch = (enable: boolean) => {
    const cloudIds = rhythmSignals.filter((s) => s.isCloud).map((s) => s.id);
    setSignalsBatch(cloudIds, enable, allSignalIds);
  };

  const handleLocalBatch = (enable: boolean) => {
    const localIds = rhythmSignals.filter((s) => !s.isCloud).map((s) => s.id);
    setSignalsBatch(localIds, enable, allSignalIds);
  };

  const btnStyle = "px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none";
  const btnDangerStyle = "px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-[#8b2a1a] hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-2 border-black p-3 bg-[#eaddcf]/30 mb-2">
      <div className="flex flex-col gap-2">
        <span className="font-bold text-[10px] uppercase text-black/60 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>{lang === 'fr' ? 'Signaux Cloud' : 'Sinais Cloud'}</span>
        </span>
        <div className="flex gap-2">
          <button onClick={() => handleCloudBatch(true)} className={btnStyle}>
            {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
          </button>
          <button onClick={() => handleCloudBatch(false)} className={btnDangerStyle}>
            {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-bold text-[10px] uppercase text-black/60 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span>{lang === 'fr' ? 'Signaux Locaux' : 'Sinais Locais'}</span>
        </span>
        <div className="flex gap-2">
          <button onClick={() => handleLocalBatch(true)} className={btnStyle}>
            {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
          </button>
          <button onClick={() => handleLocalBatch(false)} className={btnDangerStyle}>
            {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
          </button>
        </div>
      </div>
    </div>
  );
};
