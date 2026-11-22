import type { SavedSectionData } from '../../types';

export interface PlacedInstrument {
  id: string;
  instrumentType: string;
  x: number;
  y: number;
}

export interface SwingIntensities {
  alfaias: number;
  caixas: number;
  sementes: number;
  gongue: number;
  timbal: number;
}

export interface SongInfo {
  rodaName: string;
  toadaName: string;
  nacaoName: string;
  composer: string;
  mainRythm: string;
  youtubeUrl: string;
}

export type WizardStructurePreset = 'loop1' | 'bars4' | 'trad6' | 'cloud_section';

export interface WizardProfilePrefill {
  groupName?: string | null;
  displayName?: string | null;
}

export interface WizardState {
  isIntroModalOpen: boolean;
  isWizardOpen: boolean;
  step: number;
  wizardData: {
    rhythm?: string;
    tempo?: number;
    [key: string]: any;
  };
  placedInstruments: PlacedInstrument[];
  hasToada: boolean;
  hasApito: boolean;

  wizardLang: 'fr' | 'pt';
  alfaiaGroupingMode: 'bloc' | 'distinct';
  selectedBasePatternId: string | null;
  selectedCloudSectionId: string | null;
  selectedCloudSectionName: string | null;
  selectedCloudSectionData: SavedSectionData | null;
  structurePreset: WizardStructurePreset;
  selectedSwingId: string;
  swingIntensities: SwingIntensities;
  selectedSignIds: string[];
  songInfo: SongInfo;
  bpm: number;
  timeSig: string;
  instrumentTunings: Record<string, number>;
  instrumentDecays: Record<string, number>;
  selectedBalancoId: string;

  setIntroModalOpen: (open: boolean) => void;
  setWizardOpen: (open: boolean) => void;
  setStep: (step: number) => void;
  updateWizardData: (data: Partial<WizardState['wizardData']>) => void;
  addPlacedInstrument: (type: string, x: number, y: number) => PlacedInstrument;
  updatePlacedInstrumentPosition: (id: string, x: number, y: number) => void;
  removePlacedInstrument: (id: string) => void;
  setPlacedInstruments: (instruments: PlacedInstrument[]) => void;
  toggleToada: () => void;
  setHasToada: (hasToada: boolean) => void;
  toggleApito: () => void;
  setHasApito: (hasApito: boolean) => void;

  toggleWizardLang: () => void;
  setAlfaiaGroupingMode: (mode: 'bloc' | 'distinct') => void;
  setSelectedSwingId: (id: string) => void;
  setSwingIntensity: (family: keyof SwingIntensities, value: number) => void;
  toggleSignId: (id: string) => void;
  setSelectedBasePatternId: (id: string | null) => void;
  setSelectedCloudSection: (id: string | null, name: string | null, data: SavedSectionData | null) => void;
  setStructurePreset: (preset: WizardStructurePreset) => void;
  updateSongInfo: (field: keyof SongInfo, value: string) => void;
  initFromUserProfile: (profile?: WizardProfilePrefill | null) => void;
  setBpm: (bpm: number) => void;
  setTimeSig: (timeSig: string) => void;
  setInstrumentTuning: (instrumentType: string, semitones: number) => void;
  setInstrumentDecay: (instrumentType: string, decayPct: number) => void;
  setSelectedBalancoId: (balancoId: string) => void;

  resetWizard: () => void;
}
