import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { XiloMegaphone, XiloHourglass } from '../XiloIcons';

interface PresetAccordionItemProps {
  preset: { id: string; name: string; isDraft?: boolean; ownerId?: string; audioUrl?: string | null };
  active: boolean;
  isGroupList: boolean;
  isDefault: boolean;
  canEdit: boolean;
  canSetDefaultPreset: boolean;
  canDelete?: boolean;
  icon?: React.ReactNode;
  lang: 'pt' | 'fr';
  onItemClick: (val: string, cloudId?: string) => void;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  onDeletePreset?: (preset: { id: string; name: string; audioUrl?: string | null }) => Promise<void> | void;
}

export const PresetAccordionItem: React.FC<PresetAccordionItemProps> = ({
  preset, active, isGroupList, isDefault, canEdit, canSetDefaultPreset, canDelete,
  icon, lang, onItemClick, onToggleDraft, onSetDefaultPreset, onDeletePreset,
}) => {
  const stopEvent = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div key={`cloud:${preset.id}`} className="flex items-center gap-1 w-full min-w-0">
      <button
        type="button"
        title={preset.name}
        onClick={() => onItemClick(`cloud:${preset.id}`, preset.id)}
        className={`flex-1 text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between gap-1 transition-colors cursor-pointer cordel-border-sm min-w-0 ${
          active ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-wood)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon ? <span className="text-xs shrink-0">{icon}</span> : null}
          <span className="truncate">{preset.name}</span>
        </span>
        {active && <Check size={12} className="shrink-0 ml-1" />}
      </button>

      {/* Colonne d'actions à droite : largeur fixe et alignement strict */}
      <div className="flex items-center justify-end shrink-0 gap-0.5">
        {/* Slot 1 : Sablier / Mégaphone */}
        {isGroupList && canEdit ? (
          <button
            type="button"
            onPointerDown={stopEvent} onMouseDown={stopEvent}
            onClick={(e) => { stopEvent(e); onToggleDraft?.(preset.id, preset.isDraft === true); }}
            title={preset.isDraft === true
              ? (lang === 'pt' ? 'Em obras (oculto dos alunos) - Clique para publicar' : 'En chantier (masqué aux élèves) - Cliquer pour publier')
              : (lang === 'pt' ? 'Publicado para o grupo - Clique para passar a obras' : 'Publié pour le groupe - Cliquer pour passer en chantier')}
            className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-transform hover:scale-110 leading-none"
          >
            {preset.isDraft === true ? (
              <XiloHourglass size={14} className="shrink-0 text-[var(--cordel-text)] opacity-60 hover:opacity-90 transition-opacity" />
            ) : (
              <XiloMegaphone size={14} className="shrink-0 text-[#c25e38] dark:text-[#e07a5f] hover:opacity-90 transition-colors" />
            )}
          </button>
        ) : isGroupList ? (
          <span className="w-6 h-6 shrink-0" />
        ) : null}

        {/* Slot 2 : Corbeille */}
        {canDelete ? (
          <button
            type="button"
            onPointerDown={stopEvent} onMouseDown={stopEvent}
            onClick={(e) => { stopEvent(e); onDeletePreset?.(preset); }}
            title={lang === 'pt' ? 'Excluir esta música do catálogo' : 'Supprimer ce morceau du catalogue'}
            className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-colors text-[var(--cordel-text)] opacity-40 hover:opacity-100 hover:text-red-700 dark:hover:text-red-400 leading-none"
          >
            <Trash2 size={13} className="shrink-0" />
          </button>
        ) : (
          <span className="w-6 h-6 shrink-0" />
        )}

        {/* Slot 3 : Épingle Cactus */}
        {isGroupList && (
          canSetDefaultPreset ? (
            <button
              type="button"
              data-testid={isDefault ? "cactus-default-preset" : "cactus-preset-toggle"}
              aria-label={isDefault ? "Cactus" : "Épingler le morceau"}
              onClick={(e) => { e.stopPropagation(); onSetDefaultPreset?.(isDefault ? null : preset.id); }}
              title={lang === 'pt'
                ? (isDefault ? 'Ritmo de referência ativo (clique para desafixar)' : 'Fixar como ritmo de referência do grupo')
                : (isDefault ? 'Morceau de travail actif (cliquer pour désépingler)' : 'Épingler comme morceau de travail du groupe')}
              className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
            >
              <span
                style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
                className={`font-cactus-star text-xl select-none leading-none inline-flex items-center justify-center transform transition-colors ${
                  isDefault ? 'text-[#2d6a4f] dark:text-amber-400 drop-shadow-none dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]' : 'text-[var(--cordel-text)] opacity-20 hover:opacity-80 transition-opacity'
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
              className="w-6 h-6 shrink-0 select-none leading-none text-xl font-cactus-star text-[#2d6a4f] dark:text-amber-400 drop-shadow-none dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] inline-flex items-center justify-center"
            >
              *
            </span>
          ) : (
            <span className="w-6 h-6 shrink-0" />
          )
        )}
      </div>
    </div>
  );
};
