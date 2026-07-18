import { create } from 'zustand';

export interface PlacedInstrument {
  id: string;
  instrumentType: string; // 'marcante', 'meiao', 'repique', 'caixa', 'tarol', 'gongue', 'agbe', 'mineiro', 'timbal'
  x: number; // relative position in % (0 - 100)
  y: number; // relative position in % (0 - 100)
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

interface WizardState {
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
  
  // Step 2 Musical Configuration & Identity
  wizardLang: 'fr' | 'pt';
  alfaiaGroupingMode: 'bloc' | 'distinct';
  selectedBasePatternId: string | null; // ID of classic base pattern
  selectedSwingId: string; // 'maracatu' | 'off' | 'custom' ...
  swingIntensities: SwingIntensities;
  selectedSignIds: string[]; // Multi-selection array of Signes/Blasons
  songInfo: SongInfo;
  bpm: number;
  
  setIntroModalOpen: (open: boolean) => void;
  setWizardOpen: (open: boolean) => void;
  setStep: (step: number) => void;
  updateWizardData: (data: Partial<WizardState['wizardData']>) => void;
  addPlacedInstrument: (type: string, x: number, y: number) => void;
  updatePlacedInstrumentPosition: (id: string, x: number, y: number) => void;
  removePlacedInstrument: (id: string) => void;
  toggleToada: () => void;
  
  // Step 2 Actions
  toggleWizardLang: () => void;
  setAlfaiaGroupingMode: (mode: 'bloc' | 'distinct') => void;
  setSelectedSwingId: (id: string) => void;
  setSwingIntensity: (family: keyof SwingIntensities, value: number) => void;
  toggleSignId: (id: string) => void;
  setSelectedBasePatternId: (id: string | null) => void;
  updateSongInfo: (field: keyof SongInfo, value: string) => void;
  setBpm: (bpm: number) => void;
  
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  isIntroModalOpen: false,
  isWizardOpen: false,
  step: 1,
  wizardData: {},
  placedInstruments: [],
  hasToada: false,
  
  // Step 2 Default State
  wizardLang: 'fr',
  alfaiaGroupingMode: 'bloc',
  selectedBasePatternId: null,
  selectedSwingId: 'maracatu',
  swingIntensities: {
    alfaias: 100, // 100% by default
    caixas: 100,
    sementes: 100,
    gongue: 100,
    timbal: 100,
  },
  selectedSignIds: [], // Empty initially
  songInfo: {
    rodaName: '',
    toadaName: '',
    nacaoName: '',
    composer: '',
    mainRythm: '',
    youtubeUrl: '',
  },
  bpm: 100,
  
  setIntroModalOpen: (isIntroModalOpen) => set({ isIntroModalOpen }),
  setWizardOpen: (isWizardOpen) => set({ isWizardOpen }),
  setStep: (step) => set({ step }),
  updateWizardData: (data) => set((state) => ({ wizardData: { ...state.wizardData, ...data } })),
  addPlacedInstrument: (type, x, y) => set((state) => {
    const newInstrument: PlacedInstrument = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      instrumentType: type,
      x,
      y
    };
    return { placedInstruments: [...state.placedInstruments, newInstrument] };
  }),
  updatePlacedInstrumentPosition: (id, x, y) => set((state) => ({
    placedInstruments: state.placedInstruments.map((inst) =>
      inst.id === id ? { ...inst, x, y } : inst
    )
  })),
  removePlacedInstrument: (id) => set((state) => ({
    placedInstruments: state.placedInstruments.filter((inst) => inst.id !== id)
  })),
  toggleToada: () => set((state) => ({ hasToada: !state.hasToada })),
  
  // Step 2 Actions
  toggleWizardLang: () => set((state) => ({ wizardLang: state.wizardLang === 'fr' ? 'pt' : 'fr' })),
  setAlfaiaGroupingMode: (alfaiaGroupingMode) => set({ alfaiaGroupingMode }),
  setSelectedSwingId: (selectedSwingId) => set({ selectedSwingId }),
  setSwingIntensity: (family, value) => set((state) => ({
    swingIntensities: {
      ...state.swingIntensities,
      [family]: value,
    }
  })),
  toggleSignId: (id) => set((state) => ({
    selectedSignIds: state.selectedSignIds.includes(id)
      ? state.selectedSignIds.filter((item) => item !== id)
      : [...state.selectedSignIds, id]
  })),
  setSelectedBasePatternId: (selectedBasePatternId) => set({ selectedBasePatternId }),
  updateSongInfo: (field, value) => set((state) => ({
    songInfo: {
      ...state.songInfo,
      [field]: value
    }
  })),
  setBpm: (bpm) => set({ bpm }),
  
  resetWizard: () => set({
    isIntroModalOpen: false,
    isWizardOpen: false,
    step: 1,
    wizardData: {},
    placedInstruments: [],
    hasToada: false,
    wizardLang: 'fr',
    alfaiaGroupingMode: 'bloc',
    selectedBasePatternId: null,
    selectedSwingId: 'maracatu',
    swingIntensities: {
      alfaias: 100,
      caixas: 100,
      sementes: 100,
      gongue: 100,
      timbal: 100,
    },
    selectedSignIds: [],
    songInfo: {
      rodaName: '',
      toadaName: '',
      nacaoName: '',
      composer: '',
      mainRythm: '',
      youtubeUrl: '',
    },
    bpm: 100,
  }),
}));
