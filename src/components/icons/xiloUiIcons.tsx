
import React from 'react';
import { XiloIconProps } from './xiloTypes';

export const XiloClose: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`xilo-icon ${className}`} {...props}>
    <path d="M4.5,3.2 C4.1,3.4 3.5,3.9 3.2,4.5 C2.9,5.1 3.2,5.8 3.8,6.4 L9.2,12.0 L3.8,17.6 C3.2,18.2 2.9,18.9 3.2,19.5 C3.5,20.1 4.1,20.6 4.5,20.8 C4.9,21.0 5.6,20.7 6.2,20.0 L12.0,14.2 L17.8,20.0 C18.4,20.7 19.1,21.0 19.5,20.8 C19.9,20.6 20.5,20.1 20.8,19.5 C21.1,18.9 20.8,18.2 20.2,17.6 L14.8,12.0 L20.2,6.4 C20.8,5.8 21.1,5.1 20.8,4.5 C20.5,3.9 19.9,3.4 19.5,3.2 C19.1,3.0 18.4,3.3 17.8,4.0 L12.0,9.8 L6.2,4.0 C5.6,3.3 4.9,3.0 4.5,3.2 Z" />
  </svg>
);

export const XiloMestre: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`xilo-icon ${className}`} {...props}>
    <path d="M2.5,21.0 L21.5,21.0 L21.5,18.5 L2.5,18.5 Z M3.5,16.5 L20.5,16.5 L22.0,7.5 L17.5,11.5 L12.0,4.5 L6.5,11.5 L2.0,7.5 Z" />
  </svg>
);

export const XiloHand: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`xilo-icon ${className}`} {...props}>
    <path d="M11.5,1.5 C12.3,1.5 13.0,2.2 13.0,3.0 L13.0,10.0 L14.5,8.5 C15.1,7.9 16.0,7.9 16.6,8.5 C17.2,9.1 17.2,10.0 16.6,10.6 L14.5,12.7 L14.5,13.5 C14.5,13.5 15.5,12.5 16.5,12.5 C17.3,12.5 18.0,13.2 18.0,14.0 L18.0,15.5 C18.0,18.5 15.8,21.5 12.0,21.5 C8.2,21.5 5.5,19.0 5.5,15.5 L5.5,11.0 C5.5,10.2 6.2,9.5 7.0,9.5 C7.8,9.5 8.5,10.2 8.5,11.0 L8.5,12.5 L9.5,10.0 C9.8,9.2 10.5,8.5 11.5,8.5 L11.5,3.0 C11.5,2.2 12.3,1.5 11.5,1.5 Z" />
    <path d="M18.0,9.5 C19.3,9.5 20.5,10.7 20.5,12.0 C20.5,13.3 19.3,14.5 18.0,14.5 L17.0,14.5 L17.0,9.5 L18.0,9.5 Z" />
  </svg>
);

export const XiloLock: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M5,11 C5,9.5 5.5,10 5,11 L5,20 C5,21 6,22 7,22 L17,22 C18,22 19,21 19,20 L19,11 C19,10 18,9 17,9 L7,9 C6,9 5,10 5,11 Z" fill="currentColor" fillOpacity="0.1" />
    <path d="M8,9 L8,5 C8,3 9.5,2 12,2 C14.5,2 16,3 16,5 L16,9" />
    <path d="M12,13 L12,17" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
  </svg>
);

export const XiloExpand: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M14,3 C16.5,3 19,3.5 21,3 L21,10" />
    <path d="M21,3 L14,10" />
    <path d="M10,21 C7.5,21 5,20.5 3,21 L3,14" />
    <path d="M3,21 L10,14" />
  </svg>
);

export const XiloCollapse: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M21,3 L15,9" />
    <path d="M15,9 L15,4" />
    <path d="M15,9 L20,9" />
    <path d="M3,21 L9,15" />
    <path d="M9,15 L9,20" />
    <path d="M9,15 L4,15" />
  </svg>
);

export const XiloRoda: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="6" />
  </svg>
);

export const XiloConsole: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M8,2 V22" />
    <path d="M16,2 V22" />
    <rect x="5" y="8" width="6" height="4" rx="1" fill="currentColor" />
    <rect x="13" y="14" width="6" height="4" rx="1" fill="currentColor" />
  </svg>
);

export const XiloTimeline: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" className={`xilo-icon ${className}`} {...props}>
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

export const XiloGame: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M6,12 H10" strokeWidth="2.5" />
    <path d="M8,10 V14" strokeWidth="2.5" />
    <circle cx="15.5" cy="11" r="1" fill="currentColor" />
    <circle cx="17.5" cy="13" r="1" fill="currentColor" />
  </svg>
);

export const XiloSun: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`xilo-icon ${className}`} {...props}>
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

export const XiloMoon: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`xilo-icon ${className}`} {...props}>
    <path d="M12,3 C10.5,5 9.5,7.5 9.5,10.5 C9.5,15.5 13.5,19.5 18.5,19.5 C19.5,19.5 20.5,19 21,18.5 C19.5,21 16.5,22.5 13,22.5 C6.5,22.5 1.5,17.5 1.5,11 C1.5,6.5 4.5,2.5 8.5,1.5 C8,2 12,3 12,3 Z" />
  </svg>
);

export const XiloMagnet: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M5,10 V5 C5,3 7,2 12,2 C17,2 19,3 19,5 V10" />
    <path d="M5,10 C5,12 6,14 8,16 C10,18 14,18 16,16 C18,14 19,12 19,10" />
    <path d="M5,10 H9 V5 H5 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M15,10 H19 V5 H15 Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);
