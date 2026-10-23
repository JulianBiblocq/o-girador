/**
 * Types d'interface pour le menu mobile d'en-tête (< 50 lignes).
 */

export interface HeaderMobileMenuProps {
  lang: 'pt' | 'fr';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLangToggle: () => void;
  showInstallButton?: boolean;
  onInstallClick?: () => void;
  onAdminClick?: () => void;
  onOpenSwingModal: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  mobileTab?: 'roda' | 'mixer' | 'toada';
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  activeRightPanel?: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais') => void;
  onViewModeToggle: (mode: any) => void;
  onOpenWallpaperModal?: () => void;
}
