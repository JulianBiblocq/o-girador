import React from 'react';

interface XiloIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// 🎛️ Égaliseur (EQ)
export const XiloEQ: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Wobbly vertical slider lines */}
    <path d="M6,2 C6.3,7 5.8,13 6.1,22" />
    <path d="M12,2 C11.8,8 12.3,14 12,22" />
    <path d="M18,2 C18.2,6 17.7,12 18,22" />
    {/* Stylized woodcut fader handles */}
    <path d="M3.5,14 C3.5,14 4.5,12 6,12 C7.5,12 8.5,14 8.5,14 C8.5,14 7.5,16 6,16 C4.5,16 3.5,14 3.5,14 Z" fill="currentColor" />
    <path d="M9.5,6 C9.5,6 10.5,4 12,4 C13.5,4 14.5,6 14.5,6 C14.5,6 13.5,8 12,8 C10.5,8 9.5,6 9.5,6 Z" fill="currentColor" />
    <path d="M15.5,10 C15.5,10 16.5,8 18,8 C19.5,8 20.5,10 20.5,10 C20.5,10 19.5,12 18,12 C16.5,12 15.5,10 15.5,10 Z" fill="currentColor" />
  </svg>
);

// 🌀 Compresseur (Compressor spiral)
export const XiloCompressor: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Wobbly carved spiral */}
    <path d="M19.5,4.5 C22.5,9.0 21.0,16.5 16.5,19.5 C12.0,22.5 5.5,21.0 3.0,16.5 C0.5,12.0 2.0,5.5 6.5,3.0 C11.0,0.5 16.5,2.0 18.0,6.5 C19.5,11.0 16.5,15.0 13.0,16.5 C9.5,18.0 6.5,15.0 6.0,11.5 C5.5,8.0 8.0,6.0 10.5,6.5 C13.0,7.0 13.5,9.5 12.0,11.0" />
  </svg>
);

// 🌊 Réverbération (Wave)
export const XiloReverb: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Wave crests with xilo print style */}
    <path d="M2.0,13.0 C5.0,9.0 8.0,16.0 12.0,11.0 C16.0,6.0 18.0,10.0 22.0,6.0" />
    <path d="M2.0,18.0 C4.5,15.0 7.5,19.5 11.5,15.0 C15.5,10.5 18.5,15.0 22.0,11.0" />
    <path d="M3.0,21.5 L7.0,21.5" strokeWidth="1.5" />
    <path d="M10.0,21.5 L14.0,21.5" strokeWidth="1.5" />
    <path d="M17.0,21.5 L21.0,21.5" strokeWidth="1.5" />
  </svg>
);

// 🔥 Distorsion (Flame)
export const XiloDistortion: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Angular flame block print shape */}
    <path d="M12.0,2.0 C11.5,4.5 10.0,6.5 9.0,8.0 C8.0,6.5 7.5,4.5 7.0,3.5 C5.5,5.5 3.0,9.0 3.0,13.0 C3.0,18.0 7.0,22.0 12.0,22.0 C17.0,22.0 21.0,18.0 21.0,13.0 C21.0,8.0 16.0,4.0 12.0,2.0 Z M12.0,18.0 C10.0,18.0 8.0,16.0 8.0,13.5 C8.0,11.5 9.5,10.0 10.5,9.0 C11.0,10.5 12.0,11.5 13.0,12.5 C14.0,13.5 14.5,14.5 14.5,15.5 C14.5,17.0 13.5,18.0 12.0,18.0 Z" />
  </svg>
);

// ✏️ Ciseau à bois / Éditer (Chisel)
export const XiloChisel: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Handle part: thicker, textured */}
    <path d="M19.8,4.2 C20.7,5.1 20.7,6.5 19.8,7.4 L14.0,13.2 L10.8,10.0 L16.6,4.2 C17.5,3.3 18.9,3.3 19.8,4.2 Z" />
    {/* Ferrule (metal band) */}
    <path d="M13.2,14.0 L10.0,10.8 L11.2,9.6 L14.4,12.8 Z" opacity="0.8" />
    {/* Chisel blade: flat rectangular body ending in a sharp angled bevel */}
    <path d="M10.8,10.0 L9.6,11.2 L3.6,17.2 C3.1,17.7 2.0,19.8 2.0,21.0 C2.0,21.5 2.5,22.0 3.0,22.0 C4.2,22.0 6.3,20.9 6.8,20.4 L12.8,14.4 L11.6,13.2 Z" />
  </svg>
);

