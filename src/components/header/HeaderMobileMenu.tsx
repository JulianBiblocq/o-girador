import React, { useState, useRef, useEffect } from 'react';
import { Download, Smartphone, Menu } from 'lucide-react';

import { HeaderProfileSection } from './HeaderProfileSection';
import { HeaderProjectDropdownContent } from './HeaderProjectDropdownContent';
import { HeaderMobileEditSection } from './HeaderMobileEditSection';
import { HeaderMobileDisplaySection } from './HeaderMobileDisplaySection';
import { HeaderHelpSection } from './HeaderHelpSection';
import { MobileViewModeSelector } from '../mobile/MobileViewModeSelector';
import type { HeaderMobileMenuProps } from './headerMobileMenuTypes';

export const HeaderMobileMenu: React.FC<HeaderMobileMenuProps> = (props) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
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
    <div className="flex items-center gap-2" ref={mobileMenuRef}>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="w-9 h-9 bg-[#241e1a] text-[#f4ecd8] border border-[#eaddcf]/40 hover:bg-[#f4ecd8] hover:text-[#1a1a1a] cordel-border-sm cordel-button flex items-center justify-center font-bold text-lg cursor-pointer shadow-[1px_1px_0_#000] shrink-0"
      >
        
        <Menu size={20} className="text-[#f4ecd8] shrink-0" />
      </button>

      {mobileMenuOpen && (
        <div className="absolute top-12 left-0 bg-[var(--cordel-bg)] cordel-border shadow-[4px_4px_0_var(--cordel-border)] w-[280px] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain custom-scrollbar z-[999] flex flex-col p-3 gap-4">
          <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/30 pb-3">
            <span className="text-[10px] font-bold text-[#b94a2c] uppercase tracking-wide font-cactus">
              {props.lang === 'pt' ? 'Modo de exibição' : 'Mode d\'affichage'}
            </span>
            <MobileViewModeSelector lang={props.lang} />
          </div>

          {props.showInstallButton && props.onInstallClick && (
            <div className="flex flex-col gap-2 border-b border-[var(--cordel-border)]/30 pb-3">
              <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wide flex items-center gap-1">
                <Smartphone className="w-3 h-3 shrink-0" /> PWA
              </span>
              <button
                onClick={() => {
                  props.onInstallClick?.();
                  closeMenu();
                }}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[#e67e22] text-[#1a1a1a] hover:opacity-90 font-bold font-cactus uppercase cordel-border-sm cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                {props.lang === 'pt' ? 'Instalar App' : "Installer l'app"}
              </button>
            </div>
          )}

          <HeaderProfileSection
            lang={props.lang}
            onAdminClick={props.onAdminClick}
            onOpenSwingModal={props.onOpenSwingModal}
            onCloseMenu={closeMenu}
          />

          <HeaderProjectDropdownContent {...props} onCloseMenu={closeMenu} />

          <HeaderMobileEditSection
            lang={props.lang}
            canUndo={props.canUndo}
            canRedo={props.canRedo}
            onUndo={props.onUndo}
            onRedo={props.onRedo}
            onCloseMenu={closeMenu}
          />

          <HeaderMobileDisplaySection
            lang={props.lang}
            isDarkMode={props.isDarkMode}
            onToggleDarkMode={props.onToggleDarkMode}
            onLangToggle={props.onLangToggle}
            onCloseMenu={closeMenu}
          />

          <HeaderHelpSection
            lang={props.lang}
            onToggleRightPanel={props.onToggleRightPanel}
            onMobileTabToggle={props.onMobileTabToggle}
            onViewModeToggle={props.onViewModeToggle}
            onOpenWallpaperModal={props.onOpenWallpaperModal}
            onCloseMenu={closeMenu}
          />
        </div>
      )}
    </div>
  );
};
