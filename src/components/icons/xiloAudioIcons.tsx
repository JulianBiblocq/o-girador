/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { XiloIconProps } from './xiloTypes';

export const XiloEQ: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M6,2 C6.3,7 5.8,13 6.1,22" />
    <path d="M12,2 C11.8,8 12.3,14 12,22" />
    <path d="M18,2 C18.2,6 17.7,12 18,22" />
    <path d="M3.5,14 C3.5,14 4.5,12 6,12 C7.5,12 8.5,14 8.5,14 C8.5,14 7.5,16 6,16 C4.5,16 3.5,14 3.5,14 Z" fill="currentColor" />
    <path d="M9.5,6 C9.5,6 10.5,4 12,4 C13.5,4 14.5,6 14.5,6 C14.5,6 13.5,8 12,8 C10.5,8 9.5,6 9.5,6 Z" fill="currentColor" />
    <path d="M15.5,10 C15.5,10 16.5,8 18,8 C19.5,8 20.5,10 20.5,10 C20.5,10 19.5,12 18,12 C16.5,12 15.5,10 15.5,10 Z" fill="currentColor" />
  </svg>
);

export const XiloCompressor: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M19.5,4.5 C22.5,9.0 21.0,16.5 16.5,19.5 C12.0,22.5 5.5,21.0 3.0,16.5 C0.5,12.0 2.0,5.5 6.5,3.0 C11.0,0.5 16.5,2.0 18.0,6.5 C19.5,11.0 16.5,15.0 13.0,16.5 C9.5,18.0 6.5,15.0 6.0,11.5 C5.5,8.0 8.0,6.0 10.5,6.5 C13.0,7.0 13.5,9.5 12.0,11.0" />
  </svg>
);

export const XiloReverb: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <path d="M2.0,13.0 C5.0,9.0 8.0,16.0 12.0,11.0 C16.0,6.0 18.0,10.0 22.0,6.0" />
    <path d="M2.0,18.0 C4.5,15.0 7.5,19.5 11.5,15.0 C15.5,10.5 18.5,15.0 22.0,11.0" />
    <path d="M3.0,21.5 L7.0,21.5" strokeWidth="1.5" />
    <path d="M10.0,21.5 L14.0,21.5" strokeWidth="1.5" />
    <path d="M17.0,21.5 L21.0,21.5" strokeWidth="1.5" />
  </svg>
);

export const XiloDistortion: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`xilo-icon ${className}`} {...props}>
    <path d="M12.0,2.0 C11.5,4.5 10.0,6.5 9.0,8.0 C8.0,6.5 7.5,4.5 7.0,3.5 C5.5,5.5 3.0,9.0 3.0,13.0 C3.0,18.0 7.0,22.0 12.0,22.0 C17.0,22.0 21.0,18.0 21.0,13.0 C21.0,8.0 16.0,4.0 12.0,2.0 Z M12.0,18.0 C10.0,18.0 8.0,16.0 8.0,13.5 C8.0,11.5 9.5,10.0 10.5,9.0 C11.0,10.5 12.0,11.5 13.0,12.5 C14.0,13.5 14.5,14.5 14.5,15.5 C14.5,17.0 13.5,18.0 12.0,18.0 Z" />
  </svg>
);

export const XiloLightning: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`xilo-icon ${className}`} {...props}>
    <path d="M13.8,1.2 L4.2,12.8 L10.8,12.8 L8.2,22.8 L19.8,9.8 L13.2,9.8 L15.2,1.2 Z" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="miter" />
  </svg>
);

export const XiloChisel: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`xilo-icon ${className}`} {...props}>
    <path d="M11.5,13.0 C10.0,11.0 12.5,5.5 16.5,2.5 C19.0,0.5 22.0,1.0 23.0,2.5 C24.0,4.0 23.0,7.5 20.5,10.5 C18.0,13.5 13.5,15.0 12.0,13.5 Z" fill="#b17046" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M16.5,4.5 C18.5,3.0 20.5,2.5 22.0,2.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    <path d="M15.5,7.0 C17.5,5.5 19.5,5.0 20.5,5.0" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    <path d="M8.5,15.5 L12.0,12.0 L11.0,11.0 L7.5,14.5 Z" fill="#d4af37" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M1.5,22.5 L7.5,14.5 L8.5,15.5 Z" fill="#e0e0e0" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M1.5,22.5 L4.0,20.0 L5.0,21.0 Z" fill="#ffffff" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
);

export const XiloDrum: React.FC<XiloIconProps> = ({ size = 16, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className={`xilo-icon ${className}`} {...props}>
    <ellipse cx="12" cy="6" rx="9" ry="3" />
    <path d="M3,6 V18 C3,19.5 7,21 12,21 C17,21 21,19.5 21,18 V6" />
    <path d="M3,6 L12,12 L21,6" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
    <path d="M8,9 V17" />
    <path d="M16,9 V17" />
  </svg>
);
