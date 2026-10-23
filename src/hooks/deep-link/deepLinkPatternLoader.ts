
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { CloudPattern } from '../../types';

export async function applyPatternDeepLink(cloudPattern: CloudPattern, applyPreset: (preset: any) => Promise<void>) {
  const currentTracks = useSequencerStore.getState().tracks;
  const targetTrack = currentTracks.find((t: any) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    return inst && (inst.id === cloudPattern.instrumentId || inst.name.toLowerCase() === (cloudPattern.instrumentId || '').toLowerCase());
  });

  if (targetTrack) {
    const pId = Date.now();
    const newPat = {
      ...cloudPattern,
      id: pId,
      measureAssignments: targetTrack.patterns?.[0]?.measureAssignments || [true]
    };
    const updated = currentTracks.map((t: any) => (
      t.id === targetTrack.id
        ? { ...t, patterns: [...(t.patterns || []), newPat], selectedPatternId: pId }
        : t
    ));
    useSequencerStore.getState().setTracks(updated);
    useSequencerStore.getState().setEditingTrackId(targetTrack.id);
  } else {
    const instConf = instrumentsConfig.find((i) => i.id === cloudPattern.instrumentId) || instrumentsConfig[0];
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
        isHidden: false
      }]
    };
    await applyPreset(singleTrackPreset);
    useSequencerStore.getState().setEditingTrackId(1);
  }
}
