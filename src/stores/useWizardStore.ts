import { create } from 'zustand';
import {
  PlacedInstrument,
  SwingIntensities,
  SongInfo,
  WizardState,
} from './types/wizardStoreTypes';

export type { PlacedInstrument, SwingIntensities, SongInfo };

export const useWizardStore = create<WizardState>((set) => ({
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
  timeSig: '4/4',
  instrumentTunings: {},
  selectedBalancoId: 'maracatu-trad',

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
  setPlacedInstruments: (placedInstruments) => set({ placedInstruments }),
  toggleToada: () => set((state) => ({ hasToada: !state.hasToada })),
  setHasToada: (hasToada) => set({ hasToada }),

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
  setTimeSig: (timeSig) => set({ timeSig }),
  setInstrumentTuning: (instrumentType, semitones) => set((state) => ({
    instrumentTunings: {
      ...state.instrumentTunings,
      [instrumentType]: semitones
    }
  })),
  setSelectedBalancoId: (selectedBalancoId) => set({ selectedBalancoId }),

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
    timeSig: '4/4',
    instrumentTunings: {},
    selectedBalancoId: 'maracatu-trad',
  }),
}));
