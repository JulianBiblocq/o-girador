import { Language, PresetMetadata } from '../../types';
import { EcoConfig } from '../helpers/ecoModeDetector';
import { SelectedStepRange } from './clipboardSliceTypes';
import type { SubscriptionModalReason, VisitorModalReason } from '../../utils/userAccessPolicy';

export interface EditorDeepLinkTarget {
  trackId: number;
  patternId?: number | string | null;
  stepIdx?: number | null;
  isPreRoll?: boolean;
  subIndex?: 0 | 1 | null;
  initialTool?: string | null;
  expandTuning?: boolean;
}

export interface ProjectSettingsSlice {
  letras: string;
  metadata: PresetMetadata;
  isLeftHanded: boolean;
  lang: Language;
  isEcoMode: boolean;
  ecoConfig: EcoConfig;
  rodaSweepMode: 'sweep6h' | 'fullMeasure';
  editingTrackId: number | null;
  selectedPatternId: number | null;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll: boolean;
  selectedSubIndex: 0 | 1 | null;
  selectedStepRange: SelectedStepRange | null;
  editorDeepLink: EditorDeepLinkTarget | null;
  vocalTransposeSteps: number;
  isTracksCollapsed: boolean;
  isPreviewMode: boolean;
  hasFullPlaybackAccess: boolean;
  isUserTrialExpired: boolean;
  isVisitorAuthModalOpen: boolean;
  visitorAuthModalReason: VisitorModalReason;
  isSubscriptionModalOpen: boolean;
  subscriptionModalReason: SubscriptionModalReason;
  isMobileStudioMode: boolean;
  mobileViewMode: 'danse' | 'percussion' | 'editeur' | 'complet';
  isTouchLocked: boolean;

  setLetras: (letras: string) => void;
  setMetadata: (metadata: PresetMetadata) => void;
  setIsLeftHanded: (val: boolean) => void;
  setLang: (lang: Language) => void;
  setRodaSweepMode: (mode: 'sweep6h' | 'fullMeasure') => void;
  toggleRodaSweepMode: () => void;
  handleExtractLyrics: () => void;
  toggleEcoMode: () => void;
  toggleStrictAudioEco: () => void;
  setEditingTrackId: (id: number | null) => void;
  openInstrumentDetailAt: (payload: EditorDeepLinkTarget) => void;
  consumeEditorDeepLink: () => void;
  closeDetailEditor: () => void;
  setSelectedStepIdx: (idx: number | null, isPreRoll?: boolean, subIndex?: 0 | 1 | null) => void;
  setSelectedStepIndex: (idx: number | null, isPreRoll?: boolean) => void;
  setSelectedStepRange: (range: SelectedStepRange | null) => void;
  setVocalTransposeSteps: (steps: number) => void;
  incrementVocalTransposeSteps: () => void;
  decrementVocalTransposeSteps: () => void;
  transposePatternNotes: (trackId: number, patternId: string | number, semitones: number) => void;
  toggleTracksCollapsed: () => void;
  setIsPreviewMode: (val: boolean) => void;
  setHasFullPlaybackAccess: (val: boolean) => void;
  setIsUserTrialExpired: (val: boolean) => void;
  setIsMobileStudioMode: (val: boolean) => void;
  toggleMobileStudioMode: () => void;
  setMobileViewMode: (mode: 'danse' | 'percussion' | 'editeur' | 'complet') => void;
  setIsTouchLocked: (val: boolean) => void;
  toggleTouchLock: () => void;
  openVisitorAuthModal: (reason?: VisitorModalReason) => void;
  closeVisitorAuthModal: () => void;
  openSubscriptionModal: (reason?: SubscriptionModalReason) => void;
  closeSubscriptionModal: () => void;
}
