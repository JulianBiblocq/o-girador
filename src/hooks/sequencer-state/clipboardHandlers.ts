import { TrackGroup, Pattern, SongSection, SavedSectionData, Language } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { canTransferPatterns, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { executeInsertCloudSection, CloudSectionContext } from './cloudSectionInsertHelper';
import { handleCopySongSectionHelper, handlePasteSongSectionHelper } from './sectionClipboardHelper';
import {
  resolveConcreteTargetTrack,
  buildCopiedPatternPayload,
  applySinglePatternPasteState,
} from './patternClipboardHelper';

export interface ClipboardContext extends CloudSectionContext {
  lang: Language;
  totalMeasuresRef: { current: number };
  setCopiedPattern: (p: any) => void;
  setCopiedSection: (s: any) => void;
  handleCreateSongSection: (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => void;
}

export function createClipboardHandlers(ctx: ClipboardContext) {
  const { pushUndoState, setTracks, setCopiedPattern, lang } = ctx;

  const handleCopyPattern = (pattern: Pattern, sourceTrackOrInst?: number | string) => {
    if (!pattern) return;
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = null;
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
    const tracks = useSequencerStore.getState().tracks || [];
    setCopiedPattern(buildCopiedPatternPayload(pattern, tracks, sourceTrackOrInst));
  };

  const handlePastePattern = (trackId: number, targetPatternId?: number) => {
    const state = useSequencerStore.getState();
    const nextTracks = applySinglePatternPasteState(
      state.tracks, state.copiedPattern, trackId, targetPatternId, ctx.totalMeasuresRef.current, lang
    );
    if (!nextTracks) return;
    pushUndoState();
    setTracks(() => nextTracks);
    useSequencerStore.setState((s) => ({ tracksVersion: s.tracksVersion + 1 }));
  };

  const handleLoadLibraryPattern = (trackId: number, targetPatternId: number, libPattern: any) => {
    if (!libPattern || !Array.isArray(libPattern.steps)) return;
    const state = useSequencerStore.getState();
    const targetTrack = resolveConcreteTargetTrack(state.tracks, trackId);
    if (!targetTrack || !canTransferPatterns(libPattern.instrumentId || libPattern, targetTrack, state.tracks)) {
      return;
    }
    const destInstId = resolveTrackInstrumentId(targetTrack, state.tracks);
    pushUndoState();
    setTracks((prev: TrackGroup[]) => {
      let nextTracks = prev.map((t: TrackGroup) => {
        if (t.id !== targetTrack.id) return t;
        return {
          ...t,
          patterns: t.patterns.map((p: Pattern) => {
            if (p.id !== targetPatternId) return p;
            const nextActiveSteps = [...libPattern.steps];
            while (nextActiveSteps.length < p.steps) nextActiveSteps.push(0);
            nextActiveSteps.length = p.steps;
            const rawMerged: Pattern = {
              ...p,
              activeSteps: nextActiveSteps,
              variations: JSON.parse(JSON.stringify(libPattern.variations || [])),
              ...(libPattern.volumes ? { volumes: [...libPattern.volumes] } : {}),
              ...(libPattern.decays ? { decays: [...libPattern.decays] } : {}),
              ...(libPattern.microtimings ? { microtimings: [...libPattern.microtimings] } : {}),
            };
            return normalizePatternStepsForTarget(rawMerged, destInstId);
          }),
        };
      });
      if (targetTrack.isLinkMaster === true && !targetTrack.isBusFolder && !targetTrack.isLinkFolder) {
        nextTracks = syncMasterPatternsToLinkedFamily(nextTracks, targetTrack.id).tracks;
      }
      return nextTracks;
    });
  };

  const handleCopySongSection = (section: SongSection) => handleCopySongSectionHelper(section, ctx);
  const handlePasteSongSection = (destStartMeasure: number) => handlePasteSongSectionHelper(destStartMeasure, ctx);
  const handleInsertCloudSection = (sectionData: SavedSectionData, insertAtMeasure: number) => executeInsertCloudSection(sectionData, insertAtMeasure, ctx);

  return { handleCopyPattern, handlePastePattern, handleLoadLibraryPattern, handleCopySongSection, handlePasteSongSection, handleInsertCloudSection };
}
