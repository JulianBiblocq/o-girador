import { TrackGroup, Pattern, SongSection, SavedSectionData, Language } from '../../types';
import { instrumentsConfig } from '../../data';
import { getNextPatternName } from '../../utils/patternNaming';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { convertStepsToVocalRole } from './vocalStepRoleHelper';
import { executeInsertCloudSection, CloudSectionContext } from './cloudSectionInsertHelper';
import { handleCopySongSectionHelper, handlePasteSongSectionHelper } from './sectionClipboardHelper';

export interface ClipboardContext extends CloudSectionContext {
  lang: Language;
  totalMeasuresRef: { current: number };
  setCopiedPattern: (p: any) => void;
  setCopiedSection: (s: any) => void;
  handleCreateSongSection: (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => void;
}

export function createClipboardHandlers(ctx: ClipboardContext) {
  const { pushUndoState, setTracks, setCopiedPattern, lang } = ctx;

  const handleCopyPattern = (pattern: Pattern) => {
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = null;
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
    setCopiedPattern(JSON.parse(JSON.stringify(pattern)));
  };

  const handlePastePattern = (trackId: number, targetPatternId?: number) => {
    const patternToPaste = useSequencerStore.getState().copiedPattern;
    if (!patternToPaste) return;
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      const firstP = t.patterns[0];
      const destInstId = instrumentsConfig[t.instrumentIdx]?.id;
      const isVoice = destInstId === 'puxador' || destInstId === 'coro';
      const role = destInstId === 'puxador' ? 'P' : 'C';

      if (targetPatternId !== undefined && targetPatternId === patternToPaste.id) {
        const pasted: Pattern = {
          ...patternToPaste,
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: getNextPatternName(t.patterns, patternToPaste.name, lang),
          steps: patternToPaste.steps,
          activeSteps: [...patternToPaste.activeSteps],
          lyrics: [...patternToPaste.lyrics],
          notes: [...patternToPaste.notes],
          measureAssignments: Array(ctx.totalMeasuresRef.current).fill(true),
          volumes: patternToPaste.volumes ? [...patternToPaste.volumes] : Array(firstP.steps).fill(80),
          decays: patternToPaste.decays ? [...patternToPaste.decays] : Array(firstP.steps).fill(100),
          microtimings: patternToPaste.microtimings ? [...patternToPaste.microtimings] : Array(patternToPaste.steps).fill(0),
          beatResolutions: patternToPaste.beatResolutions ? [...patternToPaste.beatResolutions] : undefined,
          variations: patternToPaste.variations ? JSON.parse(JSON.stringify(patternToPaste.variations)) : undefined,
          preRollActiveSteps: patternToPaste.preRollActiveSteps ? [...patternToPaste.preRollActiveSteps] : undefined,
          preRollLyrics: patternToPaste.preRollLyrics ? [...patternToPaste.preRollLyrics] : undefined,
          preRollNotes: patternToPaste.preRollNotes ? [...patternToPaste.preRollNotes] : undefined,
          preRollVolumes: patternToPaste.preRollVolumes ? [...patternToPaste.preRollVolumes] : undefined,
          preRollDecays: patternToPaste.preRollDecays ? [...patternToPaste.preRollDecays] : undefined,
        };
        if (isVoice) {
          pasted.activeSteps = convertStepsToVocalRole(pasted.activeSteps, role);
          if (pasted.preRollActiveSteps) pasted.preRollActiveSteps = convertStepsToVocalRole(pasted.preRollActiveSteps, role);
        }
        return { ...t, patterns: [...t.patterns, pasted], selectedPatternId: pasted.id };
      }

      const nextPatterns = t.patterns.map((p: Pattern) => {
        if (p.id !== targetPatternId) return p;
        let nextActiveSteps = [...patternToPaste.activeSteps];
        let nextPreRoll = patternToPaste.preRollActiveSteps ? [...patternToPaste.preRollActiveSteps] : undefined;
        if (isVoice) {
          nextActiveSteps = convertStepsToVocalRole(nextActiveSteps, role);
          if (nextPreRoll) nextPreRoll = convertStepsToVocalRole(nextPreRoll, role);
        }
        return {
          ...p, steps: patternToPaste.steps, activeSteps: nextActiveSteps, lyrics: [...patternToPaste.lyrics], notes: [...patternToPaste.notes],
          volumes: patternToPaste.volumes ? [...patternToPaste.volumes] : Array(patternToPaste.steps).fill(80),
          decays: patternToPaste.decays ? [...patternToPaste.decays] : Array(patternToPaste.steps).fill(100),
          microtimings: patternToPaste.microtimings ? [...patternToPaste.microtimings] : Array(patternToPaste.steps).fill(0),
          beatResolutions: patternToPaste.beatResolutions ? [...patternToPaste.beatResolutions] : undefined,
          variations: patternToPaste.variations ? JSON.parse(JSON.stringify(patternToPaste.variations)) : undefined,
          preRollActiveSteps: nextPreRoll, preRollLyrics: patternToPaste.preRollLyrics ? [...patternToPaste.preRollLyrics] : undefined,
          preRollNotes: patternToPaste.preRollNotes ? [...patternToPaste.preRollNotes] : undefined,
          preRollVolumes: patternToPaste.preRollVolumes ? [...patternToPaste.preRollVolumes] : undefined,
          preRollDecays: patternToPaste.preRollDecays ? [...patternToPaste.preRollDecays] : undefined,
        };
      });
      return { ...t, patterns: nextPatterns };
    }));
    useSequencerStore.setState((s) => ({ tracksVersion: s.tracksVersion + 1 }));
  };

  const handleLoadLibraryPattern = (trackId: number, targetPatternId: number, libPattern: any) => {
    pushUndoState();
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
      if (t.id !== trackId) return t;
      return {
        ...t, patterns: t.patterns.map((p: Pattern) => {
          if (p.id !== targetPatternId) return p;
          const nextActiveSteps = [...libPattern.steps];
          while (nextActiveSteps.length < p.steps) nextActiveSteps.push(0);
          nextActiveSteps.length = p.steps;
          return {
            ...p, activeSteps: nextActiveSteps, variations: JSON.parse(JSON.stringify(libPattern.variations || [])),
            ...(libPattern.volumes ? { volumes: [...libPattern.volumes] } : {}),
            ...(libPattern.decays ? { decays: [...libPattern.decays] } : {}),
            ...(libPattern.microtimings ? { microtimings: [...libPattern.microtimings] } : {})
          };
        })
      };
    }));
  };

  const handleCopySongSection = (section: SongSection) => handleCopySongSectionHelper(section, ctx);
  const handlePasteSongSection = (destStartMeasure: number) => handlePasteSongSectionHelper(destStartMeasure, ctx);
  const handleInsertCloudSection = (sectionData: SavedSectionData, insertAtMeasure: number) => executeInsertCloudSection(sectionData, insertAtMeasure, ctx);

  return { handleCopyPattern, handlePastePattern, handleLoadLibraryPattern, handleCopySongSection, handlePasteSongSection, handleInsertCloudSection };
}
