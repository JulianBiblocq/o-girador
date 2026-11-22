import type { CatalogAccordionPresetItem } from './presetAccordionTiers';

export interface PresetAccordionSelectorProps {
  lang: 'pt' | 'fr';
  activePreset: string;
  currentSongTitle?: string;
  publicCloudPresets: CatalogAccordionPresetItem[];
  privateCloudPresets: CatalogAccordionPresetItem[];
  localPresets?: string[];
  isCloudPresetsLoading: boolean;
  showGroupCatalogue: boolean;
  groupLabel: string | null;
  groupLogo?: string | null;
  defaultPresetId?: string | null;
  canSetDefaultPreset?: boolean;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  canEdit?: boolean;
  canToggleDraftPreset?: (preset: { id: string; ownerId?: string }) => boolean;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onToggleShowcase?: (presetId: string, currentShowcase: boolean) => Promise<void> | void;
  onSelectPreset: (presetValue: string, cloudId?: string) => void;
  className?: string;
}
