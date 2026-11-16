import { create } from 'zustand';
import { TourTrackId } from '../data/tour/tourTypes';
import { TOUR_STEPS_PRACTICE } from '../data/tour/tourStepsPractice';
import { TOUR_STEPS_STUDIO } from '../data/tour/tourStepsStudio';
import { useSequencerStore } from './useSequencerStore';
import { useSequencerSettingsStore } from './useSequencerSettingsStore';

interface TourStoreState {
  isOpen: boolean;
  track: TourTrackId;
  stepIndex: number;
  openedEditorByTour: boolean;
  openedOficinaByTour: boolean;
  startTour: (preferredTrack?: TourTrackId) => void;
  switchTrack: (track: TourTrackId) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (idx: number) => void;
  markEditorOpenedByTour: () => void;
  markOficinaOpenedByTour: () => void;
  closeTour: () => void;
}

function getStepsForTrack(track: TourTrackId) {
  return track === 'practice' ? TOUR_STEPS_PRACTICE : TOUR_STEPS_STUDIO;
}

function cleanupTourSideEffects(openedEditor: boolean, openedOficina: boolean) {
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset.tourActive;
  }
  if (openedEditor) {
    useSequencerStore.getState().closeDetailEditor();
  }
  if (openedOficina) {
    useSequencerSettingsStore.getState().setIsSettingsOpen(false);
  }
}

export const useTourStore = create<TourStoreState>((set, get) => ({
  isOpen: false,
  track: 'studio',
  stepIndex: 0,
  openedEditorByTour: false,
  openedOficinaByTour: false,

  startTour: (preferredTrack) => {
    const isPractice = useSequencerStore.getState().isPracticeMode;
    const resolvedTrack: TourTrackId = preferredTrack ?? (isPractice ? 'practice' : 'studio');
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.tourActive = 'true';
    }
    set({
      isOpen: true,
      track: resolvedTrack,
      stepIndex: 0,
      openedEditorByTour: false,
      openedOficinaByTour: false,
    });
  },

  switchTrack: (track) => {
    const { openedEditorByTour, openedOficinaByTour } = get();
    cleanupTourSideEffects(openedEditorByTour, openedOficinaByTour);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.tourActive = 'true';
    }
    set({ track, stepIndex: 0, openedEditorByTour: false, openedOficinaByTour: false });
  },

  nextStep: () => {
    const { track, stepIndex, closeTour } = get();
    const steps = getStepsForTrack(track);
    if (stepIndex + 1 >= steps.length) {
      closeTour();
      return;
    }
    set({ stepIndex: stepIndex + 1 });
  },

  prevStep: () => {
    const { stepIndex } = get();
    if (stepIndex > 0) set({ stepIndex: stepIndex - 1 });
  },

  goToStep: (idx) => {
    const steps = getStepsForTrack(get().track);
    if (idx >= 0 && idx < steps.length) set({ stepIndex: idx });
  },

  markEditorOpenedByTour: () => set({ openedEditorByTour: true }),
  markOficinaOpenedByTour: () => set({ openedOficinaByTour: true }),

  closeTour: () => {
    const { openedEditorByTour, openedOficinaByTour } = get();
    cleanupTourSideEffects(openedEditorByTour, openedOficinaByTour);
    set({ isOpen: false, stepIndex: 0, openedEditorByTour: false, openedOficinaByTour: false });
  },
}));
