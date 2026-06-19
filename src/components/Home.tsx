import React, { useEffect, useState } from 'react';
import * as Tone from 'tone';
import { ASSETS_BASE_URL } from '../data';
import { audioEngine } from '../hooks/useAudioSync';
import { GoogleLoginButton } from './GoogleLoginButton';

interface HomeProps {
  onEnter: (mode: string) => void;
  lang: 'fr' | 'pt';
}

export const Home: React.FC<HomeProps> = ({ onEnter, lang }) => {

  const handleEnter = async (mode: string) => {
    // Unlock Audio Context (Autoplay Policy)
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    onEnter(mode);
  };

  const isFr = lang === 'fr';

  return (
    <div className="w-full min-h-screen bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
      
      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        <GoogleLoginButton lang={lang} />
      </div>
      
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-repeat" style={{ backgroundImage: `url("${ASSETS_BASE_URL}assets/cordel-pattern.png")`, backgroundSize: '200px' }} />

      <div className="z-10 flex flex-col items-center max-w-4xl w-full">
        {/* Title / Logo */}
        <div className="mb-12 text-center">
          <h1 className="font-cactus text-5xl md:text-7xl font-bold tracking-wider mb-4 drop-shadow-md text-[var(--cordel-text)]">
            O GIRADOR
          </h1>
          <p className="text-lg md:text-xl font-bold opacity-80 uppercase tracking-widest text-[var(--cordel-wood)]">
            {isFr ? 'Séquenceur de Maracatu' : 'Sequenciador de Maracatu'}
          </p>
        </div>

        {/* Main Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          
          {/* Roda (Primary) */}
          <button
            onClick={() => handleEnter('roda')}
            className="col-span-1 md:col-span-2 relative overflow-hidden group bg-[#e67e22] text-[#1a1a1a] cordel-border flex flex-col items-center justify-center py-10 px-6 cursor-pointer hover:scale-[1.02] transition-transform duration-300"
          >
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="text-4xl mb-3">⭕</span>
            <span className="font-cactus font-bold text-3xl tracking-widest uppercase">
              {isFr ? 'Entrer dans la Roda' : 'Entrar na Roda'}
            </span>
            <span className="text-sm font-bold opacity-80 mt-2">
              {isFr ? 'Séquenceur circulaire et création' : 'Sequenciador circular e criação'}
            </span>
          </button>

          {/* Jeux */}
          <button
            onClick={() => handleEnter('quiz')}
            className="bg-[#2980b9] text-[#1a1a1a] cordel-border flex flex-col items-center justify-center py-6 px-4 cursor-pointer hover:-translate-y-1 transition-transform"
          >
            <span className="text-3xl mb-2">🎮</span>
            <span className="font-cactus font-bold text-xl uppercase tracking-wider">
              {isFr ? 'Jeux & Quiz' : 'Jogos e Quiz'}
            </span>
            <span className="text-xs font-bold opacity-80 mt-1 text-center">
              {isFr ? 'Entraînement de l\'oreille' : 'Treinamento auditivo'}
            </span>
          </button>

          {/* Studio */}
          <button
            onClick={() => handleEnter('studio')}
            className="bg-[#8e44ad] text-[#1a1a1a] cordel-border flex flex-col items-center justify-center py-6 px-4 cursor-pointer hover:-translate-y-1 transition-transform"
          >
            <span className="text-3xl mb-2">👑</span>
            <span className="font-cactus font-bold text-xl uppercase tracking-wider">
              {isFr ? 'Mestre Studio' : 'Mestre Studio'}
            </span>
            <span className="text-xs font-bold opacity-80 mt-1 text-center">
              {isFr ? 'Arrangements avancés' : 'Arranjos avançados'}
            </span>
          </button>

        </div>

        {/* Footer info */}
        <div className="mt-16 text-center opacity-70 font-bold text-sm">
          <span className="text-[#27ae60]">✓ {isFr ? 'Audio prêt' : 'Áudio pronto'}</span>
        </div>

      </div>
    </div>
  );
};
