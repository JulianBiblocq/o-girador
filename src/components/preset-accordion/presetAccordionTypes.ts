/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types pour le sélecteur d'accordéon de presets (< 35 lignes).
 */

export interface PresetAccordionSelectorProps {
  lang: 'pt' | 'fr';
  activePreset: string;
  currentSongTitle?: string;
  publicCloudPresets: Array<{ id: string; name: string; visibility?: string; isDraft?: boolean }>;
  privateCloudPresets: Array<{ id: string; name: string; visibility?: string; isDraft?: boolean }>;
  localPresets?: string[];
  isCloudPresetsLoading: boolean;
  showGroupCatalogue: boolean;
  groupLabel: string | null;
  groupLogo?: string | null;
  defaultPresetId?: string | null;
  canSetDefaultPreset?: boolean;
  onSetDefaultPreset?: (presetId: string | null) => Promise<void> | void;
  canEdit?: boolean;
  onToggleDraft?: (presetId: string, currentDraft: boolean) => Promise<void> | void;
  onSelectPreset: (presetValue: string, cloudId?: string) => void;
  className?: string;
}
