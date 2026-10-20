import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';

export function createToadaBusAndTracks(wizardLang: Language): TrackGroup[] {
  const toadaIdx = instrumentsConfig.findIndex((c) => c.id === 'toada');
  const puxInstIdx = instrumentsConfig.findIndex((c) => c.id === 'puxador');
  const coroInstIdx = instrumentsConfig.findIndex((c) => c.id === 'coro');
  if (toadaIdx === -1) return [];

  const toadaBusId = Date.now() + 80000;
  const puxTrackId = toadaBusId + 1;
  const coroTrackId = toadaBusId + 2;

  const toadaBusTrack: TrackGroup = {
    id: toadaBusId,
    instrumentIdx: toadaIdx,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    isBusFolder: true,
    isFolded: false,
    isSequencerFolded: false,
    customName: 'Toada',
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  const puxTrack: TrackGroup = {
    id: puxTrackId,
    instrumentIdx: puxInstIdx !== -1 ? puxInstIdx : 8,
    busId: String(toadaBusId),
    patterns: [
      {
        id: toadaBusId + 10,
        name: wizardLang === 'fr' ? 'Solo 1' : 'Solista 1',
        steps: 16,
        activeSteps: Array(16).fill(0),
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: [true, false, false, false, false, false, false, false],
        volumes: Array(16).fill(80),
        decays: Array(16).fill(10),
        microtimings: Array(16).fill(0),
      },
    ],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: toadaBusId + 10,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  const coroTrack: TrackGroup = {
    id: coroTrackId,
    instrumentIdx: coroInstIdx !== -1 ? coroInstIdx : 9,
    busId: String(toadaBusId),
    patterns: [
      {
        id: toadaBusId + 20,
        name: wizardLang === 'fr' ? 'Chœur 1' : 'Coro 1',
        steps: 16,
        activeSteps: Array(16).fill(0),
        lyrics: Array(16).fill(''),
        notes: Array(16).fill(''),
        measureAssignments: Array(8).fill(false),
        volumes: Array(16).fill(80),
        decays: Array(16).fill(10),
        microtimings: Array(16).fill(0),
      },
    ],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: toadaBusId + 20,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  if (audioEngine) {
    audioEngine.loadInstrumentSamples('puxador').catch(console.error);
    audioEngine.loadInstrumentSamples('coro').catch(console.error);
  }

  return [toadaBusTrack, puxTrack, coroTrack];
}
