import { create } from 'zustand';
import { DEFAULT_SIGNATURE_TUNINGS } from '../utils/audio/lutherieFactoryPresets';
import {
  PlacedInstrument, SwingIntensities, SongInfo, WizardStructurePreset, WizardProfilePrefill, WizardState,
} from './types/wizardStoreTypes';

export type { PlacedInstrument, SwingIntensities, SongInfo, WizardStructurePreset, WizardProfilePrefill };

const INITIAL_SWING: SwingIntensities = { alfaias: 100, caixas: 100, sementes: 100, gongue: 100, timbal: 100 };
const INITIAL_SONG_INFO: SongInfo = { rodaName: '', toadaName: '', nacaoName: '', composer: '', mainRythm: '', youtubeUrl: '' };

export const useWizardStore = create<WizardState>((set) => ({
  isIntroModalOpen: false,
  isWizardOpen: false,
  step: 1,
  wizardData: {},
  placedInstruments: [],
  hasToada: false,
  hasApito: false,
  wizardLang: 'fr',
  alfaiaGroupingMode: 'bloc',
  selectedBasePatternId: 'luanda',
  selectedCloudSectionId: null,
  selectedCloudSectionName: null,
  selectedCloudSectionData: null,
  structurePreset: 'loop1',
  selectedSwingId: 'maracatu',
  swingIntensities: { ...INITIAL_SWING },
  selectedSignIds: [],
  songInfo: { ...INITIAL_SONG_INFO },
  bpm: 96,
  timeSig: '4/4',
  instrumentTunings: { ...DEFAULT_SIGNATURE_TUNINGS },
  instrumentDecays: {},
  selectedBalancoId: 'maracatu-trad',

  setIntroModalOpen: (isIntroModalOpen) => set({ isIntroModalOpen }),
  setWizardOpen: (isWizardOpen) => set({ isWizardOpen }),
  setStep: (step) => set({ step }),
  updateWizardData: (data) => set((state) => ({ wizardData: { ...state.wizardData, ...data } })),
  addPlacedInstrument: (type, x, y) => {
    if ((type || '').toLowerCase() === 'apito') {
      set({ hasApito: true });
      return { id: 'apito_mestre', instrumentType: 'apito', x: 50, y: 100 };
    }
    const item: PlacedInstrument = { id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, instrumentType: type, x, y };
    set((state) => ({ placedInstruments: [...state.placedInstruments, item] }));
    return item;
  },
  updatePlacedInstrumentPosition: (id, x, y) =>
    set((state) => ({ placedInstruments: state.placedInstruments.map((i) => (i.id === id ? { ...i, x, y } : i)) })),
  removePlacedInstrument: (id) =>
    set((state) => ({ placedInstruments: state.placedInstruments.filter((i) => i.id !== id) })),
  setPlacedInstruments: (raw) =>
    set(() => {
      const hadApito = raw.some((i) => (i.instrumentType || '').toLowerCase() === 'apito');
      const placedInstruments = raw.filter((i) => (i.instrumentType || '').toLowerCase() !== 'apito');
      return hadApito ? { placedInstruments, hasApito: true } : { placedInstruments };
    }),
  toggleToada: () => set((state) => ({ hasToada: !state.hasToada })),
  setHasToada: (hasToada) => set({ hasToada }),
  toggleApito: () => set((state) => ({ hasApito: !state.hasApito })),
  setHasApito: (hasApito) => set({ hasApito }),

  toggleWizardLang: () => set((state) => ({ wizardLang: state.wizardLang === 'fr' ? 'pt' : 'fr' })),
  setAlfaiaGroupingMode: (alfaiaGroupingMode) => set({ alfaiaGroupingMode }),
  setSelectedSwingId: (selectedSwingId) => set({ selectedSwingId }),
  setSwingIntensity: (family, value) => set((state) => ({ swingIntensities: { ...state.swingIntensities, [family]: value } })),
  toggleSignId: (id) =>
    set((state) => ({
      selectedSignIds: state.selectedSignIds.includes(id) ? state.selectedSignIds.filter((x) => x !== id) : [...state.selectedSignIds, id],
    })),
  setSelectedBasePatternId: (selectedBasePatternId) =>
    set((state) => ({
      selectedBasePatternId, selectedCloudSectionId: null, selectedCloudSectionName: null, selectedCloudSectionData: null,
      structurePreset: state.structurePreset === 'cloud_section' ? 'loop1' : state.structurePreset,
    })),
  setSelectedCloudSection: (selectedCloudSectionId, selectedCloudSectionName, selectedCloudSectionData) =>
    set((state) => ({
      selectedCloudSectionId, selectedCloudSectionName, selectedCloudSectionData,
      structurePreset: selectedCloudSectionData ? 'cloud_section' : (state.structurePreset === 'cloud_section' ? 'loop1' : state.structurePreset),
    })),
  setStructurePreset: (structurePreset) => set({ structurePreset }),
  updateSongInfo: (field, value) =>
    set((state) => ({
      songInfo: {
        ...state.songInfo, [field]: value,
        ...(field === 'toadaName' ? { rodaName: value } : field === 'rodaName' ? { toadaName: value } : {}),
      },
    })),
  initFromUserProfile: (profile) =>
    set((state) => ({
      songInfo: {
        ...state.songInfo,
        nacaoName: state.songInfo.nacaoName || (profile?.groupName || '').trim(),
        composer: state.songInfo.composer || (profile?.displayName || '').trim(),
      },
    })),
  setBpm: (bpm) => set({ bpm }),
  setTimeSig: (timeSig) => set({ timeSig }),
  setInstrumentTuning: (instrumentType, semitones) =>
    set((state) => ({ instrumentTunings: { ...state.instrumentTunings, [instrumentType]: semitones } })),
  setInstrumentDecay: (instrumentType, decayPct) =>
    set((state) => ({ instrumentDecays: { ...state.instrumentDecays, [instrumentType]: Math.max(15, Math.min(100, Math.round(decayPct))) } })),
  setSelectedBalancoId: (selectedBalancoId) => set({ selectedBalancoId }),

  resetWizard: () =>
    set({
      isIntroModalOpen: false, isWizardOpen: false, step: 1, wizardData: {}, placedInstruments: [], hasToada: false, hasApito: false,
      wizardLang: 'fr', alfaiaGroupingMode: 'bloc', selectedBasePatternId: 'luanda',
      selectedCloudSectionId: null, selectedCloudSectionName: null, selectedCloudSectionData: null,
      structurePreset: 'loop1', selectedSwingId: 'maracatu', swingIntensities: { ...INITIAL_SWING }, selectedSignIds: [],
      songInfo: { ...INITIAL_SONG_INFO }, bpm: 96, timeSig: '4/4',
      instrumentTunings: { ...DEFAULT_SIGNATURE_TUNINGS }, instrumentDecays: {}, selectedBalancoId: 'maracatu-trad',
    }),
}));
