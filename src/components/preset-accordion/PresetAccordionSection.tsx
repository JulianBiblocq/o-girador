/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PresetAccordionItem } from './PresetAccordionItem';

interface SectionProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  count: number;
  icon?: string;
  logo?: string;
  items: Array<{ id: string; name: string; isDraft?: boolean }>;
  itemIcon: string;
  emptyMsg: string;
  isGroupList?: boolean;
  isLoading?: boolean;
  defaultPresetId?: string | null;
  canEdit?: boolean;
  canSetDefaultPreset?: boolean;
  lang: 'pt' | 'fr';
  isItemActive: (val: string, name: string) => boolean;
  onItemClick: (val: string, cloudId?: string) => void;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  testId?: string;
}

export const PresetAccordionSection: React.FC<SectionProps> = ({
  isOpen,
  onToggle,
  title,
  count,
  icon,
  logo,
  items,
  itemIcon,
  emptyMsg,
  isGroupList = false,
  isLoading = false,
  defaultPresetId,
  canEdit = false,
  canSetDefaultPreset = false,
  lang,
  isItemActive,
  onItemClick,
  onToggleDraft,
  onSetDefaultPreset,
  testId,
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
            <span className="w-5 h-5 flex items-center justify-center bg-[#f4ecd8] rounded-xs p-0.5 mr-2 shrink-0 shadow-xs border border-black/10">
              <img src={logo} alt="" className="w-full h-full object-contain" />
            </span>
          )}
          {icon && <span className="text-sm leading-none">{icon}</span>}
          <span className="truncate">{title}</span>
          <span className="text-[10px] opacity-60 font-sans">({count})</span>
        </span>
        <span className="text-[9px] opacity-70 ml-1">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1 p-1.5 pt-0 max-h-56 overflow-y-auto border-t border-[var(--cordel-border)]/20">
          {isLoading && items.length === 0 ? (
            <div className="px-2 py-2 text-xs italic text-[var(--cordel-subtext)] text-center">
              {lang === 'pt' ? '(Carregando catálogo...)' : '(Chargement du catalogue...)'}
            </div>
          ) : items.length > 0 ? (
            items.map((p) => (
              <PresetAccordionItem
                key={`cloud:${p.id}`}
                preset={p}
                active={isItemActive(`cloud:${p.id}`, p.name)}
                isGroupList={isGroupList}
                isDefault={isGroupList && defaultPresetId === p.id}
                canEdit={canEdit}
                canSetDefaultPreset={canSetDefaultPreset}
                icon={itemIcon}
                lang={lang}
                onItemClick={onItemClick}
                onToggleDraft={onToggleDraft}
                onSetDefaultPreset={onSetDefaultPreset}
              />
            ))
          ) : (
            <div className="px-2 py-2 text-xs italic text-[var(--cordel-subtext)] text-center">{emptyMsg}</div>
          )}
        </div>
      )}
    </div>
  );
};
