import React from 'react';
import { GoogleLoginButton } from '../GoogleLoginButton';

interface LandingHeaderProps {
  currentLang: 'fr' | 'pt';
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ currentLang }) => {
  return (
    <header className="w-full relative pt-2 sm:pt-3 px-4 sm:px-6 max-w-7xl mx-auto z-30 flex items-center justify-end">
      <div className="z-40">
        <GoogleLoginButton lang={currentLang} align="right" size="large" />
      </div>
    </header>
  );
};
