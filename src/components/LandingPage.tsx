import React, { useEffect, useState, useCallback } from 'react';
import { GoogleLoginButton } from './GoogleLoginButton';
import { useAudioStore } from '../stores/useAudioStore';
import { loadTone, getTone } from '@/src/ToneLoader';
import { audioEngine } from '../hooks/useAudioSync';
import { getEcosystemUrl } from '../constants/ecosystemUrls';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

interface LandingPageProps {
  onEnter: () => void;
  lang: 'fr' | 'pt';
  onLanguageChange?: (lang: 'fr' | 'pt') => void;
  isManualOpen?: boolean;
}

// -----------------------------------------------------------------------------
// SVG DES 6 INSTRUMENTS AU TRAIT CORDEL (ENCRE NOIRE SUR FOND PAPIER)
// -----------------------------------------------------------------------------

const AlfaiaCordelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 18 30 Q 50 22 82 32" />
    <path d="M 16 33 Q 48 26 84 30" />
    <path d="M 18 30 Q 50 40 82 32" />
    <path d="M 16 33 Q 50 45 84 30" />
    <path d="M 20 70 Q 50 62 78 72" />
    <path d="M 22 72 Q 50 82 79 70" />
    <path d="M 19 74 Q 48 85 81 68" />
    <path d="M 18 30 Q 12 50 20 70 M 16 33 Q 16 52 19 74" />
    <path d="M 82 32 Q 88 50 78 72 M 84 30 Q 82 52 81 68" />
    <path d="M 19 32 L 28 68 L 38 35 L 48 70 L 58 32 L 68 69 L 80 32" />
    <path d="M 22 36 L 30 70 L 35 30 L 45 68 L 55 38 L 65 71 L 78 35" strokeWidth="1.5" />
    <path d="M 25 45 L 28 55 M 50 40 L 52 50" strokeWidth="1" />
    <path d="M 5 20 Q 20 23 35 25 M 6 17 Q 20 20 34 23" />
    <path d="M 2 18 C 2 12, 10 12, 10 18 C 10 24, 2 24, 2 18 Z" fill="currentColor" />
  </svg>
);

const CaixaCordelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 12 40 C 30 32, 70 32, 88 40 C 70 48, 30 48, 12 40" />
    <path d="M 10 42 C 28 35, 72 35, 90 42 C 72 50, 28 50, 10 42" />
    <path d="M 15 65 C 30 58, 70 58, 85 65 C 70 72, 30 72, 15 65" />
    <path d="M 13 67 C 28 60, 72 60, 87 67" />
    <path d="M 12 40 Q 9 52 15 65 M 10 42 Q 13 52 13 67" />
    <path d="M 88 40 Q 91 52 85 65 M 90 42 Q 87 52 87 67" />
    <path d="M 25 43 L 26 62 M 28 42 L 24 64" />
    <path d="M 45 44 L 46 66 M 47 43 L 44 65" />
    <path d="M 65 44 L 64 66 M 67 43 L 66 65" />
    <path d="M 15 45 L 85 60" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M 6 20 L 50 40 M 8 17 L 48 37" />
    <path d="M 94 15 L 45 38 M 92 18 L 43 40" />
  </svg>
);

const GongueCordelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 15 75 Q 50 95 85 75 Q 50 60 15 75" />
    <path d="M 12 73 Q 50 100 88 73 Q 50 55 12 73" />
    <path d="M 15 75 Q 35 45 45 30 M 12 73 Q 32 42 42 28" />
    <path d="M 85 75 Q 65 45 55 30 M 88 73 Q 68 42 58 28" />
    <path d="M 42 28 Q 50 22 58 28 M 45 30 Q 50 25 55 30" />
    <path d="M 48 26 L 45 5 M 52 26 L 55 5" />
    <path d="M 85 15 L 60 55 M 88 12 L 63 53" strokeWidth="2.5" />
    <path d="M 8 60 Q 2 70 8 85 M 92 60 Q 98 70 92 85" strokeWidth="1.5" strokeDasharray="4 4" />
  </svg>
);

const AgbeCordelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 46 18 Q 18 38 23 72 C 25 95, 82 95, 78 72 Q 72 38 54 18" strokeWidth="2.2" />
    <path d="M 44 20 Q 20 40 25 70 C 27 92, 80 92, 76 70 Q 70 40 56 20" strokeWidth="1.5" strokeDasharray="3 3" />
    <path d="M 44 20 C 44 13, 56 13, 56 20 C 56 27, 44 27, 44 20 Z" strokeWidth="2.5" />
    <path d="M 46 21 C 46 16, 54 16, 54 21 C 54 26, 46 26, 46 21 Z" strokeWidth="1.2" />
    <path d="M 48 20 L 52 20" strokeWidth="0.8" />
    <path d="M 28 48 L 78 88 M 24 60 L 68 95 M 22 72 L 55 98 M 38 38 L 83 75" strokeWidth="1.2" strokeOpacity="0.8" />
    <path d="M 78 48 L 28 88 M 80 60 L 38 95 M 82 72 L 55 98 M 68 38 L 22 75" strokeWidth="1.2" strokeOpacity="0.8" />
    <circle cx="50" cy="55" r="1.5" fill="currentColor" />
    <circle cx="65" cy="68" r="1.8" fill="currentColor" />
    <circle cx="40" cy="80" r="1.6" fill="currentColor" />
    <circle cx="55" cy="90" r="1.4" fill="currentColor" />
    <circle cx="35" cy="65" r="1.3" fill="currentColor" />
    <path d="M 30 85 Q 50 90 70 85" strokeWidth="1" strokeDasharray="1 1" />
  </svg>
);

const MineiroCordelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 22 25 L 72 65 M 20 28 L 70 68" />
    <path d="M 32 15 L 82 55 M 34 12 L 84 52" />
    <path d="M 22 25 Q 15 22 32 15 M 20 28 Q 12 25 34 12" />
    <path d="M 72 65 Q 85 75 82 55 M 70 68 Q 88 78 84 52" />
    <path d="M 28 26 Q 32 30 38 20 M 27 28 L 37 22" />
    <path d="M 45 40 Q 50 45 55 35 M 44 42 L 54 37" />
    <path d="M 62 55 Q 68 60 72 50 M 61 57 L 71 52" />
    <path d="M 12 18 Q 8 12 15 8 M 5 25 Q 8 18 15 15" strokeWidth="1.5" />
    <path d="M 88 82 Q 95 88 85 92 M 95 75 Q 92 82 85 85" strokeWidth="1.5" />
    <path d="M 10 35 L 10 35 M 15 45 L 15 45 M 85 65 L 85 65 M 90 55 L 90 55" strokeWidth="3" />
  </svg>
);

const TimbalCordelIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="50" cy="25" rx="25" ry="7" />
    <ellipse cx="50" cy="27" rx="24" ry="6.5" />
    <path d="M 25 25 L 38 80 L 62 80 L 75 25" />
    <path d="M 26 27 L 39 80" />
    <path d="M 74 27 L 61 80" />
    <ellipse cx="50" cy="80" rx="12" ry="3.5" />
    <path d="M 33 26 L 41 80" strokeWidth="1" />
    <path d="M 50 32 L 50 80" strokeWidth="1" />
    <path d="M 67 26 L 59 80" strokeWidth="1" />
  </svg>
);

// -----------------------------------------------------------------------------
// PINCE À LINGE EN BOIS (PREGADOR) SVG
// -----------------------------------------------------------------------------

const ClothespinSvg = () => (
  <svg className="w-5 h-8 text-[#1a1a1a] drop-shadow-sm select-none" viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2 L9 13 L9 30 L5 30 L5 2 Z" fill="#d4a373" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M14 2 L11 13 L11 30 L15 30 L15 2 Z" fill="#c2905d" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="10" cy="13" r="2.8" fill="#71717a" stroke="#1a1a1a" strokeWidth="1.2" />
    <line x1="6" y1="13" x2="14" y2="13" stroke="#1a1a1a" strokeWidth="1.4" />
  </svg>
);

// -----------------------------------------------------------------------------
// DRAPEAU / ESTANDARTE DU PERNAMBUCO (CENTRE SOMMET, SANS SLOGAN PUB)
// -----------------------------------------------------------------------------

