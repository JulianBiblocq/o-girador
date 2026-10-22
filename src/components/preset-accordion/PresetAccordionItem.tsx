/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check } from 'lucide-react';
import { XiloMegaphone, XiloHourglass } from '../XiloIcons';

interface PresetAccordionItemProps {
  preset: { id: string; name: string; isDraft?: boolean };
  active: boolean;
  isGroupList: boolean;
  isDefault: boolean;
  canEdit: boolean;
  canSetDefaultPreset: boolean;
  icon?: React.ReactNode;
  lang: 'pt' | 'fr';
  onItemClick: (val: string, cloudId?: string) => void;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
}

export const PresetAccordionItem: React.FC<PresetAccordionItemProps> = ({
  preset,
  active,
  isGroupList,
  isDefault,
  canEdit,
  canSetDefaultPreset,
  icon,
  lang,
  onItemClick,
  onToggleDraft,
  onSetDefaultPreset,
}) => {
  return (
    <div key={`cloud:${preset.id}`} className="flex items-center gap-1 w-full min-w-0">
      <button
        type="button"
        title={preset.name}
        onClick={() => onItemClick(`cloud:${preset.id}`, preset.id)}
        className={`flex-1 text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between gap-1 transition-colors cursor-pointer cordel-border-sm min-w-0 ${
          active
            ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-wood)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon ? <span className="text-xs shrink-0">{icon}</span> : null}
          <span className="truncate">{preset.name}</span>
        </span>
        {active && <Check size={12} className="shrink-0 ml-1" />}
      </button>

      {/* Bascule de visibilité Chantier / Publié */}
      {isGroupList && canEdit && (
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleDraft?.(preset.id, preset.isDraft === true);
          }}
          title={
            preset.isDraft === true
              ? (lang === 'pt' ? 'Em obras (oculto dos alunos) - Clique para publicar' : 'En chantier (masqué aux élèves) - Cliquer pour publier')
              : (lang === 'pt' ? 'Publicado para o grupo - Clique para passar a obras' : 'Publié pour le groupe - Cliquer pour passer en chantier')
          }
          className="shrink-0 p-1 cursor-pointer flex items-center justify-center transition-transform hover:scale-110 leading-none"
        >
          {preset.isDraft === true ? (
            <XiloHourglass size={14} className="shrink-0 text-[var(--cordel-text)] opacity-60 hover:opacity-90 transition-opacity" />
          ) : (
            <XiloMegaphone size={14} className="shrink-0 text-[#c25e38] dark:text-[#e07a5f] hover:opacity-90 transition-colors" />
          )}
        </button>
      )}

      {/* Épingle Cactus (Astérisque Cordel) du morceau vedette */}
      {isGroupList && (
        canSetDefaultPreset ? (
          <button
            type="button"
            data-testid={isDefault ? "cactus-default-preset" : "cactus-preset-toggle"}
            aria-label={isDefault ? "Cactus" : "Épingler le morceau"}
            onClick={(e) => {
              e.stopPropagation();
              onSetDefaultPreset?.(isDefault ? null : preset.id);
            }}
            title={
              lang === 'pt'
                ? (isDefault ? 'Ritmo de referência ativo (clique para desafixar)' : 'Fixar como ritmo de referência do grupo')
                : (isDefault ? 'Morceau de travail actif (cliquer pour désépingler)' : 'Épingler comme morceau de travail du groupe')
            }
            className="shrink-0 p-1 cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
          >
            <span
              style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
              className={`font-cactus-star text-xl select-none leading-none inline-flex items-center justify-center transform transition-colors ${
                isDefault
                  ? 'text-[#2d6a4f] dark:text-amber-400 drop-shadow-none dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]'
                  : 'text-[var(--cordel-text)] opacity-20 hover:opacity-80 transition-opacity'
              }`}
            >
              *
            </span>
          </button>
        ) : isDefault ? (
          <span
            data-testid="cactus-default-preset"
            aria-label="Cactus"
            title={lang === 'pt' ? 'Ritmo de referência do grupo' : 'Morceau de travail du groupe'}
            style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
            className="shrink-0 p-1 select-none leading-none text-xl font-cactus-star text-[#2d6a4f] dark:text-amber-400 drop-shadow-none dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] inline-flex items-center justify-center"
          >
            *
          </span>
        ) : (
          <span
            aria-hidden="true"
            style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
            className="shrink-0 p-1 select-none leading-none text-xl font-cactus-star text-[var(--cordel-text)] opacity-20 inline-flex items-center justify-center"
          >
            *
          </span>
        )
      )}
    </div>
  );
};
