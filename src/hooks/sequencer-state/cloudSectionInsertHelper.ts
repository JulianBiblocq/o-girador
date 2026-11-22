import { SavedSectionData, SectionImportOptions, SongMarker, SongSection, TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { notifyToast } from '../../utils/toastHelper';
import { applySectionImportToState } from '../../utils/sections/sectionImportEngine';

export interface CloudSectionContext {
  pushUndoState: () => void;
  setTotalMeasures: (updater: (prev: number) => number) => void;
  setMeasureTimeSigs: (updater: (prev: any[]) => any[]) => void;
  setMeasureBpms: (updater: (prev: any[]) => any[]) => void;
  setMeasureBpmTransitions: (updater: (prev: any[]) => any[]) => void;
  setMeasureVols: (updater: (prev: any[]) => any[]) => void;
  setMeasureVolTransitions: (updater: (prev: any[]) => any[]) => void;
  setMeasureSignals: (updater: (prev: any[]) => any[]) => void;
  setSongSections: (updater: (prev: SongSection[]) => SongSection[]) => void;
  setSongMarkers: (updater: (prev: SongMarker[]) => SongMarker[]) => void;
  setLoopStartMeasure: (updater: any) => void;
  setLoopEndMeasure: (updater: any) => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function executeInsertCloudSection(
  sectionData: SavedSectionData,
  insertAtMeasure: number,
  ctx: CloudSectionContext,
  options?: Partial<SectionImportOptions>
): boolean {
  const state = useSequencerStore.getState();
  const res = applySectionImportToState(state, sectionData, insertAtMeasure, {
    mode: 'insert',
    createMissingTracks: true,
    ...options,
  });

  if (res.blockedByLimit || !res.patch) {
    state.openSubscriptionModal?.(state.isUserTrialExpired ? 'trial_expired' : 'measures_limit');
    notifyToast(
      state.lang === 'pt'
        ? `Limite de ${res.maxMeasuresAllowed ?? 30} compassos atingido na versão gratuita.`
        : `Limite de ${res.maxMeasuresAllowed ?? 30} mesures atteinte en version gratuite.`,
      'error'
    );
    return false;
  }

  ctx.pushUndoState();
  useSequencerStore.setState(res.patch as any);
  return true;
}
