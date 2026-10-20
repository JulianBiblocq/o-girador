import React from 'react';
import { BATERIA_INSTRUMENTS_DATA } from './landingAudio';
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
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
        {BATERIA_INSTRUMENTS_DATA.map((instrument) => (
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
