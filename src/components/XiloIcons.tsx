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

// ✏️ Crayon / Éditer
export const XiloPencil: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={`xilo-icon ${className}`} 
    {...props}
  >
    {/* Block print pencil */}
    <path d="M17.5,2.1 C16.5,2.1 15.5,2.5 14.7,3.3 L2.5,15.5 C2.2,15.8 2.0,16.2 2.0,16.6 L1.0,22.0 C0.9,22.5 1.4,23.0 1.9,22.9 L7.3,21.9 C7.7,21.8 8.1,21.6 8.4,21.3 L20.6,9.1 C22.2,7.5 22.2,4.9 20.6,3.3 C19.8,2.5 18.7,2.1 17.5,2.1 Z M17.5,4.1 C18.1,4.1 18.7,4.3 19.2,4.7 C20.1,5.6 20.1,7.0 19.2,7.9 L18.0,9.1 L14.8,5.9 L16.0,4.7 C16.4,4.3 17.0,4.1 17.5,4.1 Z M13.4,7.3 L16.6,10.5 L6.5,20.6 C6.3,20.8 6.1,20.9 5.8,21.0 L3.0,21.5 L3.5,18.7 C3.6,18.4 3.7,18.2 3.9,18.0 L13.4,7.3 Z" />
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
