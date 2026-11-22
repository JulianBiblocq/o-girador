import React from 'react';
import { Trash2 } from 'lucide-react';
import { XiloHourglass, XiloMegaphone, XiloStar } from '../XiloIcons';
import type { CatalogAccordionPresetItem } from './presetAccordionTiers';

interface PresetAccordionItemActionsProps {
  preset: CatalogAccordionPresetItem;
  isGroupList: boolean;
  isDefault: boolean;
  canToggleDraft: boolean;
  canSetDefaultPreset: boolean;
  canDelete: boolean;
  canToggleShowcase: boolean;
  lang: 'pt' | 'fr';
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  onDeletePreset?: (preset: CatalogAccordionPresetItem) => Promise<void> | void;
  onToggleShowcase?: (presetId: string, currentShowcase: boolean) => Promise<void> | void;
}

export const PresetAccordionItemActions: React.FC<PresetAccordionItemActionsProps> = ({
  preset, isGroupList, isDefault, canToggleDraft, canSetDefaultPreset, canDelete,
  canToggleShowcase, lang, onToggleDraft, onSetDefaultPreset, onDeletePreset, onToggleShowcase,
}) => {
  const stopEvent = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  if (preset.isEmbeddedFallback) return null;

  return (
    <div className="flex items-center justify-end shrink-0 gap-0.5">
      {canToggleShowcase && (
        <button
          type="button"
          data-testid={`showcase-toggle-${preset.id}`}
          onPointerDown={stopEvent} onMouseDown={stopEvent}
          onClick={(e) => { stopEvent(e); onToggleShowcase?.(preset.id, preset.isShowcase === true); }}
          title={preset.isShowcase === true
            ? (lang === 'pt' ? 'Na Vitrine de Descoberta (clique para retirar)' : 'Dans la Vitrine Découverte (cliquer pour retirer)')
            : (lang === 'pt' ? 'Destacar na Vitrine de Descoberta' : 'Mettre dans la Vitrine Découverte')}
          className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-transform hover:scale-110 leading-none"
        >
          <XiloStar
            size={13}
            active={preset.isShowcase === true}
            className={preset.isShowcase === true ? 'text-[var(--cordel-accent-readable)]' : 'text-[var(--cordel-text)] opacity-35 hover:opacity-90'}
          />
        </button>
      )}

      {isGroupList && canToggleDraft ? (
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
            <XiloMegaphone size={14} className="shrink-0 text-[var(--cordel-accent-readable)] hover:opacity-90 transition-colors" />
          )}
        </button>
      ) : isGroupList ? (
        <span className="w-6 h-6 shrink-0" />
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onPointerDown={stopEvent} onMouseDown={stopEvent}
          onClick={(e) => { stopEvent(e); onDeletePreset?.(preset); }}
          title={lang === 'pt' ? 'Excluir esta música do catálogo' : 'Supprimer ce morceau du catalogue'}
          className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-colors text-[var(--cordel-text)] opacity-40 hover:opacity-100 hover:text-[var(--cordel-status-danger)] leading-none"
        >
          <Trash2 size={13} className="shrink-0" />
        </button>
      ) : isGroupList ? (
        <span className="w-6 h-6 shrink-0" />
      ) : null}

      {isGroupList && (
        canSetDefaultPreset ? (
          <button
            type="button"
            data-testid={isDefault ? 'cactus-default-preset' : 'cactus-preset-toggle'}
            aria-label={isDefault ? 'Cactus' : 'Épingler le morceau'}
            onClick={(e) => { e.stopPropagation(); onSetDefaultPreset?.(isDefault ? null : preset.id); }}
            title={lang === 'pt'
              ? (isDefault ? 'Ritmo de referência ativo (clique para desafixar)' : 'Fixar como ritmo de referência do grupo')
              : (isDefault ? 'Morceau de travail actif (cliquer pour désépingler)' : 'Épingler comme morceau de travail du groupe')}
            className="w-6 h-6 shrink-0 cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
          >
            <span
              style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
              className={`font-cactus-star text-xl select-none leading-none inline-flex items-center justify-center ${
                isDefault ? 'text-[var(--cordel-status-success)] dark:text-[var(--cordel-gold)]' : 'text-[var(--cordel-text)] opacity-20 hover:opacity-80'
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
            className="w-6 h-6 shrink-0 select-none leading-none text-xl font-cactus-star text-[var(--cordel-status-success)] dark:text-[var(--cordel-gold)] inline-flex items-center justify-center"
          >
            *
          </span>
        ) : (
          <span className="w-6 h-6 shrink-0" />
        )
      )}
    </div>
  );
};
