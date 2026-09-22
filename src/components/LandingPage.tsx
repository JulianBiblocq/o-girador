import React, { useEffect, useState, useCallback, useRef } from 'react';
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
// POTEAU EN BOIS RUSTIQUE (ESTACA DE MADEIRA DO CORDEL) SVG
// -----------------------------------------------------------------------------

const CordelWoodenPostSvg: React.FC<{ isRight?: boolean; className?: string }> = ({
  isRight = false,
  className = "w-7 sm:w-8 md:w-9 h-[380px] sm:h-[430px] md:h-[470px]"
}) => {
  const gradId = isRight ? "postWoodGradR" : "postWoodGradL";
  return (
    <svg
      className={`${className} select-none overflow-visible flex-shrink-0 drop-shadow-[3px_4px_6px_rgba(0,0,0,0.35)] ${isRight ? '-scale-x-100' : ''}`}
      viewBox="0 0 40 440"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7a461b" />
          <stop offset="30%" stopColor="#b58245" />
          <stop offset="70%" stopColor="#9c6c33" />
          <stop offset="100%" stopColor="#573110" />
        </linearGradient>
      </defs>

      {/* Sommet taillé en biseau / pointe au canif cordel et corps prolongé jusqu'en bas */}
      <path
        d="M 8 18 L 20 4 L 32 18 L 32 438 L 8 438 Z"
        fill={`url(#${gradId})`}
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Ombrage du biseau gauche tout du long */}
      <path d="M 8 18 L 20 4 L 20 438 L 8 438 Z" fill="#000000" fillOpacity="0.18" />

      {/* Cernes, stries et nœuds du bois gravés de haut en bas */}
      <path d="M 14 26 L 14 85 M 15 105 L 15 220 M 14 250 L 14 350 M 15 375 L 15 432" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 26 22 L 26 70 M 25 90 L 25 200 M 26 230 L 26 335 M 25 360 L 25 434" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />

      {/* Nœuds du bois */}
      <ellipse cx="20" cy="55" rx="3.5" ry="6" fill="none" stroke="#1a1a1a" strokeWidth="1.3" />
      <ellipse cx="20" cy="55" rx="1.5" ry="3" fill="#1a1a1a" />

      <ellipse cx="21" cy="185" rx="3" ry="5.5" fill="none" stroke="#1a1a1a" strokeWidth="1.3" />
      <ellipse cx="21" cy="185" rx="1.2" ry="2.5" fill="#1a1a1a" />

      <ellipse cx="19" cy="315" rx="3.5" ry="6" fill="none" stroke="#1a1a1a" strokeWidth="1.3" />
      <ellipse cx="19" cy="315" rx="1.5" ry="3" fill="#1a1a1a" />

      {/* Rainures horizontales d'écorce taillée */}
      <path d="M 12 90 Q 20 94 28 90" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <path d="M 10 145 Q 20 150 30 146" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <path d="M 11 260 Q 20 265 29 261" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <path d="M 10 380 Q 20 385 30 381" stroke="#1a1a1a" strokeWidth="1" fill="none" />

      {/* Cheville / clou en bois d'amarrage */}
      <rect x="2" y="24" width="10" height="7" rx="1.5" fill="#38210c" stroke="#1a1a1a" strokeWidth="1.5" />
      <circle cx="5" cy="27.5" r="1.5" fill="#eaddcf" />

      {/* Nœud de cordelette enroulé autour du poteau */}
      <g id="rope-knot">
        <ellipse cx="20" cy="27" rx="16" ry="6.5" fill="#1a1a1a" />
        <ellipse cx="20" cy="27" rx="14" ry="4.5" fill="#2c2723" stroke="#eaddcf" strokeWidth="0.8" strokeDasharray="3 2" />
        <ellipse cx="20" cy="32" rx="15" ry="6" fill="#1a1a1a" />
        <ellipse cx="20" cy="32" rx="13" ry="4" fill="#2c2723" stroke="#eaddcf" strokeWidth="0.8" strokeDasharray="3 2" />
        {/* Extrémité de cordelette qui retombe le long du poteau */}
        <path d="M 6 33 Q 3 48 5 65" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 6 33 Q 3 48 5 65" stroke="#eaddcf" strokeWidth="0.9" fill="none" strokeDasharray="2 2" />
      </g>
    </svg>
  );
};

