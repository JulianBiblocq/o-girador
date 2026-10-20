import React, { useState, useRef, useEffect } from 'react';
import { HeaderProfileSection } from './HeaderProfileSection';
import { HeaderProjectDropdownContent } from './HeaderProjectDropdownContent';
import { HeaderHelpSection } from './HeaderHelpSection';

interface HeaderDesktopMenuProps {
  lang: 'pt' | 'fr';
  onAdminClick?: () => void;
  onOpenSwingModal: () => void;
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
  onToggleRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais') => void;
  onViewModeToggle: (mode: any) => void;
  onOpenWallpaperModal?: () => void;
}

export const HeaderDesktopMenu: React.FC<HeaderDesktopMenuProps> = (props) => {
  const [projectDropOpen, setProjectDropOpen] = useState(false);
  const projectDropRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setProjectDropOpen(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative ml-2" ref={projectDropRef}>
      <button
        onClick={() => setProjectDropOpen(!projectDropOpen)}
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button px-3 py-1.5 font-bold font-cactus uppercase cursor-pointer flex items-center gap-2"
      >
        {props.lang === 'pt' ? 'Menu' : 'Menu'} <span className="text-[10px]">▼</span>
      </button>

      {projectDropOpen && (
        <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] w-[280px] z-[100] flex flex-col p-2 gap-3">
          <HeaderProfileSection
            lang={props.lang}
            onAdminClick={props.onAdminClick}
            onOpenSwingModal={props.onOpenSwingModal}
            onCloseMenu={closeMenu}
          />

          <HeaderProjectDropdownContent
            {...props}
            onCloseMenu={closeMenu}
          />

          <HeaderHelpSection
            lang={props.lang}
            onToggleRightPanel={props.onToggleRightPanel}
            onViewModeToggle={props.onViewModeToggle}
            onOpenWallpaperModal={props.onOpenWallpaperModal}
            onCloseMenu={closeMenu}
          />
        </div>
      )}
    </div>
  );
};
