import React from 'react';
import { BAQUE_INSTRUMENTS_DATA } from './landingAudio';
import { LandingInstrumentCard } from './LandingInstrumentCard';

interface LandingInstrumentsSectionProps {
  isFr: boolean;
  onPlayStroke: (instId: string, strokeSymbol: string, strokeFile: string) => void;
}

export const LandingInstrumentsSection: React.FC<LandingInstrumentsSectionProps> = ({
  isFr,
  onPlayStroke,
}) => {
  return (
    <section className="w-full relative max-w-4xl mx-auto px-4 py-3 z-20">
      <p className="font-cactus font-bold text-xs sm:text-sm text-[var(--cordel-accent-readable)] text-center mb-3 tracking-wide">
        {isFr
          ? "Touchez un instrument pour écouter les prises acoustiques brutes de l'atelier :"
          : 'Toque em um instrumento para ouvir as gravações acústicas reais da oficina:'}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
        {BAQUE_INSTRUMENTS_DATA.map((instrument) => (
          <LandingInstrumentCard
            key={instrument.id}
            instrument={instrument}
            isFr={isFr}
            onPlayStroke={onPlayStroke}
          />
        ))}
      </div>
    </section>
  );
};
