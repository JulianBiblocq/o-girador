import React, { useEffect, useState } from 'react';
import type * as ToneType from 'tone';
import { loadTone, getTone } from '@/src/ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}
import { ASSETS_BASE_URL } from '../data';
import { audioEngine } from '../hooks/useAudioSync';
import { GoogleLoginButton } from './GoogleLoginButton';
import { useAuth } from '../contexts/AuthContext';

interface HomeProps {
  onEnter: (mode: string) => void;
  lang: 'fr' | 'pt';
}

export const Home: React.FC<HomeProps> = ({ onEnter, lang }) => {
  const { hasAccess } = useAuth();

  const handleEnter = async (mode: string) => {
    // Unlock Audio Context (Autoplay Policy)
    if (safeGetTone()?.context.state !== 'running') {
      await loadTone();
    await getTone().start();
    }
    onEnter(mode);
  };

  const isFr = lang === 'fr';

  return (
    <div className="w-full min-h-screen bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-sans flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden px-4 py-8">
      
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

          {/* Jeux (Varal) */}
          {hasAccess('admin') && (
            <button
              onClick={() => handleEnter('varal')}
              className="bg-[#2980b9] text-[#1a1a1a] cordel-border flex flex-col items-center justify-center py-6 px-4 cursor-pointer hover:-translate-y-1 transition-transform"
            >
              <span className="text-3xl mb-2">🪢</span>
              <span className="font-cactus font-bold text-xl uppercase tracking-wider">
                {isFr ? 'Le Varal' : 'O Varal'}
              </span>
              <span className="text-xs font-bold opacity-80 mt-1 text-center">
                {isFr ? 'Parcours de jeux et progression' : 'Jornada de jogos e progresso'}
              </span>
            </button>
          )}

          {/* Studio */}
          {hasAccess('admin') && (
            <button
              onClick={() => handleEnter('studio')}
              className="bg-[#8e44ad] text-[#1a1a1a] cordel-border flex flex-col items-center justify-center py-6 px-4 cursor-pointer hover:-translate-y-1 transition-transform"
            >
              <span className="text-3xl mb-2">👑</span>
              <span className="font-cactus font-bold text-xl uppercase tracking-wider">
                {isFr ? 'La parole du mestre' : 'A palavra do mestre'}
              </span>
              <span className="text-xs font-bold opacity-80 mt-1 text-center">
                {isFr ? 'Arrangements avancés' : 'Arranjos avançados'}
              </span>
            </button>
          )}

        </div>

        {/* Footer info */}
        <div className="mt-16 text-center opacity-70 font-bold text-sm">
          <span className="text-[#27ae60]">✓ {isFr ? 'Audio prêt' : 'Áudio pronto'}</span>
        </div>

      </div>
    </div>
  );
};
