import React from 'react';
import { Language } from '../types';

export interface TimelineUIContextType {
  MEASURE_W: number;
  HEADER_W: number;
  totalContentW: number;
  isMobile: boolean;
  isMacro: boolean;
  isMinZoom: boolean;
  isPanningActive: boolean;
  lang: Language;
  signalDropdownOpen: number | null;
  setSignalDropdownOpen: (val: number | null) => void;
}

export const TimelineUIContext = React.createContext<TimelineUIContextType | null>(null);
