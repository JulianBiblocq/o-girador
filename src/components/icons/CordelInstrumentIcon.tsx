import React from 'react';
import {
  AlfaiaCordelIcon,
  CaixaCordelIcon,
  GongueCordelIcon,
  AgbeCordelIcon,
  MineiroCordelIcon,
  TimbalCordelIcon,
} from '../landing/LandingCordelIcons';

const ApitoCordelIcon: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 38 25 L 38 75 C 38 80, 62 80, 62 75 L 62 25 Z" />
    <path d="M 42 25 L 45 12 L 55 12 L 58 25" />
    <path d="M 38 35 L 62 35" />
    <path d="M 38 45 L 25 45 L 25 60 L 38 60" />
    <path d="M 62 45 L 75 45 L 75 60 L 62 60" />
    <circle cx="50" cy="52" r="3" fill="currentColor" />
    <circle cx="50" cy="85" r="5" />
    <path d="M 50 75 L 50 80" />
  </svg>
);

const MicroCordelIcon: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 30 30 C 30 10, 70 10, 70 30 C 70 50, 30 50, 30 30" />
    <path d="M 27 32 C 27 5, 73 5, 73 32 C 73 55, 27 55, 27 32" />
    <path d="M 35 15 L 65 45 M 45 12 L 70 35 M 30 25 L 55 48" strokeWidth="1" />
    <path d="M 65 15 L 35 45 M 55 12 L 30 35 M 70 25 L 45 48" strokeWidth="1" />
    <path d="M 30 30 Q 50 35 70 30 M 35 20 Q 50 25 65 20" strokeWidth="1" />
    <path d="M 35 50 Q 50 55 65 50 M 33 53 Q 50 58 67 53" />
    <path d="M 38 52 L 43 90 C 43 95, 57 95, 57 90 L 62 52" />
    <path d="M 35 55 L 40 92 M 65 55 L 60 92" />
    <path d="M 50 93 Q 45 105 60 98 Q 75 90 70 75" />
    <path d="M 48 93 Q 43 108 62 100 Q 78 92 72 73" />
  </svg>
);

const ICON_BY_INSTRUMENT_ID: Record<string, React.FC> = {
  marcante: AlfaiaCordelIcon,
  meiao: AlfaiaCordelIcon,
  repique: AlfaiaCordelIcon,
  caixa: CaixaCordelIcon,
  tarol: CaixaCordelIcon,
  gongue: GongueCordelIcon,
  agbe: AgbeCordelIcon,
  mineiro: MineiroCordelIcon,
  timbal: TimbalCordelIcon,
  apito: ApitoCordelIcon,
  toada: MicroCordelIcon,
  puxador: MicroCordelIcon,
  coro: MicroCordelIcon,
};

export interface CordelInstrumentIconProps {
  instrumentId?: string;
  className?: string;
}

export const CordelInstrumentIcon: React.FC<CordelInstrumentIconProps> = ({
  instrumentId = '',
  className = 'w-5 h-5 shrink-0',
}) => {
  const IconComponent = ICON_BY_INSTRUMENT_ID[instrumentId] || AlfaiaCordelIcon;
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      <IconComponent />
    </span>
  );
};
