import React, { useState, useEffect } from 'react';
import { useLandingPageLogic } from './landing/useLandingPageLogic';
import { LandingHeader } from './landing/LandingHeader';
import { LandingHeroSection } from './landing/LandingHeroSection';
import { LandingInstrumentsSection } from './landing/LandingInstrumentsSection';
import { LandingVaralSection } from './landing/LandingVaralSection';
import { LandingFooter } from './landing/LandingFooter';
import { LegalNoticeModal } from './legal/LegalNoticeModal';

interface LandingPageProps {
  onEnter: () => void;
  lang: 'fr' | 'pt';
  onLanguageChange?: (lang: 'fr' | 'pt') => void;
  isManualOpen?: boolean;
  onOpenPaperSheets?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  lang,
  onLanguageChange,
  isManualOpen = false,
  onOpenPaperSheets,
}) => {
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const {
    isToneReady, isUnlocking, currentLang, currentUser, isFr, organizadorGroupLogo, mostradorHref,
    handleLanguageSelect, handleLaunchOrquestrador, handleCurrentAppClick,
    handleLaunchOrganizador, handleLaunchCantador, handleLaunchDancador, handleLaunchAfinador,
    handleLaunchMostrador, handleEnterRoda, handleEnterPractice, handleEnterPrintA4,
    handleEnterGuide, handleReturnToRoda, handleInstrumentTap,
  } = useLandingPageLogic(onEnter, lang, onLanguageChange, onOpenPaperSheets);

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined' && window.location.hash === '#legal') {
        setIsLegalOpen(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleCloseLegal = () => {
    setIsLegalOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#legal') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <main
      id="landing-page"
      className="min-h-screen p-0 bg-[var(--cordel-bg)] text-[var(--cordel-text)] flex flex-col justify-between relative selection:bg-[var(--cordel-wood)] selection:text-[var(--cordel-on-accent)]"
    >
      <div className="fixed inset-0 pointer-events-none z-0 wallpaper-surface-bg wallpaper-damas-mask" aria-hidden="true" />

      <LandingHeader
        currentLang={currentLang}
        onLanguageSelect={handleLanguageSelect}
        isManualOpen={isManualOpen}
        onReturnToApp={handleReturnToRoda}
      />

      <LandingHeroSection
        isFr={isFr}
        isToneReady={isToneReady}
        isUnlocking={isUnlocking}
        onEnterRoda={handleEnterRoda}
        onEnterPractice={handleEnterPractice}
        onEnterPrintA4={handleEnterPrintA4}
        onEnterGuide={handleEnterGuide}
      />

      <LandingInstrumentsSection
        isFr={isFr}
        onPlayStroke={handleInstrumentTap}
      />

      <LandingVaralSection isFr={isFr} />

      <LandingFooter
        isFr={isFr}
        organizadorGroupLogo={organizadorGroupLogo}
        mostradorHref={mostradorHref}
        onLanguageSelect={handleLanguageSelect}
        onLaunchOrquestrador={handleLaunchOrquestrador}
        onCurrentAppClick={handleCurrentAppClick}
        onLaunchOrganizador={handleLaunchOrganizador}
        onLaunchCantador={handleLaunchCantador}
        onLaunchDancador={handleLaunchDancador}
        onLaunchAfinador={handleLaunchAfinador}
        onLaunchMostrador={handleLaunchMostrador}
        onOpenLegal={() => setIsLegalOpen(true)}
        currentUser={currentUser}
      />

      <LegalNoticeModal
        isOpen={isLegalOpen}
        onClose={handleCloseLegal}
        lang={currentLang}
      />
    </main>
  );
};
