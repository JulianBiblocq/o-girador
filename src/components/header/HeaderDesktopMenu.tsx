import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { HeaderWorkspaceAccessSection } from './HeaderWorkspaceAccessSection';
import { HeaderProjectDropdownContent } from './HeaderProjectDropdownContent';
import { HeaderHelpSection } from './HeaderHelpSection';
import { HeaderMenuPracticeModeSwitch } from './HeaderMenuPracticeModeSwitch';

interface HeaderDesktopMenuProps {
  lang: 'pt' | 'fr';
  onAdminClick?: () => void;
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
}

export const HeaderDesktopMenu: React.FC<HeaderDesktopMenuProps> = (props) => {
  const [projectDropOpen, setProjectDropOpen] = useState(false);
  const projectDropRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setProjectDropOpen(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node)) closeMenu();
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
        type="button"
        data-tour-id="header-menu-btn"
        onClick={() => setProjectDropOpen(!projectDropOpen)}
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] cordel-button px-3 py-1.5 font-bold font-cactus uppercase cursor-pointer flex items-center gap-1.5"
      >
        <span>Menu</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {projectDropOpen && (
        <div className="absolute top-10 left-0 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] w-[290px] z-[100] flex flex-col p-2.5 gap-2.5 max-h-[calc(100dvh-4.5rem)] overflow-y-auto custom-scrollbar overscroll-contain">
          <div className="flex flex-col gap-1.5 border-b border-[var(--cordel-border)]/30 pb-2.5">
            <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide font-cactus">
              {props.lang === 'pt' ? 'Modos O Girador' : 'Modes O Girador'}
            </span>
            <HeaderMenuPracticeModeSwitch
              lang={props.lang}
              onViewModeToggle={props.onViewModeToggle}
              onCloseMenu={closeMenu}
            />
          </div>

          <HeaderProjectDropdownContent {...props} onCloseMenu={closeMenu} />

          <HeaderWorkspaceAccessSection
            lang={props.lang}
            onAdminClick={props.onAdminClick}
            onCloseMenu={closeMenu}
          />

          <HeaderHelpSection
            lang={props.lang}
            onToggleRightPanel={props.onToggleRightPanel}
            onViewModeToggle={props.onViewModeToggle}
            onCloseMenu={closeMenu}
          />
        </div>
      )}
    </div>
  );
};
