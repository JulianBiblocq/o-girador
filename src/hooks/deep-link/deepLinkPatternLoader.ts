import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { CloudPattern } from '../../types';
import {
  canTransferPatterns,
  normalizeInstrumentId,
  resolveTrackInstrumentId,
} from '../../utils/instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';

export async function applyPatternDeepLink(cloudPattern: CloudPattern, applyPreset: (preset: any) => Promise<void>) {
  const currentTracks = useSequencerStore.getState().tracks;
  const cloudInstId = normalizeInstrumentId(cloudPattern.instrumentId);

  const concreteTracks = currentTracks.filter((t: any) => t && !t.isBusFolder && !t.isLinkFolder);
  const targetTrack =
    concreteTracks.find((t: any) => resolveTrackInstrumentId(t, currentTracks) === cloudInstId) ||
    concreteTracks.find((t: any) => canTransferPatterns(cloudInstId, t, currentTracks));

  if (targetTrack) {
    const destInstId = resolveTrackInstrumentId(targetTrack, currentTracks);
    const pId = Date.now();
    const rawPat: any = {
      ...cloudPattern,
      id: pId,
      activeSteps: Array.isArray((cloudPattern as any).activeSteps)
        ? [...(cloudPattern as any).activeSteps]
        : (Array.isArray(cloudPattern.steps) ? [...cloudPattern.steps] : []),
      steps: Array.isArray(cloudPattern.steps) ? cloudPattern.steps.length : ((cloudPattern as any).steps || 16),
      measureAssignments: targetTrack.patterns?.[0]?.measureAssignments || [true],
    };
    const newPat = normalizePatternStepsForTarget(rawPat, destInstId);
    const updated = currentTracks.map((t: any) => (
      t.id === targetTrack.id
        ? { ...t, patterns: [...(t.patterns || []), newPat], selectedPatternId: pId }
        : t
    ));
    useSequencerStore.getState().setTracks(updated);
    useSequencerStore.getState().setEditingTrackId(targetTrack.id);
  } else {
    const instConf = instrumentsConfig.find((i) => normalizeInstrumentId(i.id) === cloudInstId) || instrumentsConfig[0];
    const instIdx = instrumentsConfig.indexOf(instConf);
    const pId = Date.now();
    const singleTrackPreset = {
      version: 3,
      bpm: 100,
      timeSig: '4/4',
      totalMeasures: 1,
      tracks: [{
        id: 1,
        instrumentIdx: instIdx !== -1 ? instIdx : 0,
        customName: cloudPattern.name,
        patterns: [{ ...cloudPattern, id: pId, measureAssignments: [true] }],
        selectedPatternId: pId,
        volume: 80,
        pan: 0,
        reverbLevel: 20,
        isMuted: false,
        isSoloed: false,
        isHidden: false,
      }],
    };
    await applyPreset(singleTrackPreset);
    useSequencerStore.getState().setEditingTrackId(1);
  }
}
