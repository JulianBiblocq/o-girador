import React from 'react';
import { PresetAccordionItem } from './PresetAccordionItem';
import type { CatalogAccordionPresetItem } from './presetAccordionTiers';

interface SectionProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  countLabel: string;
  icon?: React.ReactNode;
  logo?: string;
  items: CatalogAccordionPresetItem[];
  itemIcon?: React.ReactNode;
  emptyMsg: string;
  isGroupList?: boolean;
  isLockedForUser?: boolean;
  isLoading?: boolean;
  defaultPresetId?: string | null;
  canEdit?: boolean;
  canSetDefaultPreset?: boolean;
  canToggleShowcase?: boolean;
  canToggleDraftPreset?: (preset: { id: string; ownerId?: string }) => boolean;
  canDeletePreset?: (preset: { id: string; ownerId?: string }) => boolean;
  lang: 'pt' | 'fr';
  isItemActive: (val: string, name: string) => boolean;
  onItemClick: (val: string, cloudId?: string) => void;
  onLockedItemClick?: () => void;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  onDeletePreset?: (preset: CatalogAccordionPresetItem) => Promise<void> | void;
  onToggleShowcase?: (presetId: string, currentShowcase: boolean) => Promise<void> | void;
  testId?: string;
}

export const PresetAccordionSection: React.FC<SectionProps> = ({
  isOpen, onToggle, title, countLabel, icon, logo, items, itemIcon, emptyMsg,
  isGroupList = false, isLockedForUser = false, isLoading = false, defaultPresetId,
  canSetDefaultPreset = false, canToggleShowcase = false, canToggleDraftPreset, canDeletePreset,
  lang, isItemActive, onItemClick, onLockedItemClick, onToggleDraft, onSetDefaultPreset, onDeletePreset, onToggleShowcase, testId,
}) => {
  return (
    <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
      <button
        type="button"
        data-testid={testId}
        onClick={onToggle}
        className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
      >
        <span className="flex items-center gap-1.5 truncate">
          {logo && (
            <span className="w-5 h-5 flex items-center justify-center bg-[var(--cordel-paper-surface)] rounded-xs p-0.5 mr-1.5 shrink-0 shadow-xs border border-[var(--cordel-border)]/20">
              <img src={logo} alt="" className="w-full h-full object-contain" />
            </span>
          )}
          {icon && <span className="text-sm leading-none flex items-center">{icon}</span>}
          <span className="truncate">{title}</span>
          <span className="text-[10px] opacity-60 font-sans">({countLabel})</span>
        </span>
        <span className="text-[9px] opacity-70 ml-1">{isOpen ? '▼' : '►'}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1 p-1.5 pt-0 max-h-56 overflow-y-auto border-t border-[var(--cordel-border)]/20">
          {isLoading && items.length === 0 ? (
            <div className="px-2 py-2 text-xs italic text-[var(--cordel-text-muted)] text-center">
              {lang === 'pt' ? '(Carregando catálogo...)' : '(Chargement du catalogue...)'}
            </div>
          ) : items.length > 0 ? (
            items.map((p) => {
              const selectVal = p.selectValue || `cloud:${p.id}`;
              return (
                <PresetAccordionItem
                  key={selectVal}
                  preset={p}
                  active={isItemActive(selectVal, p.name)}
                  isGroupList={isGroupList}
                  isDefault={isGroupList && defaultPresetId === p.id}
                  isLockedForUser={isLockedForUser}
                  canToggleDraft={canToggleDraftPreset ? canToggleDraftPreset(p) : false}
                  canSetDefaultPreset={canSetDefaultPreset}
                  canDelete={canDeletePreset ? canDeletePreset(p) : false}
                  canToggleShowcase={canToggleShowcase}
                  icon={itemIcon}
                  lang={lang}
                  onItemClick={onItemClick}
                  onLockedItemClick={onLockedItemClick}
                  onToggleDraft={onToggleDraft}
                  onSetDefaultPreset={onSetDefaultPreset}
                  onDeletePreset={onDeletePreset}
                  onToggleShowcase={onToggleShowcase}
                />
              );
            })
          ) : (
            <div className="px-2 py-2 text-xs italic text-[var(--cordel-text-muted)] text-center">{emptyMsg}</div>
          )}
        </div>
      )}
    </div>
  );
};
