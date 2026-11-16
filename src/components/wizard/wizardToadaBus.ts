import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';
import { allocWizardId } from './wizardPatternBuilder';

export function createToadaBusAndTracks(
  wizardLang: Language,
  totalMeasures = 1,
  stepsPerMeasure = 16
): TrackGroup[] {
  const toadaIdx = instrumentsConfig.findIndex((c) => c.id === 'toada');
  const puxInstIdx = instrumentsConfig.findIndex((c) => c.id === 'puxador');
  const coroInstIdx = instrumentsConfig.findIndex((c) => c.id === 'coro');
  if (toadaIdx === -1) return [];

  const toadaBusId = allocWizardId();
  const puxTrackId = allocWizardId();
  const coroTrackId = allocWizardId();
  const puxPtnId = allocWizardId();
  const coroPtnId = allocWizardId();
  const safeBars = Math.max(1, totalMeasures);
  const safeSteps = Math.max(8, stepsPerMeasure);

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
        id: puxPtnId,
        name: wizardLang === 'fr' ? 'Solo 1' : 'Solista 1',
        steps: safeSteps,
        activeSteps: Array(safeSteps).fill(0),
        lyrics: Array(safeSteps).fill(''),
        notes: Array(safeSteps).fill(''),
        measureAssignments: Array(safeBars).fill(true),
        volumes: Array(safeSteps).fill(80),
        decays: Array(safeSteps).fill(10),
        microtimings: Array(safeSteps).fill(0),
      },
    ],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: puxPtnId,
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
        id: coroPtnId,
        name: wizardLang === 'fr' ? 'Chœur 1' : 'Coro 1',
        steps: safeSteps,
        activeSteps: Array(safeSteps).fill(0),
        lyrics: Array(safeSteps).fill(''),
        notes: Array(safeSteps).fill(''),
        measureAssignments: Array(safeBars).fill(false),
        volumes: Array(safeSteps).fill(80),
        decays: Array(safeSteps).fill(10),
        microtimings: Array(safeSteps).fill(0),
      },
    ],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: coroPtnId,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  if (audioEngine) {
    audioEngine.loadInstrumentSamples('puxador').catch(() => {});
    audioEngine.loadInstrumentSamples('coro').catch(() => {});
  }

  return [toadaBusTrack, puxTrack, coroTrack];
}
