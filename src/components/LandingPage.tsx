import React from 'react';
import { useLandingPageLogic } from './landing/useLandingPageLogic';
import { LandingHeader } from './landing/LandingHeader';
import { LandingHeroSection } from './landing/LandingHeroSection';
import { LandingInstrumentsSection } from './landing/LandingInstrumentsSection';
import { LandingVaralSection } from './landing/LandingVaralSection';
import { LandingFooter } from './landing/LandingFooter';

interface LandingPageProps {
  onEnter: () => void;
  lang: 'fr' | 'pt';
  onLanguageChange?: (lang: 'fr' | 'pt') => void;
  isManualOpen?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  lang,
  onLanguageChange,
}) => {
  const {
    isToneReady, isUnlocking, currentLang, currentUser, isFr, handleLanguageSelect,
    handleLaunchOrquestrador, handleCurrentAppClick, handleLaunchOrganizador,
    handleLaunchDancador, handleLaunchMostrador, handleEnterRoda, handleInstrumentTap
  } = useLandingPageLogic(onEnter, lang, onLanguageChange);

  return (
    <div id="landing-page" className="min-h-screen bg-[#f4ecd8] text-[#1a1a1a] flex flex-col justify-between relative selection:bg-[#8b2a1a] selection:text-[#f4ecd8]">
      <div className="fixed inset-0 pointer-events-none z-0 wallpaper-surface-bg wallpaper-damas-mask" aria-hidden="true" />

      <LandingHeader currentLang={currentLang} />

      <LandingHeroSection
        isFr={isFr}
        isToneReady={isToneReady}
        isUnlocking={isUnlocking}
        onEnterRoda={handleEnterRoda}
      />

      <LandingInstrumentsSection
        isFr={isFr}
        onPlayStroke={handleInstrumentTap}
      />

      <LandingVaralSection isFr={isFr} />

      <LandingFooter
        isFr={isFr}
        onLanguageSelect={handleLanguageSelect}
        onLaunchOrquestrador={handleLaunchOrquestrador}
        onCurrentAppClick={handleCurrentAppClick}
        onLaunchOrganizador={handleLaunchOrganizador}
        onLaunchDancador={handleLaunchDancador}
        onLaunchMostrador={handleLaunchMostrador}
        currentUser={currentUser}
      />
    </div>
  );
};
