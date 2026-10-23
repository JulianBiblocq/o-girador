
import React from 'react';
import { XiloIconProps } from './xiloTypes';

export const XiloInfo: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12,8 L12,8.01" strokeWidth="3" />
    <path d="M12,12 L12,16" />
  </svg>
);

export const XiloDocument: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M14,2 L14,6 C14,7 15,8 16,8 L20,8" />
    <path d="M16,22 H6 C5,22 4,21 4,20 V4 C4,3 5,2 6,2 H14 L20,8 V20 C20,21 19,22 18,22 Z" />
    <path d="M8,13 H16" strokeWidth="1.8" />
    <path d="M8,17 H14" strokeWidth="1.8" />
  </svg>
);

export const XiloBook: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M4,19.5 C4,18 5.5,17 7,17 H20" />
    <path d="M4,4.5 C4,3 5.5,2 7,2 H20 V21 H7 C5.5,21 4,20 4,18.5 Z" />
  </svg>
);

export const XiloChat: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M21,11.5 C21,15.5 17,18 13,18 C11.5,18 9,19 7,21 V18 C4,16.5 3,14 3,11.5 C3,7 7,4 12,4 C17,4 21,7 21,11.5 Z" />
  </svg>
);

export const XiloMegaphone: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M6,9.5 C5.2,9.5 4.5,10 4.5,11.5 C4.5,13 5.2,13.5 6,13.5 Z" fill="currentColor" />
    <path d="M6,10.5 L14.2,7.5 C14.9,7.2 15.5,7.8 15.5,8.5 L15.5,15.5 C15.5,16.2 14.9,16.8 14.2,16.5 L6,13.5" />
    <path d="M9.5,13 L8.5,18.5 C8.3,19.2 9.3,19.5 9.5,18.8 L10.5,12.8" />
    <path d="M18.5,8.5 C19.5,9.5 19.5,14.5 18.5,15.5" strokeWidth="2.5" />
    <path d="M21.5,6.5 C23.5,8.2 23.5,15.8 21.5,17.5" strokeWidth="2" strokeDasharray="1.5 2" />
  </svg>
);

export const XiloScroll: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M5.5 6.5 C8.5 5.8 13.5 6.5 18.5 5.8 L18.5 17.5 C14.5 18.2 9.5 17.5 5.5 18.2 Z" fill="currentColor" fillOpacity="0.12" stroke="none" />
    <path d="M4.5 6.5 C3.8 5 4.8 3.5 6.8 3 C10.2 2.2 14.8 3 17.8 2.3 C19.5 2 20.5 3 20.2 4.8 C19.8 6.5 17 6.2 15 6.2 L5.5 6.2" />
    <path d="M4.5 6.5 C4.2 7.4 5.2 7.8 6.2 7.6 C7.5 7.3 7.8 6 7.2 5" strokeWidth="1.8" />
    <path d="M5.5 6.5 L5.2 18.2" />
    <path d="M19.2 5.5 L18.8 17.5" />
    <path d="M19.5 17.5 C20.2 19 19.2 20.5 17.2 21 C13.8 21.8 9.2 21 6.2 21.7 C4.5 22 3.5 21 3.8 19.2 C4.2 17.5 7 17.8 9 17.8 L18.5 17.8" />
    <path d="M19.5 17.5 C19.8 16.6 18.8 16.2 17.8 16.4 C16.5 16.7 16.2 18 16.8 19" strokeWidth="1.8" />
    <path d="M8.5 10.2 C11 9.8 13.5 10.4 16 10" strokeWidth="1.8" />
    <path d="M8 12.8 C10.5 12.5 13 13 15.5 12.6" strokeWidth="1.8" />
    <path d="M8.5 15.4 C10.2 15.1 12 15.5 14 15.2" strokeWidth="1.8" />
  </svg>
);

export const XiloParchment = XiloScroll;

export const XiloFanion: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M1.5,4.5 C7.5,7.2 16.5,7.2 22.5,4.5" strokeWidth="1.8" />
    <path d="M3.5,5.5 L11,7.2 L11,19.5 L7.25,15 L3.5,18.5 Z" fill="currentColor" fillOpacity="0.2" strokeWidth="1.8" />
    <path d="M7.25,8.2 L7.25,12.5" strokeWidth="1.5" />
    <path d="M13,7.2 L20.5,5.5 L20.5,15 L16.75,19.5 L13,15 Z" fill="currentColor" fillOpacity="0.85" strokeWidth="1.8" />
  </svg>
);

export const XiloTarget: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon shrink-0 ${className}`} {...props}>
    <circle cx="12" cy="12" r="9.5" strokeWidth="2" />
    <circle cx="12" cy="12" r="5.5" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" strokeWidth="0" />
    <path d="M12,1.2 L12,4.5" strokeWidth="2" />
    <path d="M12,19.5 L12,22.8" strokeWidth="2" />
    <path d="M1.2,12 L4.5,12" strokeWidth="2" />
    <path d="M19.5,12 L22.8,12" strokeWidth="2" />
  </svg>
);

export const CordelTarget = XiloTarget;

export const XiloHourglass: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M4,3 L20,3" strokeWidth="2.5" />
    <path d="M4,21 L20,21" strokeWidth="2.5" />
    <path d="M6,3 C6,10 11,11.5 11,12 C11,12.5 6,14 6,21" />
    <path d="M18,3 C18,10 13,11.5 13,12 C13,12.5 18,14 18,21" />
    <path d="M12,11.5 L12,14" strokeWidth="1.8" strokeDasharray="1 1" />
    <path d="M8,19 C10,17.5 14,17.5 16,19" fill="currentColor" fillOpacity="0.3" strokeWidth="1.5" />
  </svg>
);