const PernambucoEstandarte = () => (
  <div className="flex flex-col items-center select-none" title="Bandeira de Pernambuco — Maracatu de Baque Virado">
    <svg className="w-24 sm:w-28 md:w-36 h-auto overflow-visible" viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">
      <line x1="100" y1="6" x2="100" y2="24" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      <path d="M 40 26 L 100 10 L 160 26" fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
      <line x1="24" y1="26" x2="176" y2="26" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
      
      <line x1="38" y1="26" x2="38" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="100" y1="26" x2="100" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="162" y1="26" x2="162" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />

      <g id="flag-body">
        <path d="M 32 34 L 168 34 L 168 84 L 32 84 Z" fill="#1b4965" stroke="#1a1a1a" strokeWidth="2" />
        <path d="M 32 84 L 168 84 L 168 134 L 32 134 Z" fill="#f4ecd8" stroke="#1a1a1a" strokeWidth="2" />

        <polygon points="100,39 102,44 107,44 103,47 105,52 100,49 95,52 97,47 93,44 98,44" fill="#f4a261" stroke="#1a1a1a" strokeWidth="0.6" />

        <path d="M 60 84 A 40 40 0 0 1 140 84" fill="none" stroke="#8b2a1a" strokeWidth="5.5" />
        <path d="M 64 84 A 36 36 0 0 1 136 84" fill="none" stroke="#e9c46a" strokeWidth="4" />
        <path d="M 67 84 A 33 33 0 0 1 133 84" fill="none" stroke="#2a9d8f" strokeWidth="3" />

        <circle cx="100" cy="84" r="14" fill="#e9c46a" stroke="#1a1a1a" strokeWidth="1.2" />
        <line x1="100" y1="67" x2="100" y2="64" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="88" y1="72" x2="85" y2="69" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="112" y1="72" x2="115" y2="69" stroke="#1a1a1a" strokeWidth="1.5" />

        <rect x="96" y="93" width="8" height="32" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
        <rect x="88" y="101" width="24" height="8" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
      </g>

      <g className="lp-fringes">
        <path
          d="M 32 134 l 2.5 16 l 2.5 -12 l 2.5 15 l 2.5 -12 l 2.5 11 l 2.5 -13 l 2.5 16 l 2.5 -13 l 2.5 15 l 2.5 -15 l 2.5 14 l 2.5 -13 l 2.5 15 l 2.5 -11 l 2.5 13 l 2.5 -14 l 2.5 15 l 2.5 -11 l 2.5 11 l 2.5 -15 l 2.5 15 l 2.5 -12 l 2.5 14 l 2.5 -10 l 2.5 16 l 2.5 -13 l 2.5 12 l 2.5 -11 l 2.5 14 l 2.5 -12 l 2.5 13 l 2.5 -13 l 2.5 11 l 2.5 -12 l 2.5 15 l 2.5 -15 l 2.5 13 l 2.5 -15 l 2.5 14 l 2.5 -15 l 2.5 12 l 2.5 -11 l 2.5 10 l 2.5 -16 l 2.5 12 l 2.5 -13 l 2.5 11 l 2.5 -12 l 2.5 10 l 2.5 -11 l 2.5 16 l 2.5 -10 l 2.5 15 l 2.5 -15 l 2.5 12 l 2.5 -12 l 2.5 11 l 2.5 -15"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  </div>
);

