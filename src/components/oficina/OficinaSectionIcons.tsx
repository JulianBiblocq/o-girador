
import React from 'react';
import { XiloLightning } from '../XiloIcons';

interface OficinaIconProps {
  className?: string;
  size?: number;
}

export const IconGrooveMetronome: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2.2]`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 21L12 3L17 21H7Z" />
    <line x1="12" y1="11" x2="18" y2="7" />
    <circle cx="18" cy="7" r="1.5" fill="currentColor" />
  </svg>
);

export const IconGabaritsParchemin: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    <path d="M8 21h12a2 2 0 0 0 2-2v-2H10a2 2 0 0 0-2 2v2Z" />
    <path d="M4 3a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4v-4a2 2 0 0 1 2-2h10" />
    <line x1="7" y1="8" x2="15" y2="8" />
    <line x1="7" y1="12" x2="13" y2="12" />
  </svg>
);

export const IconWorkspacesCadres: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="5" rx="1" />
    <rect x="13" y="10" width="8" height="11" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
  </svg>
);

export const IconMidiController: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="6" y1="5" x2="6" y2="13" />
    <line x1="10" y1="5" x2="10" y2="13" />
    <line x1="14" y1="5" x2="14" y2="13" />
    <line x1="18" y1="5" x2="18" y2="13" />
    <circle cx="5" cy="16" r="1" fill="currentColor" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
    <circle cx="19" cy="16" r="1" fill="currentColor" />
  </svg>
);

export const IconMestreSignals: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8Z" />
    <path d="M12 2v3" />
    <path d="M8 3.5l2 2" />
    <path d="M16 3.5l-2 2" />
    <circle cx="12" cy="13" r="2.5" fill="currentColor" />
  </svg>
);

export const IconPrensaPartition: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
    <line x1="9" y1="18" x2="15" y2="18" />
  </svg>
);

export const IconAudioHeadphones: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

export const IconAideLivret: React.FC<OficinaIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[2]`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const OficinaSectionIcon: React.FC<{ sectionId: string; className?: string }> = ({ sectionId, className = 'w-4 h-4' }) => {
  switch (sectionId) {
    case 'groove': return <IconGrooveMetronome className={className} />;
    case 'gabarits': return <IconGabaritsParchemin className={className} />;
    case 'desktopLayouts': return <IconWorkspacesCadres className={className} />;
    case 'midi': return <IconMidiController className={className} />;
    case 'sinais': return <IconMestreSignals className={className} />;
    case 'prensa': return <IconPrensaPartition className={className} />;
    case 'performance': return <XiloLightning size={16} className={`shrink-0 ${className}`} />;
    case 'audio': return <IconAudioHeadphones className={className} />;
    case 'ajuda': return <IconAideLivret className={className} />;
    default: return null;
  }
};