// ✕ Supprimer
export const XiloClose: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Textured carved "X" */}
    <path d="M4.5,3.2 C4.1,3.4 3.5,3.9 3.2,4.5 C2.9,5.1 3.2,5.8 3.8,6.4 L9.2,12.0 L3.8,17.6 C3.2,18.2 2.9,18.9 3.2,19.5 C3.5,20.1 4.1,20.6 4.5,20.8 C4.9,21.0 5.6,20.7 6.2,20.0 L12.0,14.2 L17.8,20.0 C18.4,20.7 19.1,21.0 19.5,20.8 C19.9,20.6 20.5,20.1 20.8,19.5 C21.1,18.9 20.8,18.2 20.2,17.6 L14.8,12.0 L20.2,6.4 C20.8,5.8 21.1,5.1 20.8,4.5 C20.5,3.9 19.9,3.4 19.5,3.2 C19.1,3.0 18.4,3.3 17.8,4.0 L12.0,9.8 L6.2,4.0 C5.6,3.3 4.9,3.0 4.5,3.2 Z" />
  </svg>
);

// Crown/Master
export const XiloMestre: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Hand-carved master crown */}
    <path d="M2.5,21.0 L21.5,21.0 L21.5,18.5 L2.5,18.5 Z M3.5,16.5 L20.5,16.5 L22.0,7.5 L17.5,11.5 L12.0,4.5 L6.5,11.5 L2.0,7.5 Z" />
  </svg>
);

// 🙌 Main / Signaux (Hand)
export const XiloHand: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* A solid, block-print stylized hand */}
    <path d="M11.5,1.5 C12.3,1.5 13.0,2.2 13.0,3.0 L13.0,10.0 L14.5,8.5 C15.1,7.9 16.0,7.9 16.6,8.5 C17.2,9.1 17.2,10.0 16.6,10.6 L14.5,12.7 L14.5,13.5 C14.5,13.5 15.5,12.5 16.5,12.5 C17.3,12.5 18.0,13.2 18.0,14.0 L18.0,15.5 C18.0,18.5 15.8,21.5 12.0,21.5 C8.2,21.5 5.5,19.0 5.5,15.5 L5.5,11.0 C5.5,10.2 6.2,9.5 7.0,9.5 C7.8,9.5 8.5,10.2 8.5,11.0 L8.5,12.5 L9.5,10.0 C9.8,9.2 10.5,8.5 11.5,8.5 L11.5,3.0 C11.5,2.2 12.3,1.5 11.5,1.5 Z" />
    <path d="M18.0,9.5 C19.3,9.5 20.5,10.7 20.5,12.0 C20.5,13.3 19.3,14.5 18.0,14.5 L17.0,14.5 L17.0,9.5 L18.0,9.5 Z" />
  </svg>
);

// 🔒 Verrou (Lock / Slave)
export const XiloLock: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Padlock sketch */}
    <path d="M5,11 C5,9.5 5.5,10 5,11 L5,20 C5,21 6,22 7,22 L17,22 C18,22 19,21 19,20 L19,11 C19,10 18,9 17,9 L7,9 C6,9 5,10 5,11 Z" fill="currentColor" fillOpacity="0.1" />
    <path d="M8,9 L8,5 C8,3 9.5,2 12,2 C14.5,2 16,3 16,5 L16,9" />
    <path d="M12,13 L12,17" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
  </svg>
);

// Expand (Outward arrows)
export const XiloExpand: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M14,3 C16.5,3 19,3.5 21,3 L21,10" />
    <path d="M21,3 L14,10" />
    <path d="M10,21 C7.5,21 5,20.5 3,21 L3,14" />
    <path d="M3,21 L10,14" />
  </svg>
);

// Collapse (Inward arrows)
export const XiloCollapse: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M21,3 L15,9" />
    <path d="M15,9 L15,4" />
    <path d="M15,9 L20,9" />
    <path d="M3,21 L9,15" />
    <path d="M9,15 L9,20" />
    <path d="M9,15 L4,15" />
  </svg>
);

// ⭕ Roda
export const XiloRoda: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="6" />
  </svg>
);

