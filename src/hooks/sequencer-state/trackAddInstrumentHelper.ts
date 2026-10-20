import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';
import { applyRadii } from './sequencerStateTypes';
import { AudioEngine } from '../../AudioEngine';

export interface AddTrackContext {
  pushUndoState: () => void;
  audioEngine: AudioEngine | null;
  lang: Language;
  totalMeasuresRef: { current: number };
  currentMeasure: number;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function handleAddTrackInstrumentHelper(
  instIdx: number,
  ctx: AddTrackContext
): number {
  ctx.pushUndoState();
  const inst = instrumentsConfig[instIdx];
  if (inst) {
    ctx.audioEngine?.loadInstrumentSamples(inst.id).catch(console.error);
  }

  if (inst?.id === 'toada') {
    const toadaBusId = 999901;
    const puxTrackId = 999902;
    const coroTrackId = 999903;
    const puxInstIdx = instrumentsConfig.findIndex(i => i.id === 'puxador');
    const coroInstIdx = instrumentsConfig.findIndex(i => i.id === 'coro');

    const toadaBusTrack: TrackGroup = {
      id: toadaBusId,
      instrumentIdx: instIdx,
      isBusFolder: true,
      isSequencerFolded: false,
      patterns: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75,
      selectedPatternId: -1,
      reverbVal: 0,
      panVal: 0,
      pan: 0,
      fxSends: { reverb: 0, distortion: 0 }
    };

    const makeVoiceTrack = (id: number, idx: number, name: string): TrackGroup => ({
      id,
      instrumentIdx: idx,
      busId: String(toadaBusId),
      patterns: [{
        id: Date.now() + Math.floor(Math.random() * 1000) + (id === puxTrackId ? 10 : 20),
        name,
        steps: 16,
        activeSteps: Array(16).fill(0),
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: Array(ctx.totalMeasuresRef.current).fill(id === puxTrackId),
        volumes: Array(16).fill(80),
        decays: Array(16).fill(10),
        microtimings: Array(16).fill(0),
      }],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75,
      selectedPatternId: 0,
      reverbVal: 0,
      panVal: 0,
      pan: 0,
      fxSends: { reverb: 0, distortion: 0 }
    });

    const puxTrack = makeVoiceTrack(puxTrackId, puxInstIdx !== -1 ? puxInstIdx : 8, ctx.lang === 'fr' ? 'Chant 1' : 'Puxador 1');
    puxTrack.selectedPatternId = puxTrack.patterns[0].id;
    puxTrack.patterns[0].measureAssignments[ctx.currentMeasure] = true;

    const coroTrack = makeVoiceTrack(coroTrackId, coroInstIdx !== -1 ? coroInstIdx : 9, ctx.lang === 'fr' ? 'Chœur 1' : 'Coro 1');
    coroTrack.selectedPatternId = coroTrack.patterns[0].id;

    ctx.audioEngine?.loadInstrumentSamples('puxador').catch(console.error);
    ctx.audioEngine?.loadInstrumentSamples('coro').catch(console.error);

    ctx.setTracks((prev: TrackGroup[]) => applyRadii([...prev, toadaBusTrack, puxTrack, coroTrack]));
    return toadaBusId;
  }

  const newTrack: TrackGroup = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    instrumentIdx: instIdx,
    patterns: [{
      id: Date.now() + Math.floor(Math.random() * 1000) + 1,
      name: ctx.lang === 'fr' ? 'Motif 1' : 'Padrão 1',
      steps: 16,
      activeSteps: Array(16).fill(0),
      lyrics: Array(16).fill(''),
      notes: Array(16).fill(''),
      measureAssignments: Array(ctx.totalMeasuresRef.current).fill(true),
      volumes: Array(16).fill(80),
      decays: Array(16).fill(instrumentsConfig[instIdx]?.type === 'voice' ? 10 : 100),
      microtimings: Array(16).fill(0),
    }],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 }
  };
  newTrack.selectedPatternId = newTrack.patterns[0].id;
  newTrack.patterns[0].measureAssignments[ctx.currentMeasure] = true;

  ctx.setTracks((prev: TrackGroup[]) => applyRadii([...prev, newTrack]));
  return newTrack.id;
}