// -----------------------------------------------------------------------------
// COMPOSANT PRINCIPAL LANDINGPAGE
// -----------------------------------------------------------------------------

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  lang,
  onLanguageChange,
}) => {
  const [isToneReady, setIsToneReady] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentLang, setCurrentLang] = useState<'fr' | 'pt'>(() => {
    const saved = localStorage.getItem('o_gridador_lang');
    if (saved === 'fr' || saved === 'pt') return saved;
    if (lang === 'fr' || lang === 'pt') return lang;
    const isBrowserFr = typeof navigator !== 'undefined' && navigator.language.startsWith('fr');
    return isBrowserFr ? 'fr' : 'pt';
  });

  useEffect(() => {
    if (lang && lang !== currentLang) {
      setCurrentLang(lang);
    }
  }, [lang]);

  const handleLanguageSelect = (newLang: 'fr' | 'pt') => {
    setCurrentLang(newLang);
    localStorage.setItem('o_gridador_lang', newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  useEffect(() => {
    loadTone()
      .then(() => setIsToneReady(true))
      .catch((err) => console.error("Tone.js background preload error:", err));
  }, []);

  const handleEnterRoda = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (isUnlocking) return;
    setIsUnlocking(true);

    const Tone = safeGetTone();
    if (Tone) {
      try {
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
      } catch (err) {
        console.warn("Tone context start warning:", err);
      }
    }

    useAudioStore.getState().unlockAudio();
    localStorage.setItem('ogirador_has_seen_welcome', 'true');
    onEnter();
  }, [isUnlocking, onEnter]);

  const handleInstrumentTap = useCallback(async (instId: string, strokeSymbol: string) => {
    const Tone = safeGetTone();
    if (Tone && Tone.context.state !== 'running') {
      try {
        await Tone.start();
        useAudioStore.getState().unlockAudio();
      } catch (e) {
        console.warn("Could not unlock audio on preview:", e);
      }
    }

    if (audioEngine) {
      try {
        audioEngine.playPreview(instId, strokeSymbol, 0, 1.0);
      } catch (e) {
        console.warn("playPreview error:", e);
      }
    }
  }, []);

  const isFr = currentLang === 'fr';

  const bateriaInstruments = [
    { id: 'marcante', name: 'Alfaia', stroke: 'D', Icon: AlfaiaCordelIcon },
    { id: 'caixa', name: 'Caixa', stroke: 'D', Icon: CaixaCordelIcon },
    { id: 'gongue', name: 'Gonguê', stroke: 'D', Icon: GongueCordelIcon },
    { id: 'agbe', name: 'Agbê', stroke: 'D', Icon: AgbeCordelIcon },
    { id: 'mineiro', name: 'Mineiro', stroke: 'D', Icon: MineiroCordelIcon },
    { id: 'timbal', name: 'Timbal', stroke: 'A', Icon: TimbalCordelIcon },
  ];

  return (
    <div id="landing-page" className="min-h-screen bg-[#f4ecd8] text-[#1a1a1a] flex flex-col justify-between relative selection:bg-[#8b2a1a] selection:text-[#f4ecd8]">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. EN-TÊTE : PROFIL EN HAUT À DROITE & BANDEIRA AU CENTRE          */}
      {/* ------------------------------------------------------------------ */}
      <header className="w-full relative pt-2 px-4 sm:px-6 max-w-7xl mx-auto z-30 flex items-center justify-center">
        
        {/* Drapeau du Pernambuco au centre, noble & sans texte publicitaire */}
        <div className="flex justify-center pt-1">
          <PernambucoEstandarte />
        </div>

        {/* Profil Google / Utilisateur bien calé et visible en haut à droite */}
        <div className="absolute top-3 right-4 sm:top-4 sm:right-6 z-40">
          <GoogleLoginButton lang={currentLang} align="right" size="large" />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 2. LE GRAND "O GIRADOR" AVEC BOUTON ENTRA NA RODA AU COEUR DU "O"  */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full flex flex-col items-center text-center px-4 pt-2 pb-6 max-w-5xl mx-auto z-20">
        
        {/* Ensemble Titre O GIRADOR */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
            
            {/* Le grand O avec roue d'Alfaia et bouton d'entrée à l'intérieur */}
            <div className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-center justify-center flex-shrink-0">
              {/* L'alfaia vue de dessus qui tourne */}
              <svg className="lp-alfaia-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#1a1a1a" strokeWidth="1.2" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1a1a1a" strokeWidth="0.9" strokeDasharray="2 2" />
                <path d="M 50 2 L 65 12 L 50 22 L 35 12 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 84 16 L 90 30 L 78 38 L 70 24 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 98 50 L 88 65 L 78 50 L 88 35 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 84 84 L 70 90 L 60 78 L 74 70 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 50 98 L 35 88 L 50 78 L 65 88 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 16 84 L 10 70 L 22 62 L 30 76 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 2 50 L 12 35 L 22 50 L 12 65 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
                <path d="M 16 16 L 30 10 L 40 22 L 26 30 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              </svg>
              
              {/* Le bouton ENTRA NA RODA inséré au cœur du O */}
              <button
                type="button"
                onClick={handleEnterRoda}
                disabled={!isToneReady || isUnlocking}
                className={`lp-entra-btn cursor-pointer z-10 transition-all ${!isToneReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isFr ? "Entrer dans la Roda" : "Entrar na Roda"}
              >
                {!isToneReady ? (
                  <span className="flex items-center justify-center animate-spin text-xl sm:text-2xl">⚙️</span>
                ) : isUnlocking ? (
                  <span className="flex items-center justify-center animate-spin text-xl sm:text-2xl">⚙️</span>
                ) : isFr ? (
                  <>ENTRER<br/>DANS LA<br/>RODA</>
                ) : (
                  <>ENTRA<br/>NA RODA</>
                )}
              </button>
            </div>

            {/* Lettrage GIRADOR en police Cactus */}
            <div className="font-cactus text-5xl sm:text-7xl md:text-8xl lg:text-[10.5rem] font-bold tracking-tight text-[#1a1a1a] leading-none select-none">
              GIRADOR
            </div>
          </div>

          {/* Tampon SEQUENCIADOR placé sous le 'R' de GIRADOR (aligné à droite du titre) */}
          <div className="w-full max-w-3xl flex justify-end mt-1 sm:mt-2 pr-2 sm:pr-8 md:pr-12">
            <span className="inline-block px-3 sm:px-4 py-1 font-cactus font-bold text-sm sm:text-base md:text-xl uppercase cordel-stamp-red">
              SEQUENCIADOR
            </span>
          </div>
        </div>

        {/* Accroche bilingue sous le titre */}
        <p className="font-serif italic text-sm sm:text-base md:text-lg text-[#1a1a1a]/90 max-w-xl mx-auto px-4 mt-3">
          {isFr ? '« Le séquenceur circulaire du Maracatu de Baque Virado »' : '« O sequenciador circular do Maracatu de Baque Virado »'}
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. FRISE DES 6 INSTRUMENTS (BANC DE BATERIA & PRÉCHARGEMENT)       */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full max-w-4xl mx-auto px-4 py-3 z-20">
        <div className="text-center mb-3">
          <span className="font-cactus text-xs uppercase tracking-widest text-[#1a1a1a]/60">
            {isFr ? '✦ Écoute immédiate & lutherie acoustique ✦' : '✦ Escuta imediata & lutheria acústica ✦'}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
          {bateriaInstruments.map(({ id, name, stroke, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleInstrumentTap(id, stroke)}
              className="cordel-instrument-card w-full max-w-[120px] flex flex-col items-center p-2 sm:p-3 bg-[#eaddcf]/50 hover:bg-[#eaddcf] border-2 border-[#1a1a1a] rounded-sm cordel-wood-shadow-sm cursor-pointer group select-none"
              title={isFr ? `Tester la frappe de : ${name}` : `Ouvir o toque de : ${name}`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-[#1a1a1a] group-hover:text-[#8b2a1a] transition-colors">
                <Icon />
              </div>
              <span className="font-cactus font-bold text-xs sm:text-sm mt-1 uppercase text-[#1a1a1a]">
                {name}
              </span>
              <span className="text-[10px] text-[#8b2a1a] font-mono font-bold mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                ▶ {isFr ? 'Taper' : 'Tocar'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. LA CORDELETTE & LES 4 LIVRETS DE CORDEL ANIMÉS (ORGANIZAD'OR)   */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10 z-20">
        
        {/* Trait brut horizontal de la Cordelette */}
        <div className="w-full border-t-2 border-[#1a1a1a] relative mb-[-12px] z-10" />

        {/* Grille responsive fluide des 4 livrets de cordel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 w-full">
          
          {/* ---------------- LIVRET 1 : A TRADIÇÃO ORAL ---------------- */}
          <article className="cordel-booklet cordel-booklet-1 flex flex-col pt-3 relative">
            <div className="flex justify-center mb-[-6px] z-20">
              <ClothespinSvg />
            </div>
            <div className="flex-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] p-5 sm:p-6 cordel-wood-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
                  <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
                    {isFr ? 'LIVRET 01' : 'FOLHETO 01'}
                  </span>
                  <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
                    {isFr ? 'LA TRADITION ORALE' : 'A TRADIÇÃO ORAL'}
                  </span>
                </div>
                <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
                  {isFr ? '« La mémoire d\'abord »' : '« A memória primeiro »'}
                </h2>
                <p className="font-serif text-xs sm:text-sm text-[#1a1a1a]/85 leading-relaxed">
                  {isFr
                    ? "Le Maracatu de Baque Virado vit dans la rue, par le chant, l'écoute et la transmission directe des mestres. Cet outil ne remplace ni les répétitions ni l'enseignement oral. Il a été pensé comme un carnet de notes : un support pour poser des repères, documenter les toadas et mémoriser les arrangements de chaque batuque et Nações."
                    : "O Maracatu de Baque Virado vive na rua, pelo canto, pela escuta e pela transmissão direta dos mestres. Esta ferramenta não substitui os ensaios nem o ensino oral. Foi pensada como um caderno de notas: um suporte para fixar referências, documentar as toadas e memorizar os arranjos de cada batuque e Nações."}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
                <span>✦ Maracatu Vivo</span>
                <span>Nações & Baque ✦</span>
              </div>
            </div>
          </article>

          {/* ---------------- LIVRET 2 : O SEQUENCIADOR ---------------- */}
          <article className="cordel-booklet cordel-booklet-2 flex flex-col pt-3 relative">
            <div className="flex justify-center mb-[-6px] z-20">
              <ClothespinSvg />
            </div>
            <div className="flex-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] p-5 sm:p-6 cordel-wood-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
                  <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
                    {isFr ? 'LIVRET 02' : 'FOLHETO 02'}
                  </span>
                  <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
                    {isFr ? 'LE SÉQUENCEUR' : 'O SEQUENCIADOR'}
                  </span>
                </div>
                <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
                  {isFr ? '« Apprendre et décortiquer le baque »' : '« Aprender e decifrar o baque »'}
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm font-serif text-[#1a1a1a]/85 leading-snug">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'Le cycle à 360° :' : 'O ciclo em 360° :'}</strong>{' '}
                      {isFr
                        ? 'visualiser la tourne continue d’un coup d’œil, sans coupure linéaire.'
                        : 'visualizar a levada contínua num relance, sem corte linear.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'L’écoute analytique :' : 'A escuta analítica :'}</strong>{' '}
                      {isFr
                        ? 'isoler un pupitre en solo, ralentir le tempo sans altérer le timbre et boucler les passages clés.'
                        : 'solar um naipe, desacelerar o andamento sem alterar o timbre e criar loops nos trechos-chave.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'L’acoustique authentique :' : 'A acústica autêntica :'}</strong>{' '}
                      {isFr
                        ? 'banques de sons enregistrées sur instruments réels (Alfaias, Caixas, Gonguê, Agbê, Mineiro et Timbal).'
                        : 'bancos de sons gravados em instrumentos reais (Alfaias, Caixas, Gonguê, Agbê, Mineiro e Timbal).'}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'Le balanço vivant :' : 'O balanço vivo :'}</strong>{' '}
                      {isFr
                        ? 'réglage fin du micro-timing pour retrouver le groove organique propre à chaque batuque.'
                        : 'ajuste fino do micro-timing para resgatar o groove orgânico próprio de cada batuque.'}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
                <span>✦ 360° Loop</span>
                <span>Micro-Timing ✦</span>
              </div>
            </div>
          </article>

          {/* ------------ LIVRET 3 : ORGANIZADOR & DANÇADOR ------------ */}
          <article className="cordel-booklet cordel-booklet-3 flex flex-col pt-3 relative">
            <div className="flex justify-center mb-[-6px] z-20">
              <ClothespinSvg />
            </div>
            <div className="flex-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] p-5 sm:p-6 cordel-wood-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
                  <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
                    {isFr ? 'LIVRET 03' : 'FOLHETO 03'}
                  </span>
                  <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
                    ORGANIZADOR & DANÇADOR
                  </span>
                </div>
                <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
                  {isFr ? '« De la partition à la répétition »' : '« Da partitura ao ensaio »'}
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm font-serif text-[#1a1a1a]/85 leading-snug">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'Passerelle pédagogique :' : 'Ponte pedagógica :'}</strong>{' '}
                      {isFr
                        ? 'exploitation directe des morceaux créés dans Organizador pour générer des fiches de révision et QCM interactifs.'
                        : 'integração direta das músicas criadas no Organizador para gerar fichas de revisão e questionários interativos.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'Le geste et le pas :' : 'O gesto e o passo :'}</strong>{' '}
                      {isFr
                        ? 'synchronisation des mouvements de danse de Dançador sur la pulsation exacte des tambours.'
                        : 'sincronização dos movimentos de dança do Dançador na pulsação exata dos tambores.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'Gestion collective :' : 'Gestão coletiva :'}</strong>{' '}
                      {isFr
                        ? 'organisation du répertoire interne, des répétitions et de la vie de groupe sur une plateforme unifiée.'
                        : 'organização do repertório interno, dos ensaios e da vida do grupo em uma plataforma unificada.'}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
                <span>✦ Pédagogie</span>
                <span>Corps & Pas ✦</span>
              </div>
            </div>
          </article>

          {/* ---------------- LIVRET 4 : ORQUESTRADOR ------------------ */}
          <article className="cordel-booklet cordel-booklet-4 flex flex-col pt-3 relative">
            <div className="flex justify-center mb-[-6px] z-20">
              <ClothespinSvg />
            </div>
            <div className="flex-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] p-5 sm:p-6 cordel-wood-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
                  <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
                    {isFr ? 'LIVRET 04' : 'FOLHETO 04'}
                  </span>
                  <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
                    ORQUESTRADOR
                  </span>
                </div>
                <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
                  {isFr ? '« Connecter les Nações et les groupes »' : '« Conectar as Nações e os grupos »'}
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm font-serif text-[#1a1a1a]/85 leading-snug">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'La carte mondiale :' : 'O mapa mundial :'}</strong>{' '}
                      {isFr
                        ? 'inscription de son groupe ou nação sur la cartographie internationale des batucadas et ensembles percussifs.'
                        : 'cadastro do seu grupo ou nação na cartografia internacional de batucadas e grupos percussivos.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
                    <span>
                      <strong>{isFr ? 'Partage de rythmes :' : 'Compartilhamento :'}</strong>{' '}
                      {isFr
                        ? 'échange de motifs et découverte d’arrangements créés par la communauté.'
                        : 'troca de levadas e descoberta de arranjos criados pela comunidade.'}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Bouton d'action vers Orquestrador */}
              <div className="mt-4 pt-3 border-t border-[#1a1a1a]/20">
                <a
                  href={getEcosystemUrl('orquestrador')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 px-3 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#1a1a1a] text-center border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase tracking-wide cordel-wood-shadow-sm transition-colors active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {isFr ? '🌍 Inscrire mon groupe sur la carte' : '🌍 Cadastrar meu grupo no mapa'}
                </a>
              </div>
            </div>
          </article>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. PIED DE PAGE : NAVIGATION BILINGUE & LIENS DE L'ÉCOSYSTÈME     */}
      {/* ------------------------------------------------------------------ */}
      <footer className="w-full border-t-2 border-[#1a1a1a]/20 py-5 px-4 bg-[#eaddcf]/30 z-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          
          <div className="font-cactus text-xs text-[#1a1a1a]/70 tracking-wider select-none">
            O GIRADOR © 2026-2027
          </div>

          {/* Liens vers les autres applications de l'écosystème */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 font-cactus text-xs sm:text-sm">
            <span className="text-[#1a1a1a]/40 font-mono hidden sm:inline">•</span>
            <a
              href={getEcosystemUrl('organizador')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a1a1a] hover:text-[#8b2a1a] transition-colors underline decoration-[#1a1a1a]/40 hover:decoration-[#8b2a1a]"
            >
              📋 Organizador ↗
            </a>
            <span className="text-[#1a1a1a]/40 font-mono">•</span>
            <a
              href={getEcosystemUrl('dancador')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a1a1a] hover:text-[#8b2a1a] transition-colors underline decoration-[#1a1a1a]/40 hover:decoration-[#8b2a1a]"
            >
              💃 Dançador ↗
            </a>
            <span className="text-[#1a1a1a]/40 font-mono">•</span>
            <a
              href={getEcosystemUrl('orquestrador')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a1a1a] hover:text-[#8b2a1a] transition-colors underline decoration-[#1a1a1a]/40 hover:decoration-[#8b2a1a]"
            >
              🌍 Orquestrador ↗
            </a>
          </div>

          {/* Sélecteur bilingue discret */}
          <div className="flex items-center gap-1 font-cactus text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => handleLanguageSelect('fr')}
              className={`px-3 py-1 border transition-all cursor-pointer ${
                isFr
                  ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] font-bold shadow-[2px_2px_0px_#8b2a1a]'
                  : 'bg-transparent text-[#1a1a1a] border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
              }`}
            >
              🇫🇷 Français
            </button>
            <span className="text-[#1a1a1a]/40 font-mono px-1">|</span>
            <button
              type="button"
              onClick={() => handleLanguageSelect('pt')}
              className={`px-3 py-1 border transition-all cursor-pointer ${
                !isFr
                  ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] font-bold shadow-[2px_2px_0px_#8b2a1a]'
                  : 'bg-transparent text-[#1a1a1a] border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
              }`}
            >
              🇧🇷 Português
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
};
