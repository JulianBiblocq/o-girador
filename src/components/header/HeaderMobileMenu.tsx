import React, { useState, useRef, useEffect } from 'react';
import { Download, Smartphone, Menu } from 'lucide-react';
import { HeaderWorkspaceAccessSection } from './HeaderWorkspaceAccessSection';
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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) closeMenu();
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
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="w-9 h-9 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center justify-center font-bold text-lg cursor-pointer shadow-[1.5px_1.5px_0_var(--cordel-shadow-color)] shrink-0"
      >
        <Menu size={20} className="shrink-0" />
      </button>

      {mobileMenuOpen && (
        <div className="absolute top-12 left-0 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] w-[285px] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain custom-scrollbar z-[999] flex flex-col p-3 gap-3">
          <div className="flex flex-col gap-1 border-b border-[var(--cordel-border)]/30 pb-2.5">
            <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide font-cactus">
              {props.lang === 'pt' ? 'Modo de exibição' : "Mode d'affichage"}
            </span>
            <MobileViewModeSelector lang={props.lang} />
          </div>

          {props.showInstallButton && props.onInstallClick && (
            <div className="flex flex-col gap-1.5 border-b border-[var(--cordel-border)]/30 pb-2.5">
              <span className="text-[10px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wide flex items-center gap-1 font-cactus">
                <Smartphone className="w-3 h-3 shrink-0" /> PWA
              </span>
              <button
                type="button"
                onClick={() => { props.onInstallClick?.(); closeMenu(); }}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-bold font-cactus uppercase cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                {props.lang === 'pt' ? 'Instalar App' : "Installer l'application"}
              </button>
            </div>
          )}

          <HeaderWorkspaceAccessSection
            lang={props.lang}
            onAdminClick={props.onAdminClick}
            onCloseMenu={closeMenu}
            showAccountBadge
          />

          <HeaderProjectDropdownContent {...props} isMobileMenu onCloseMenu={closeMenu} />

          <HeaderMobileEditSection
            lang={props.lang} canUndo={props.canUndo} canRedo={props.canRedo}
            onUndo={props.onUndo} onRedo={props.onRedo} onCloseMenu={closeMenu}
          />

          <HeaderMobileDisplaySection
            lang={props.lang} isDarkMode={props.isDarkMode}
            onToggleDarkMode={props.onToggleDarkMode} onLangToggle={props.onLangToggle} onCloseMenu={closeMenu}
          />

          <HeaderHelpSection
            lang={props.lang} onToggleRightPanel={props.onToggleRightPanel}
            onMobileTabToggle={props.onMobileTabToggle} onViewModeToggle={props.onViewModeToggle}
            onOpenWallpaperModal={props.onOpenWallpaperModal} showWallpaperOption onCloseMenu={closeMenu}
          />
        </div>
      )}
    </div>
  );
};