// 🎚️ Console
export const XiloConsole: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M8,2 V22" />
    <path d="M16,2 V22" />
    <rect x="5" y="8" width="6" height="4" rx="1" fill="currentColor" />
    <rect x="13" y="14" width="6" height="4" rx="1" fill="currentColor" />
  </svg>
);

// 🎞️ Timeline
export const XiloTimeline: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.3" 
    strokeLinecap="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <rect x="2" y="5" width="20" height="14" rx="1.5" />
    <path d="M2,9 H22" />
    <path d="M2,15 H22" />
    <path d="M6,5 V9" />
    <path d="M12,5 V9" />
    <path d="M18,5 V9" />
    <path d="M6,15 V19" />
    <path d="M12,15 V19" />
    <path d="M18,15 V19" />
  </svg>
);

// 🎮 Game
export const XiloGame: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M6,12 H10" strokeWidth="2.5" />
    <path d="M8,10 V14" strokeWidth="2.5" />
    <circle cx="15.5" cy="11" r="1" fill="currentColor" />
    <circle cx="17.5" cy="13" r="1" fill="currentColor" />
  </svg>
);

// 🌞 Sun
export const XiloSun: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <circle cx="12" cy="12" r="5" />
    <path d="M12,2 V4" strokeWidth="2.5" />
    <path d="M12,20 V22" strokeWidth="2.5" />
    <path d="M2,12 H4" strokeWidth="2.5" />
    <path d="M20,12 H22" strokeWidth="2.5" />
    <path d="M5,5 L6.5,6.5" strokeWidth="2.5" />
    <path d="M17.5,17.5 L19,19" strokeWidth="2.5" />
    <path d="M5,19 L6.5,17.5" strokeWidth="2.5" />
    <path d="M17.5,6.5 L19,5" strokeWidth="2.5" />
  </svg>
);

// 🌙 Moon
export const XiloMoon: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M12,3 C10.5,5 9.5,7.5 9.5,10.5 C9.5,15.5 13.5,19.5 18.5,19.5 C19.5,19.5 20.5,19 21,18.5 C19.5,21 16.5,22.5 13,22.5 C6.5,22.5 1.5,17.5 1.5,11 C1.5,6.5 4.5,2.5 8.5,1.5 C8,2 12,3 12,3 Z" />
  </svg>
);

// 🧲 Aimant (Magnet)
export const XiloMagnet: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M5,10 V5 C5,3 7,2 12,2 C17,2 19,3 19,5 V10" />
    <path d="M5,10 C5,12 6,14 8,16 C10,18 14,18 16,16 C18,14 19,12 19,10" />
    <path d="M5,10 H9 V5 H5 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M15,10 H19 V5 H15 Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

// ℹ️ Info
export const XiloInfo: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12,8 L12,8.01" strokeWidth="3" />
    <path d="M12,12 L12,16" />
  </svg>
);

// 📝 Scroll/Document (Toada lyrics)
export const XiloScroll: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M14,2 L14,6 C14,7 15,8 16,8 L20,8" />
    <path d="M16,22 H6 C5,22 4,21 4,20 V4 C4,3 5,2 6,2 H14 L20,8 V20 C20,21 19,22 18,22 Z" />
    <path d="M8,13 H16" strokeWidth="1.8" />
    <path d="M8,17 H14" strokeWidth="1.8" />
  </svg>
);

// 📖 Book (Légendes / shortcuts)
export const XiloBook: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M4,19.5 C4,18 5.5,17 7,17 H20" />
    <path d="M4,4.5 C4,3 5.5,2 7,2 H20 V21 H7 C5.5,21 4,20 4,18.5 Z" />
  </svg>
);

// 💬 Chat (Feedback)
export const XiloChat: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <path d="M21,11.5 C21,15.5 17,18 13,18 C11.5,18 9,19 7,21 V18 C4,16.5 3,14 3,11.5 C3,7 7,4 12,4 C17,4 21,7 21,11.5 Z" />
  </svg>
);

// 🥁 Drum (Mixador)
export const XiloDrum: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    <ellipse cx="12" cy="6" rx="9" ry="3" />
    <path d="M3,6 V18 C3,19.5 7,21 12,21 C17,21 21,19.5 21,18 V6" />
    <path d="M3,6 L12,12 L21,6" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
    <path d="M8,9 V17" />
    <path d="M16,9 V17" />
  </svg>
);

