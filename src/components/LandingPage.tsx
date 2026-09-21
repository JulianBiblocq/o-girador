import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
    {/* Bras en bois gauche */}
    <path d="M6 2 L9 13 L9 30 L5 30 L5 2 Z" fill="#d4a373" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
    {/* Bras en bois droit */}
    <path d="M14 2 L11 13 L11 30 L15 30 L15 2 Z" fill="#c2905d" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
    {/* Ressort métallique central */}
    <circle cx="10" cy="13" r="2.8" fill="#71717a" stroke="#1a1a1a" strokeWidth="1.2" />
    <line x1="6" y1="13" x2="14" y2="13" stroke="#1a1a1a" strokeWidth="1.4" />
  </svg>
);

// -----------------------------------------------------------------------------
// DRAPEAU / ESTANDARTE DU PERNAMBUCO (CENTRE SOMMET, SANS SLOGAN PUB)
// -----------------------------------------------------------------------------

const PernambucoEstandarte = () => (
  <div className="flex flex-col items-center select-none" title="Bandeira de Pernambuco — Maracatu de Baque Virado">
    <svg className="w-28 sm:w-32 md:w-40 h-auto overflow-visible" viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">
      {/* Mât & potence supérieure de l'estandarte */}
      <line x1="100" y1="6" x2="100" y2="24" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      <path d="M 40 26 L 100 10 L 160 26" fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
      <line x1="24" y1="26" x2="176" y2="26" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
      
      {/* Attaches de suspension */}
      <line x1="38" y1="26" x2="38" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="100" y1="26" x2="100" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="162" y1="26" x2="162" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />

      {/* Bannière principale */}
      <g id="flag-body">
        {/* Moitié supérieure bleue */}
        <path d="M 32 34 L 168 34 L 168 84 L 32 84 Z" fill="#1b4965" stroke="#1a1a1a" strokeWidth="2" />
        {/* Moitié inférieure blanche */}
        <path d="M 32 84 L 168 84 L 168 134 L 32 134 Z" fill="#f4ecd8" stroke="#1a1a1a" strokeWidth="2" />

        {/* Étoile jaune en haut */}
        <polygon points="100,39 102,44 107,44 103,47 105,52 100,49 95,52 97,47 93,44 98,44" fill="#f4a261" stroke="#1a1a1a" strokeWidth="0.6" />

        {/* Arc-en-ciel Pernambucano (rouge, jaune, vert) */}
        <path d="M 60 84 A 40 40 0 0 1 140 84" fill="none" stroke="#8b2a1a" strokeWidth="5.5" />
        <path d="M 64 84 A 36 36 0 0 1 136 84" fill="none" stroke="#e9c46a" strokeWidth="4" />
        <path d="M 67 84 A 33 33 0 0 1 133 84" fill="none" stroke="#2a9d8f" strokeWidth="3" />

        {/* Soleil radiant d'or */}
        <circle cx="100" cy="84" r="14" fill="#e9c46a" stroke="#1a1a1a" strokeWidth="1.2" />
        {/* Rayons solaires */}
        <line x1="100" y1="67" x2="100" y2="64" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="88" y1="72" x2="85" y2="69" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="112" y1="72" x2="115" y2="69" stroke="#1a1a1a" strokeWidth="1.5" />

        {/* Croix rouge (Cruz de São Jerônimo) dans la partie blanche */}
        <rect x="96" y="93" width="8" height="32" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
        <rect x="88" y="101" width="24" height="8" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
      </g>

      {/* Franges animées en bas de l'estandarte */}
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
  isManualOpen = false,
}) => {
  const { userProfile } = useAuth();
  const [isToneReady, setIsToneReady] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentLang, setCurrentLang] = useState<'fr' | 'pt'>(() => {
    const saved = localStorage.getItem('o_gridador_lang');
    if (saved === 'fr' || saved === 'pt') return saved;
    if (lang === 'fr' || lang === 'pt') return lang;
    const isBrowserFr = typeof navigator !== 'undefined' && navigator.language.startsWith('fr');
    return isBrowserFr ? 'fr' : 'pt';
  });

  // Sync si prop lang change
  useEffect(() => {
    if (lang && lang !== currentLang) {
      setCurrentLang(lang);
    }
  }, [lang]);

  // Changement de langue bilingue
  const handleLanguageSelect = (newLang: 'fr' | 'pt') => {
    setCurrentLang(newLang);
    localStorage.setItem('o_gridador_lang', newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
    useAudioStore.getState();
  };

  // Préchargement Tone.js en tâche de fond
  useEffect(() => {
    loadTone()
      .then(() => setIsToneReady(true))
      .catch((err) => console.error("Tone.js background preload error:", err));
  }, []);

  // Déverrouillage Audio et entrée dans la Roda
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

  // Pré-écoute acoustique directe d'un instrument de la frise
  const handleInstrumentTap = useCallback(async (instId: string, strokeSymbol: string) => {
    // Règle d'exécution : déverrouillage synchrone au premier geste
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

  // Configuration des 6 instruments de la frise
  const bateriaInstruments = [
    { id: 'marcante', name: 'Alfaia', stroke: 'D', Icon: AlfaiaCordelIcon },
    { id: 'caixa', name: 'Caixa', stroke: 'D', Icon: CaixaCordelIcon },
    { id: 'gongue', name: 'Gonguê', stroke: 'D', Icon: GongueCordelIcon },
    { id: 'agbe', name: 'Agbê', stroke: 'D', Icon: AgbeCordelIcon },
    { id: 'mineiro', name: 'Mineiro', stroke: 'D', Icon: MineiroCordelIcon },
    { id: 'timbal', name: 'Timbal', stroke: 'A', Icon: TimbalCordelIcon },
  ];

  return (
    <div id="landing-page" className="min-h-screen bg-[#f4ecd8] text-[#1a1a1a] flex flex-col justify-between selection:bg-[#8b2a1a] selection:text-[#f4ecd8]">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. EN-TÊTE : NAVIGATION & SOMMET (BANDEIRA DE PERNAMBUCO)          */}
      {/* ------------------------------------------------------------------ */}
      <header className="w-full flex items-center justify-between pt-4 px-4 sm:px-8 max-w-7xl mx-auto z-20">
        <div>
          {isManualOpen ? (
            <button
              type="button"
              onClick={onEnter}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase transition-colors shadow-[2px_2px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              title={isFr ? "Retourner à la Roda" : "Voltar à Roda"}
            >
              ← {isFr ? 'Retour à la Roda' : 'Voltar à Roda'}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Sommet : Drapeau du Pernambuco au centre, sans publicité */}
        <div className="flex-1 flex justify-center">
          <PernambucoEstandarte />
        </div>

        <div>
          <GoogleLoginButton lang={currentLang} align="right" />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 2. IDENTITÉ DU LOGO « O GIRADOR » & SOUS-TITRE EN TAMPON ROUGE     */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full flex flex-col items-center text-center px-4 pt-4 pb-8 max-w-5xl mx-auto z-20">
        
        {/* Bloc Logo Sanctuarisé */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 my-2">
          {/* Composant / SVG de l'Alfaia tournante dans le « O » */}
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 flex items-center justify-center flex-shrink-0">
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
            
            {/* Centre circulaire du O au trait linogravure */}
            <div className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-2 border-[#1a1a1a] bg-[#f4ecd8] flex items-center justify-center shadow-inner">
              <span className="text-xl sm:text-2xl md:text-3xl select-none">🥁</span>
            </div>
          </div>

          {/* Lettrage GIRADOR */}
          <div className="font-cactus text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-[#1a1a1a] leading-none select-none">
            GIRADOR
          </div>
        </div>

        {/* Sous-titre en rouge tampon Cordel */}
        <div className="mt-1 mb-3">
          <span className="inline-block px-4 py-1 font-cactus font-bold text-sm sm:text-base md:text-lg uppercase cordel-stamp-red">
            SEQUENCIADOR
          </span>
        </div>

        {/* Accroche bilingue */}
        <p className="font-serif italic text-sm sm:text-base md:text-lg text-[#1a1a1a]/90 max-w-xl mx-auto px-4 mt-1">
          {isFr ? '« Le séquenceur circulaire du Maracatu de Baque Virado »' : '« O sequenciador circular do Maracatu de Baque Virado »'}
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* BOUTON D'ENTRÉE PRINCIPAL MASSIF                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-6 mb-2">
          <button
            type="button"
            onClick={handleEnterRoda}
            disabled={isUnlocking}
            className="group relative px-6 sm:px-10 py-4 sm:py-5 bg-[#8b2a1a] hover:bg-[#6e1e11] text-[#f4ecd8] border-3 border-[#1a1a1a] font-cactus font-black text-lg sm:text-2xl uppercase tracking-wider transition-all duration-150 cordel-wood-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1a1a1a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer select-none"
          >
            {isUnlocking ? (
              <span className="flex items-center gap-3">
                <span className="animate-spin text-2xl">⚙️</span>
                <span>{isFr ? 'OUVERTURE...' : 'ABRINDO...'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <span className="group-hover:scale-125 transition-transform duration-150">🥁</span>
                <span>{isFr ? 'ENTRER DANS LA RODA' : 'ENTRAR NA RODA'}</span>
              </span>
            )}
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. FRISE DES 6 INSTRUMENTS (BANC DE BATERIA & PRÉCHARGEMENT)       */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full max-w-4xl mx-auto px-4 py-4 z-20">
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
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 z-20">
        
        {/* Trait brut horizontal de la Cordelette */}
        <div className="w-full border-t-2 border-[#1a1a1a] relative mb-[-12px] z-10" />

        {/* Grille responsive des 4 livrets de cordel */}
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
                    FOLHETO 01
                  </span>
                  <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
                    A TRADIÇÃO ORAL
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
                    FOLHETO 02
                  </span>
                  <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
                    O SEQUENCIADOR
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
                    FOLHETO 03
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
                    FOLHETO 04
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
      {/* 5. PIED DE PAGE & NAVIGATION BILINGUE                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="w-full border-t-2 border-[#1a1a1a]/20 py-6 px-4 bg-[#eaddcf]/30 z-20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          
          {/* Bouton de retour rapide si ouvert manuellement depuis À propos */}
          <div>
            {isManualOpen ? (
              <button
                type="button"
                onClick={onEnter}
                className="px-4 py-2 bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase transition-colors shadow-[2px_2px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                ← {isFr ? 'Retour à la Roda' : 'Voltar à Roda'}
              </button>
            ) : (
              <span className="font-cactus text-xs text-[#1a1a1a]/60 tracking-wider">
                O GIRADOR © 2026-2027
              </span>
            )}
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

          <div className="text-[11px] font-serif text-[#1a1a1a]/60">
            {isFr ? 'Transmission orale & lutherie numérique' : 'Tradição oral & lutheria digital'}
          </div>
        </div>
      </footer>

    </div>
  );
};