// -----------------------------------------------------------------------------
// CORDELETTE CATÉNAIRE INCURVÉE (ENCRE CORDEL NOIRE & TRESSÉE FINE) SVG
// -----------------------------------------------------------------------------

const CordelCatenaryRopeSvg: React.FC<{ sag?: number; className?: string }> = ({
  sag = 20,
  className = "w-full h-8 sm:h-10"
}) => {
  const pathD = `M 0 6 Q 500 ${6 + sag} 1000 6`;
  return (
    <svg
      className={`${className} select-none overflow-visible block`}
      preserveAspectRatio="none"
      viewBox={`0 0 1000 ${14 + sag}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="ropeDropShadow" x="-5%" y="-30%" width="110%" height="220%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Trait de fond noir / ombre */}
      <path
        d={pathD}
        fill="none"
        stroke="#000000"
        strokeWidth="8"
        strokeOpacity="0.25"
        strokeLinecap="round"
      />

      {/* Corps principal de la cordelette en encre noire cordel */}
      <path
        d={pathD}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="5.5"
        strokeLinecap="round"
        filter="url(#ropeDropShadow)"
      />

      {/* Torons tressés hélicoïdaux en hachures claires fines (bois/kraft cordel) */}
      <path
        d={pathD}
        fill="none"
        stroke="#eaddcf"
        strokeWidth="1.8"
        strokeOpacity="0.75"
        strokeDasharray="4 4.5"
        strokeLinecap="round"
      />

      {/* Ligne médiane subtile */}
      <path
        d={pathD}
        fill="none"
        stroke="#3c342f"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
    </svg>
  );
};

// -----------------------------------------------------------------------------
// PINCE À LINGE EN BOIS (PREGADOR) SVG
// -----------------------------------------------------------------------------

const ClothespinSvg = () => (
  <svg className="w-6 h-9 text-[#1a1a1a] drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] select-none" viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2 L9 13 L9 30 L5 30 L5 2 Z" fill="#d4a373" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M14 2 L11 13 L11 30 L15 30 L15 2 Z" fill="#c2905d" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="10" cy="13" r="2.8" fill="#71717a" stroke="#1a1a1a" strokeWidth="1.2" />
    <line x1="6" y1="13" x2="14" y2="13" stroke="#1a1a1a" strokeWidth="1.4" />
  </svg>
);

// -----------------------------------------------------------------------------
// ÉCHANTILLONS AUDIO MULTI-FRAPPES POUR LES 6 INSTRUMENTS DE LA FRISE
// -----------------------------------------------------------------------------

export interface InstrumentStrokeInfo {
  symbol: string;
  labelFr: string;
  labelPt: string;
  file: string;
}

export interface BateriaInstrumentDef {
  id: string;
  name: string;
  Icon: React.FC;
  strokes: InstrumentStrokeInfo[];
}

const BATERIA_INSTRUMENTS_DATA: BateriaInstrumentDef[] = [
  {
    id: 'marcante',
    name: 'Alfaia',
    Icon: AlfaiaCordelIcon,
    strokes: [
      { symbol: 'D', labelFr: 'Main forte', labelPt: 'Toque forte', file: '/Mixdown/Alfaia meiao F 1.ogg' },
      { symbol: 'I', labelFr: 'Baguette Igaraçu', labelPt: 'Bacalhau Igaraçu', file: '/Mixdown/Alfaia meiao I 1.ogg' },
      { symbol: 'B', labelFr: 'Barulho', labelPt: 'Barulho', file: '/Mixdown/Alfaia meiao B.ogg' },
      { symbol: 'd', labelFr: 'Coup faible', labelPt: 'Toque fraco', file: '/Mixdown/Alfaia meiao faible 1.ogg' },
    ],
  },
  {
    id: 'caixa',
    name: 'Caixa',
    Icon: CaixaCordelIcon,
    strokes: [
      { symbol: 'D', labelFr: 'Coup fort', labelPt: 'Toque forte', file: '/Mixdown/Caixa F 1.ogg' },
      { symbol: 'F', labelFr: 'Fla', labelPt: 'Fla', file: '/Mixdown/Caixa Fla 1.ogg' },
      { symbol: 'R', labelFr: 'Roulement', labelPt: 'Rufada', file: '/Mixdown/Caixa R 1.ogg' },
    ],
  },
  {
    id: 'gongue',
    name: 'Gonguê',
    Icon: GongueCordelIcon,
    strokes: [
      { symbol: 'G', labelFr: 'Grave (corps)', labelPt: 'Grave (corpo)', file: '/Mixdown/Gongue G 1.ogg' },
      { symbol: 'A', labelFr: 'Aigu (bouche)', labelPt: 'Agudo (boca)', file: '/Mixdown/Gongue A 1.ogg' },
      { symbol: 'X', labelFr: 'Cerclage', labelPt: 'Cerclagem', file: '/Mixdown/Gongue C 1.ogg' },
    ],
  },
  {
    id: 'agbe',
    name: 'Agbê',
    Icon: AgbeCordelIcon,
    strokes: [
      { symbol: 'E', labelFr: 'Frappe gauche', labelPt: 'Batida esquerda', file: '/Mixdown/Agbe F E 1.ogg' },
      { symbol: 'D', labelFr: 'Frappe droite', labelPt: 'Batida direita', file: '/Mixdown/Agbe F D 1.ogg' },
      { symbol: 'd', labelFr: 'Toucher faible', labelPt: 'Toque fraco', file: '/Mixdown/Agbe f 1.ogg' },
      { symbol: 'S', labelFr: 'Saut (salto)', labelPt: 'Salto', file: '/Mixdown/Agbe S 1.ogg' },
    ],
  },
  {
    id: 'mineiro',
    name: 'Mineiro',
    Icon: MineiroCordelIcon,
    strokes: [
      { symbol: 'P', labelFr: 'Pousser fort', labelPt: 'Ida forte', file: '/Mixdown/Mineiro F P 1.ogg' },
      { symbol: 'T', labelFr: 'Tirer fort', labelPt: 'Volta forte', file: '/Mixdown/Mineiro F T 1.ogg' },
      { symbol: 'p', labelFr: 'Secousse faible', labelPt: 'Toque fraco', file: '/Mixdown/Mineiro f 1.ogg' },
    ],
  },
  {
    id: 'timbal',
    name: 'Timbal',
    Icon: TimbalCordelIcon,
    strokes: [
      { symbol: 'A', labelFr: 'Ouvert (aberto)', labelPt: 'Aberto', file: '/Mixdown/Timbal A 1.ogg' },
      { symbol: 'G', labelFr: 'Basse (baixo)', labelPt: 'Baixo', file: '/Mixdown/Timbal G 1.ogg' },
      { symbol: 'P', labelFr: 'Tonique (preso)', labelPt: 'Preso', file: '/Mixdown/Timbal P 1.ogg' },
      { symbol: 'S', labelFr: 'Claqué (slap)', labelPt: 'Slap', file: '/Mixdown/Timbal S 1.ogg' },
    ],
  },
];

const ALL_LANDING_SAMPLES = BATERIA_INSTRUMENTS_DATA.flatMap(inst =>
  inst.strokes.map(s => ({
    id: inst.id,
    symbol: s.symbol,
    file: s.file,
  }))
);

const decodedAudioBuffers = new Map<string, AudioBuffer>();
let landingAudioCtx: AudioContext | null = null;

function getLandingAudioContext(): AudioContext {
  if (!landingAudioCtx || landingAudioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    landingAudioCtx = new AudioContextClass();
  }
  return landingAudioCtx;
}

function preloadLandingSamples() {
  try {
    const ctx = getLandingAudioContext();
    ALL_LANDING_SAMPLES.forEach(async ({ id, symbol, file }) => {
      const bufferKey = `${id}_${symbol}`;
      if (decodedAudioBuffers.has(bufferKey)) return;
      try {
        const resp = await fetch(file);
        if (!resp.ok) return;
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        decodedAudioBuffers.set(bufferKey, audioBuffer);
        if (!decodedAudioBuffers.has(id)) {
          decodedAudioBuffers.set(id, audioBuffer);
        }
      } catch (_) {
        // Fallback silencieux, se chargera au clic
      }
    });
  } catch (_) {}
}

// -----------------------------------------------------------------------------
// DRAPEAU / ESTANDARTE DU PERNAMBUCO AVEC MÂT VERTICAL ANCRÉ DANS LE 'I'
// -----------------------------------------------------------------------------

const PernambucoEstandarteWithMast = () => (
  <svg
    className="w-18 sm:w-22 md:w-28 lg:w-32 h-auto overflow-visible select-none"
    viewBox="0 0 200 185"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Sommet du mât : Pointeira / flèche dorée */}
    <polygon points="100,2 104,14 96,14" fill="#d4af37" stroke="#1a1a1a" strokeWidth="1.2" />
    <circle cx="100" cy="14" r="3" fill="#d4af37" stroke="#1a1a1a" strokeWidth="1" />

    {/* Le mât vertical raccourci ancré et enfoncé dans le sommet du 'I' */}
    <line x1="100" y1="14" x2="100" y2="185" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />

    {/* Cordelette de suspension en V */}
    <path d="M 40 28 L 100 14 L 160 28" fill="none" stroke="#1a1a1a" strokeWidth="1.8" />
    {/* Traverse horizontale de l'étendard */}
    <line x1="24" y1="28" x2="176" y2="28" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" />
    {/* Pommeaux de traverse */}
    <circle cx="24" cy="28" r="2.5" fill="#d4af37" stroke="#1a1a1a" strokeWidth="1" />
    <circle cx="176" cy="28" r="2.5" fill="#d4af37" stroke="#1a1a1a" strokeWidth="1" />

    {/* Attaches de la toile */}
    <line x1="38" y1="28" x2="38" y2="36" stroke="#1a1a1a" strokeWidth="1.5" />
    <line x1="100" y1="28" x2="100" y2="36" stroke="#1a1a1a" strokeWidth="1.5" />
    <line x1="162" y1="28" x2="162" y2="36" stroke="#1a1a1a" strokeWidth="1.5" />

    {/* Corps du drapeau de Pernambuco */}
    <g id="flag-body">
      {/* Moitié supérieure bleue */}
      <path d="M 32 36 L 168 36 L 168 86 L 32 86 Z" fill="#1b4965" stroke="#1a1a1a" strokeWidth="2" />
      {/* Moitié inférieure crème / blanche */}
      <path d="M 32 86 L 168 86 L 168 136 L 32 136 Z" fill="#f4ecd8" stroke="#1a1a1a" strokeWidth="2" />

      {/* Étoile jaune en haut */}
      <polygon points="100,41 102,46 107,46 103,49 105,54 100,51 95,54 97,49 93,46 98,46" fill="#f4a261" stroke="#1a1a1a" strokeWidth="0.6" />

      {/* Arc-en-ciel à 3 arcs */}
      <path d="M 60 86 A 40 40 0 0 1 140 86" fill="none" stroke="#8b2a1a" strokeWidth="5.5" />
      <path d="M 64 86 A 36 36 0 0 1 136 86" fill="none" stroke="#e9c46a" strokeWidth="4" />
      <path d="M 67 86 A 33 33 0 0 1 133 86" fill="none" stroke="#2a9d8f" strokeWidth="3" />

      {/* Soleil */}
      <circle cx="100" cy="86" r="14" fill="#e9c46a" stroke="#1a1a1a" strokeWidth="1.2" />
      <line x1="100" y1="69" x2="100" y2="66" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="88" y1="74" x2="85" y2="71" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="112" y1="74" x2="115" y2="71" stroke="#1a1a1a" strokeWidth="1.5" />

      {/* Croix rouge au centre de la moitié inférieure */}
      <rect x="96" y="95" width="8" height="32" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
      <rect x="88" y="103" width="24" height="8" fill="#8b2a1a" stroke="#1a1a1a" strokeWidth="1" />
    </g>

    {/* Franges traditionnelles au bas du tissu */}
    <g className="lp-fringes">
      <path
        d="M 32 136 l 2.5 16 l 2.5 -12 l 2.5 15 l 2.5 -12 l 2.5 11 l 2.5 -13 l 2.5 16 l 2.5 -13 l 2.5 15 l 2.5 -15 l 2.5 14 l 2.5 -13 l 2.5 15 l 2.5 -11 l 2.5 13 l 2.5 -14 l 2.5 15 l 2.5 -11 l 2.5 11 l 2.5 -15 l 2.5 15 l 2.5 -12 l 2.5 14 l 2.5 -10 l 2.5 16 l 2.5 -13 l 2.5 12 l 2.5 -11 l 2.5 14 l 2.5 -12 l 2.5 13 l 2.5 -13 l 2.5 11 l 2.5 -12 l 2.5 15 l 2.5 -15 l 2.5 13 l 2.5 -15 l 2.5 14 l 2.5 -15 l 2.5 12 l 2.5 -11 l 2.5 10 l 2.5 -16 l 2.5 12 l 2.5 -13 l 2.5 11 l 2.5 -12 l 2.5 10 l 2.5 -11 l 2.5 16 l 2.5 -10 l 2.5 15 l 2.5 -15 l 2.5 12 l 2.5 -12 l 2.5 11 l 2.5 -15"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="1.2"
      />
    </g>
  </svg>
);

// -----------------------------------------------------------------------------
// CARTE D'INSTRUMENT PERCUSSIVE AVEC PRÉ-ÉCOUTE MULTI-FRAPPES
// -----------------------------------------------------------------------------

const CordelInstrumentCard: React.FC<{
  instrument: BateriaInstrumentDef;
  isFr: boolean;
  onPlayStroke: (instId: string, strokeSymbol: string, strokeFile: string) => void;
}> = React.memo(({ instrument, isFr, onPlayStroke }) => {
  const [strokeIdx, setStrokeIdx] = useState(0);
  const [isHit, setIsHit] = useState(false);
  const hitTimeoutRef = useRef<number | null>(null);

  const totalStrokes = instrument.strokes.length;
  const currentStroke = instrument.strokes[strokeIdx];

  const handleClick = useCallback(() => {
    onPlayStroke(instrument.id, currentStroke.symbol, currentStroke.file);

    setIsHit(true);
    if (hitTimeoutRef.current) window.clearTimeout(hitTimeoutRef.current);
    hitTimeoutRef.current = window.setTimeout(() => setIsHit(false), 180);

    setStrokeIdx((prev) => (prev + 1) % totalStrokes);
  }, [instrument.id, currentStroke, totalStrokes, onPlayStroke]);

  const activeLabel = isFr ? currentStroke.labelFr : currentStroke.labelPt;
  const Icon = instrument.Icon;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cordel-instrument-card w-full max-w-[124px] flex flex-col items-center p-2 sm:p-2.5 bg-[#eaddcf]/50 hover:bg-[#eaddcf] border-2 border-[#1a1a1a] rounded-sm cordel-wood-shadow-sm cursor-pointer group select-none transition-all duration-100 active:scale-95 ${
        isHit ? 'ring-2 ring-[#8b2a1a] bg-[#eaddcf]' : ''
      }`}
      title={isFr ? `${instrument.name} : ${activeLabel} (cliquez pour écouter et changer de coup)` : `${instrument.name} : ${activeLabel} (toque para ouvir e mudar o toque)`}
    >
      <div className={`w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center text-[#1a1a1a] group-hover:text-[#8b2a1a] transition-all ${
        isHit ? 'scale-110 text-[#8b2a1a]' : ''
      }`}>
        <Icon />
      </div>

      <span className="font-cactus font-bold text-xs sm:text-sm mt-1 uppercase text-[#1a1a1a] tracking-tight">
        {instrument.name}
      </span>

      {/* Nuance courante et indicateurs de frappes (points •) */}
      <div className="flex flex-col items-center mt-1 w-full">
        <span className="text-[10px] sm:text-[11px] text-[#8b2a1a] font-serif italic font-semibold leading-tight text-center truncate max-w-full px-1">
          {activeLabel}
        </span>
        <div className="flex items-center justify-center gap-1 mt-1 opacity-70 group-hover:opacity-100">
          {instrument.strokes.map((_, idx) => (
            <span
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === strokeIdx ? 'bg-[#8b2a1a] scale-125' : 'bg-[#1a1a1a]/30'
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
});

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
    // Préchargement immédiat et silencieux des 6 instruments de la bateria
    preloadLandingSamples();

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

  const handleInstrumentTap = useCallback(async (instId: string, strokeSymbol: string, strokeFile: string) => {
    try {
      const ctx = getLandingAudioContext();
      if (ctx.state !== 'running') {
        await ctx.resume();
      }

      // Synchronisation synchrone du moteur audio et de Tone.js
      const Tone = safeGetTone();
      if (Tone && Tone.context.state !== 'running') {
        Tone.start().catch(() => {});
      }
      useAudioStore.getState().unlockAudio();

      // Récupération ou décodage synchrone du sample natif multi-frappes
      const bufferKey = `${instId}_${strokeSymbol}`;
      let buffer = decodedAudioBuffers.get(bufferKey) || decodedAudioBuffers.get(instId);
      if (!buffer) {
        try {
          const resp = await fetch(strokeFile);
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            buffer = await ctx.decodeAudioData(arrayBuffer);
            decodedAudioBuffers.set(bufferKey, buffer);
          }
        } catch (_) {}
      }

      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
      }
    } catch (e) {
      console.warn("Direct sample playback fallback to audioEngine:", e);
      if (audioEngine) {
        try {
          audioEngine.playPreview(instId, strokeSymbol, 0, 1.0);
        } catch (_) {}
      }
    }
  }, []);

  const isFr = currentLang === 'fr';

  const renderBooklet = (id: 1 | 2 | 3 | 4, customClass: string = '') => {
    return (
      <article key={id} className={`flex flex-col relative group ${customClass}`}>
        <div className={`cordel-booklet cordel-booklet-${id} flex-1 flex flex-col relative`}>
          {/* Pince à linge en bois calée pile sur le bord supérieur du livret et la cordelette */}
          <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <ClothespinSvg />
          </div>
          <div className="flex-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] p-5 sm:p-6 cordel-wood-shadow flex flex-col justify-between">
            {id === 1 && (
              <>
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
                      : "O Maracatu de Baque Virado vive na rua, pelo canto, pela escuta e pela transmissão direta dos mestres. Esta ferramenta não substitui os ensaios nem o ensino oral. Foi pensada como um caderno de notas: um suporte pour fixar referências, documentar as toadas e memorizar os arranjos de cada batuque e Nações."}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
                  <span>✦ Maracatu Vivo</span>
                  <span>Nações & Baque ✦</span>
                </div>
              </>
            )}

            {id === 2 && (
              <>
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
              </>
            )}

            {id === 3 && (
              <>
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
              </>
            )}

            {id === 4 && (
              <>
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
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div id="landing-page" className="min-h-screen bg-[#f4ecd8] text-[#1a1a1a] flex flex-col justify-between relative selection:bg-[#8b2a1a] selection:text-[#f4ecd8]">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. EN-TÊTE : PROFIL EN HAUT À DROITE                                */}
      {/* ------------------------------------------------------------------ */}
      <header className="w-full relative pt-2 sm:pt-3 px-4 sm:px-6 max-w-7xl mx-auto z-30 flex items-center justify-end">
        {/* Profil Google / Utilisateur bien calé et visible en haut à droite */}
        <div className="z-40">
          <GoogleLoginButton lang={currentLang} align="right" size="large" />
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 2. LE GRAND "O GIRADOR" AVEC BOUTON ENTRA NA RODA AU COEUR DU "O"  */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full flex flex-col items-center text-center px-4 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-4 max-w-5xl mx-auto z-20">
        
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

            {/* Lettrage GIRADOR en police Cactus, avec le mât de Pernambuco ancré au-dessus du 'I' */}
            <div className="flex flex-col items-end">
              <div
                style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
                className="font-cactus-display text-5xl sm:text-7xl md:text-8xl lg:text-[10.5rem] font-bold tracking-tight text-[#1a1a1a] leading-none select-none flex items-baseline"
              >
                <span>G</span>
                <span className="relative inline-flex flex-col items-center">
                  <span className="absolute bottom-[86%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
                    <PernambucoEstandarteWithMast />
                  </span>
                  <span>I</span>
                </span>
                <span>RADOR</span>
              </div>

              {/* Tampon SEQUENCIADOR décalé bien à droite sous le 'R' de GIRADOR */}
              <div className="self-end mt-1 sm:mt-2 translate-x-1 sm:translate-x-2">
                <span
                  style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
                  className="inline-block px-3 sm:px-4 py-1 font-cactus-display font-bold text-sm sm:text-base md:text-xl uppercase cordel-stamp-red shadow-[2px_2px_0px_#8b2a1a] rotate-[-1deg]"
                >
                  SEQUENCIADOR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Accroche bilingue sous le titre */}
        <p className="font-serif italic text-sm sm:text-base md:text-lg text-[#1a1a1a]/80 text-center max-w-xl mx-auto mt-4 px-4 leading-relaxed">
          {isFr
            ? 'Le séquenceur circulaire du Maracatu de Baque Virado'
            : 'O sequenciador circular do Maracatu de Baque Virado'}
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. FRISE DES 6 INSTRUMENTS (BANC DE BATERIA MULTI-FRAPPES)         */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full max-w-4xl mx-auto px-4 py-3 z-20">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 justify-items-center">
          {BATERIA_INSTRUMENTS_DATA.map((instrument) => (
            <CordelInstrumentCard
              key={instrument.id}
              instrument={instrument}
              isFr={isFr}
              onPlayStroke={handleInstrumentTap}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. LE VARAL DE CORDEL & LES 4 LIVRETS ANIMÉS (ORGANIZAD'OR)        */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 z-20">
        
        {/* Version Bureau (Largeur >= 1024px) : 1 grand varal continu avec 2 grands poteaux aux extrémités et les 4 livrets */}
        <div className="hidden lg:block relative w-full pt-1">
          {/* Poteau gauche descendant tout le long des livrets */}
          <div className="absolute left-[-26px] top-[-10px] z-30 pointer-events-none">
            <CordelWoodenPostSvg className="w-8 sm:w-9 md:w-10 h-[450px] lg:h-[490px]" />
          </div>

          {/* Cordelette caténaire suspendue reliant les deux poteaux */}
          <div className="absolute top-[12px] left-[2px] right-[2px] z-10 pointer-events-none">
            <CordelCatenaryRopeSvg sag={14} className="w-full h-8" />
          </div>

          {/* Poteau droit descendant tout le long des livrets */}
          <div className="absolute right-[-26px] top-[-10px] z-30 pointer-events-none">
            <CordelWoodenPostSvg isRight className="w-8 sm:w-9 md:w-10 h-[450px] lg:h-[490px]" />
          </div>

          {/* Grille des 4 livrets : pinces calées exactement sur le fil de la corde */}
          <div className="grid grid-cols-4 gap-5 w-full px-5 pt-4">
            {renderBooklet(1, 'translate-y-[2px]')}
            {renderBooklet(2, 'translate-y-[12px]')}
            {renderBooklet(3, 'translate-y-[12px]')}
            {renderBooklet(4, 'translate-y-[2px]')}
          </div>
        </div>

        {/* Version Tablette (768px <= Largeur < 1024px) : 2 rangées de 2 livrets avec poteaux longs et corde caténaire */}
        <div className="hidden md:flex lg:hidden flex-col gap-12 w-full pt-1">
          {/* Rangée 1 : Livrets 1 & 2 */}
          <div className="relative w-full">
            <div className="absolute left-[-20px] top-[-10px] z-30 pointer-events-none">
              <CordelWoodenPostSvg className="w-8 h-[440px]" />
            </div>
            <div className="absolute top-[12px] left-[2px] right-[2px] z-10 pointer-events-none">
              <CordelCatenaryRopeSvg sag={10} className="w-full h-7" />
            </div>
            <div className="absolute right-[-20px] top-[-10px] z-30 pointer-events-none">
              <CordelWoodenPostSvg isRight className="w-8 h-[440px]" />
            </div>
            <div className="grid grid-cols-2 gap-6 w-full px-5 pt-4">
              {renderBooklet(1, 'translate-y-[6px]')}
              {renderBooklet(2, 'translate-y-[6px]')}
            </div>
          </div>

          {/* Rangée 2 : Livrets 3 & 4 */}
          <div className="relative w-full">
            <div className="absolute left-[-20px] top-[-10px] z-30 pointer-events-none">
              <CordelWoodenPostSvg className="w-8 h-[440px]" />
            </div>
            <div className="absolute top-[12px] left-[2px] right-[2px] z-10 pointer-events-none">
              <CordelCatenaryRopeSvg sag={10} className="w-full h-7" />
            </div>
            <div className="absolute right-[-20px] top-[-10px] z-30 pointer-events-none">
              <CordelWoodenPostSvg isRight className="w-8 h-[440px]" />
            </div>
            <div className="grid grid-cols-2 gap-6 w-full px-5 pt-4">
              {renderBooklet(3, 'translate-y-[6px]')}
              {renderBooklet(4, 'translate-y-[6px]')}
            </div>
          </div>
        </div>

        {/* Version Mobile (< 768px) : Livrets empilés avec grands poteaux et cordelette incurvée dédiée */}
        <div className="flex md:hidden flex-col gap-10 w-full pt-1">
          {([1, 2, 3, 4] as const).map((id) => (
            <div key={id} className="relative w-full">
              <div className="absolute left-[-14px] top-[-10px] z-30 pointer-events-none">
                <CordelWoodenPostSvg className="w-7 h-[420px]" />
              </div>
              <div className="absolute top-[12px] left-[2px] right-[2px] z-10 pointer-events-none">
                <CordelCatenaryRopeSvg sag={6} className="w-full h-6" />
              </div>
              <div className="absolute right-[-14px] top-[-10px] z-30 pointer-events-none">
                <CordelWoodenPostSvg isRight className="w-7 h-[420px]" />
              </div>
              <div className="w-full px-4 pt-4">
                {renderBooklet(id, 'translate-y-[4px]')}
              </div>
            </div>
          ))}
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

          {/* Liens visuels avec icônes vers les autres applications de l'écosystème */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <a
              href={getEcosystemUrl('organizador')}
              target="_blank"
              rel="noopener noreferrer"
              title="O Organizador"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] cordel-wood-shadow-sm hover:scale-110 hover:border-[#8b2a1a] transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <img src="/ecosystem/organizador.png" alt="O Organizador" className="w-full h-full object-contain rounded-full" />
            </a>
            <a
              href={getEcosystemUrl('dancador')}
              target="_blank"
              rel="noopener noreferrer"
              title="O Dançador"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] cordel-wood-shadow-sm hover:scale-110 hover:border-[#8b2a1a] transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <img src="/ecosystem/dancador.png" alt="O Dançador" className="w-full h-full object-contain rounded-full" />
            </a>
            <a
              href={getEcosystemUrl('orquestrador')}
              target="_blank"
              rel="noopener noreferrer"
              title="O Orquestrador"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-1 bg-[#fdfaf2] border-2 border-[#1a1a1a] cordel-wood-shadow-sm hover:scale-110 hover:border-[#8b2a1a] transition-all flex items-center justify-center cursor-pointer select-none"
            >
              <img src="/ecosystem/orquestrador.png" alt="O Orquestrador" className="w-full h-full object-contain rounded-full" />
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
