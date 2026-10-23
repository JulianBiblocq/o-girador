/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SavePresetFieldsProps {
  name: string;
  setName: (v: string) => void;
  disabled: boolean;
  groupDisplayName: string;
  autoGenerateAudio: boolean;
  setAutoGenerateAudio: (v: boolean) => void;
  isDraft: boolean;
  setIsDraft: (v: boolean) => void;
  lang: 'fr' | 'pt';
}

export const SavePresetFields: React.FC<SavePresetFieldsProps> = ({
  name,
  setName,
  disabled,
  groupDisplayName,
  autoGenerateAudio,
  setAutoGenerateAudio,
  isDraft,
  setIsDraft,
  lang,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase">
          {lang === 'fr' ? 'Nom du Preset' : 'Nome do Preset'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          placeholder="Ex: Opanijé"
          className="w-full bg-white dark:bg-stone-900 text-[var(--cordel-text,#1a1a1a)] border-2 border-[var(--cordel-border,#1a1a1a)] px-3 py-2 text-sm font-bold outline-none focus:bg-black/5 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1 p-3 bg-black/5 border-2 border-[var(--cordel-border,#1a1a1a)]">
        <label className="text-xs font-bold uppercase">{lang === 'fr' ? 'Destination' : 'Destino'}</label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold flex items-center gap-1.5">
            {lang === 'fr' ? `Catalogue ${groupDisplayName} (Privé)` : `Catálogo ${groupDisplayName} (Privado)`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-black/5 border-2 border-[var(--cordel-border,#1a1a1a)]">
        <input
          type="checkbox"
          id="autoGenerateAudio"
          checked={autoGenerateAudio}
          onChange={(e) => setAutoGenerateAudio(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 accent-[var(--cordel-wood,#8b2a1a)]"
        />
        <label htmlFor="autoGenerateAudio" className="text-sm font-bold cursor-pointer">
          {lang === 'fr' ? "Générer l'audio" : 'Gerar áudio'}
        </label>
      </div>

      <div className="flex items-center gap-2 p-3 bg-black/5 border-2 border-[var(--cordel-border,#1a1a1a)]">
        <input
          type="checkbox"
          id="isDraftPreset"
          checked={isDraft}
          onChange={(e) => setIsDraft(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 accent-[var(--cordel-wood,#8b2a1a)]"
        />
        <label htmlFor="isDraftPreset" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
          <span></span>
          <span>
            {lang === 'fr'
              ? 'Enregistrer en mode Brouillon / Chantier (masqué aux élèves)'
              : 'Salvar em modo Rascunho / Canteiro (oculto aos alunos)'}
          </span>
        </label>
      </div>
    </div>
  );
};
