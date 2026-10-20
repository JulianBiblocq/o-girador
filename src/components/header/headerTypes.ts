export interface HeaderProps {
  presetFiles?: string[];
  localPresets?: string[];
  cloudPresets?: any[];
  isCloudPresetsLoading?: boolean;
  viewMode: string;
  onViewModeToggle: (mode: any) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isMobile: boolean;
  mobileTab?: 'roda' | 'mixer' | 'toada';
  onMobileTabToggle?: (tab: 'roda' | 'mixer' | 'toada') => void;
  activeRightPanel?: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null;
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais') => void;
  version?: string | number;
  onExportTablature?: () => void;
  showInstallButton?: boolean;
  onInstallClick?: () => void;
  onAdminClick?: () => void;
  onCloudSave?: () => void;
  onOpenInstrumentEditor?: () => void;
  onToggleDetachInstrumentEditor?: () => void;
  editingTrackId?: number | null;
  onOpenWallpaperModal?: () => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
}
