/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types pour le contenu du menu déroulant projet (< 40 lignes).
 */

export interface HeaderProjectDropdownContentProps {
  lang: 'pt' | 'fr';
  preset: string;
  songTitle?: string;
  publicCloudPresets: any[];
  privateCloudPresets: any[];
  localPresets: string[];
  isCloudPresetsLoading: boolean;
  showGroupCatalogue: boolean;
  groupLabel: string;
  groupLogo: string;
  defaultPresetId: string | null;
  canSetDefaultPreset: boolean;
  canEdit: boolean;
  onSetDefaultPreset: (id: string | null) => void;
  onToggleDraft: (id: string, currentDraft: boolean) => void;
  onPresetChange: (val: string) => void;
  onExportTablature?: () => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  onCloudSave?: () => void;
  onCloseMenu: () => void;
}
