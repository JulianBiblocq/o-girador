import { arrayMove } from '@dnd-kit/sortable';
import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { handleTrackStepKeyDownHelper } from './trackStepKeyNavigationHelper';
import { syncPatternAcrossLinkedFamily } from '../../stores/helpers/patternStepLinkedTracksSync';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export interface PatternStepContext {
  pushUndoState: () => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createPatternStepHandlers(ctx: PatternStepContext) {
  const { pushUndoState, setTracks } = ctx;

  const handleStepValueSelectAndToggle = (
    trackId: number, patternId: number, stepIdx: number, newState: string | number | [string, string], optLyric?: string, optNote?: string
  ) => {
    pushUndoState();
    const defaults = useSequencerSettingsStore.getState().strokeDefaults?.[`${trackId}:${newState}`];
    if (typeof newState === 'string' && newState.trim() !== '' && newState !== '0') {
      useSequencerSettingsStore.getState().setStrokeForcedState(`${trackId}:${newState}`, true);
    }

    setTracks((prev) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => {
      const arrSteps = [...p.activeSteps];
      arrSteps[stepIdx] = newState;
      const arrLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
      const arrNotes = [...(p.notes || Array(p.steps).fill(''))];
      const arrVols = [...(p.volumes || Array(p.steps).fill(80))];
      const arrDecays = [...(p.decays || Array(p.steps).fill(100))];
      if (defaults) {
        if (defaults.volume !== undefined) arrVols[stepIdx] = defaults.volume;
        if (defaults.decay !== undefined) arrDecays[stepIdx] = defaults.decay;
      }
      if (optLyric !== undefined) arrLyrics[stepIdx] = optLyric;
      if (optNote !== undefined) arrNotes[stepIdx] = optNote;
      return { ...p, activeSteps: arrSteps, lyrics: arrLyrics, notes: arrNotes, volumes: arrVols, decays: arrDecays };
    }));
  };

  const handleTrackStepValueChange = (
    trackId: number, patternId: number, stepIdx: number | number[], val: string | number | string[] | [string, string], lyrics?: string[] | string, notes?: string[] | string
  ) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p, isSource, t) => {
      const inst = instrumentsConfig[t.instrumentIdx];
      const parseVal = (v: string | number): string | number => {
        if (!v || v === 0 || v === '0') return 0;
        const strV = String(v);
        const cleanChar = strV.slice(-1);
        if (strV === '0') return 0;
        if (inst && inst.colors[strV] !== undefined && strV !== 'text') return strV;
        if (cleanChar && cleanChar.trim() !== '') {
          if (inst?.type === 'gongue') return cleanChar === '1' || cleanChar === '2' ? cleanChar : '1';
          return cleanChar;
        }
        return 0;
      };

      const copySteps = [...p.activeSteps];
      const copyLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
      const copyNotes = [...(p.notes || Array(p.steps).fill(''))];
      if (Array.isArray(stepIdx)) {
        stepIdx.forEach((idx: number, i: number) => {
          const currentVal = Array.isArray(val) ? val[i] : val;
          copySteps[idx] = Array.isArray(currentVal) ? [parseVal(currentVal[0]) as string, parseVal(currentVal[1]) as string] : parseVal(currentVal as string | number);
          if (lyrics && Array.isArray(lyrics)) copyLyrics[idx] = lyrics[i];
          if (notes && Array.isArray(notes)) copyNotes[idx] = notes[i];
        });
      } else {
        copySteps[stepIdx] = Array.isArray(val) ? [parseVal(val[0]) as string, parseVal(val[1]) as string] : parseVal(val as string | number);
        if (lyrics !== undefined) copyLyrics[stepIdx] = typeof lyrics === 'string' ? lyrics : lyrics[0];
        if (notes !== undefined) copyNotes[stepIdx] = typeof notes === 'string' ? notes : notes[0];
      }
      return {
        ...p,
        activeSteps: copySteps,
        lyrics: copyLyrics,
        notes: copyNotes,
        volumes: p.volumes ? [...p.volumes] : Array(p.steps).fill(80),
      };
    }));
  };

  const handleTrackStepKeyDown = (
    trackId: number, patternId: number, stepIdx: number, key: string, currentWord: string, targetInputEl: HTMLInputElement
  ) => handleTrackStepKeyDownHelper(trackId, patternId, stepIdx, key, currentWord, targetInputEl);

  const handlePatternNameChange = (trackId: number, patternId: number, newName: string) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => {
      const updated = syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => ({ ...p, name: newName }));
      return syncMasterPatternsToLinkedFamily(updated, trackId).tracks;
    });
  };

  const handleReorderPatternsDnd = (trackId: number, oldIndex: number, newIndex: number) => {
    pushUndoState();
    setTracks((prevTracks: TrackGroup[]) => {
      const updated = prevTracks.map((t: TrackGroup) => t.id !== trackId ? t : { ...t, patterns: arrayMove(t.patterns, oldIndex, newIndex) });
      return syncMasterPatternsToLinkedFamily(updated, trackId).tracks;
    });
  };

  const handleDeletePatternMeasure = (trackId: number, patternId: number, measureIndex: number) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => syncPatternAcrossLinkedFamily(prev, trackId, patternId, (p) => {
      const arr = [...p.measureAssignments];
      arr[measureIndex] = false;
      return { ...p, measureAssignments: arr };
    }));
  };

  return {
    handleStepValueSelectAndToggle,
    handleTrackStepValueChange,
    handleTrackStepKeyDown,
    handlePatternNameChange,
    handleReorderPatternsDnd,
    handleDeletePatternMeasure,
  };
}
