import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

export { createToadaBusAndTracks } from './wizardToadaBus';

export function createSementesBusTrack(tracks: TrackGroup[]): TrackGroup {
  const agbeIdx = instrumentsConfig.findIndex((c) => c.id === 'agbe');
  const sementesBusId = Date.now() + 20000;
  const sementesBusTrack: TrackGroup = {
    id: sementesBusId,
    instrumentIdx: agbeIdx !== -1 ? agbeIdx : 6,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    isBusFolder: true,
    isFolded: false,
    isSequencerFolded: false,
    customName: 'Sementes',
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };
  tracks.forEach((t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    if (instId === 'agbe' || instId === 'mineiro') t.busId = String(sementesBusId);
  });
  return sementesBusTrack;
}

export function createCaixasBusTrack(tracks: TrackGroup[]): TrackGroup {
  const caixaIdx = instrumentsConfig.findIndex((c) => c.id === 'caixa');
  const caixasBusId = Date.now() + 30000;
  const caixasBusTrack: TrackGroup = {
    id: caixasBusId,
    instrumentIdx: caixaIdx !== -1 ? caixaIdx : 3,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    isBusFolder: true,
    isFolded: false,
    isSequencerFolded: false,
    customName: 'Section Caixas',
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };
  tracks.forEach((t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    if (instId === 'caixa' || instId === 'tarol') t.busId = String(caixasBusId);
  });
  return caixasBusTrack;
}
