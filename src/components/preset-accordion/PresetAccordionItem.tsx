import React from 'react';
import { Check } from 'lucide-react';
import { XiloLock } from '../XiloIcons';
import { PresetAccordionItemActions } from './PresetAccordionItemActions';
import type { CatalogAccordionPresetItem } from './presetAccordionTiers';

interface PresetAccordionItemProps {
  preset: CatalogAccordionPresetItem;
  active: boolean;
  isGroupList: boolean;
  isDefault: boolean;
  isLockedForUser?: boolean;
  canToggleDraft?: boolean;
  canSetDefaultPreset: boolean;
  canDelete?: boolean;
  canToggleShowcase?: boolean;
  icon?: React.ReactNode;
  lang: 'pt' | 'fr';
  onItemClick: (val: string, cloudId?: string) => void;
  onLockedItemClick?: () => void;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  onDeletePreset?: (preset: CatalogAccordionPresetItem) => Promise<void> | void;
  onToggleShowcase?: (presetId: string, currentShowcase: boolean) => Promise<void> | void;
}

export const PresetAccordionItem: React.FC<PresetAccordionItemProps> = ({
  preset, active, isGroupList, isDefault, isLockedForUser = false,
  canToggleDraft = false, canSetDefaultPreset, canDelete = false, canToggleShowcase = false,
  icon, lang, onItemClick, onLockedItemClick, onToggleDraft, onSetDefaultPreset, onDeletePreset, onToggleShowcase,
}) => {
  const selectVal = preset.selectValue || `cloud:${preset.id}`;
  const cloudId = preset.selectValue ? undefined : preset.id;

  const handleClick = () => {
    if (isLockedForUser) {
      onLockedItemClick?.();
      return;
    }
    onItemClick(selectVal, cloudId);
  };

  return (
    <div key={`item:${preset.id}`} className="flex items-center gap-1 w-full min-w-0">
      <button
        type="button"
        title={preset.name}
        onClick={handleClick}
        className={`flex-1 text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between gap-1 transition-colors cursor-pointer cordel-border-sm min-w-0 ${
          active
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-wood)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {icon ? <span className="text-xs shrink-0">{icon}</span> : null}
          <span className={`truncate ${isLockedForUser ? 'opacity-85' : ''}`}>{preset.name}</span>
        </span>
        {isLockedForUser ? (
          <XiloLock size={12} className="shrink-0 ml-1 opacity-65" />
        ) : (
          active && <Check size={12} className="shrink-0 ml-1" />
        )}
      </button>

      {!isLockedForUser && (
        <PresetAccordionItemActions
          preset={preset}
          isGroupList={isGroupList}
          isDefault={isDefault}
          canToggleDraft={canToggleDraft}
          canSetDefaultPreset={canSetDefaultPreset}
          canDelete={canDelete}
          canToggleShowcase={canToggleShowcase}
          lang={lang}
          onToggleDraft={onToggleDraft}
          onSetDefaultPreset={onSetDefaultPreset}
          onDeletePreset={onDeletePreset}
          onToggleShowcase={onToggleShowcase}
        />
      )}
    </div>
  );
};
