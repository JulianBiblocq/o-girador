/**
 * Création et liaison d'architecture standard pour le Bus Alfaias (< 75 lignes).
 */

import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';

const ALFAIA_IDS = ['marcante', 'meiao', 'repique'];

export function createAlfaiasBusAndLinking(
  tracks: TrackGroup[],
  firstMarcanteId: string | number | undefined,
  lang: Language
): TrackGroup[] {
  const alfaiaTracks = tracks.filter((t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    return ALFAIA_IDS.includes(instId);
  });

  if (alfaiaTracks.length === 0) return tracks;

  const busId = Date.now() + 15000;
  const busTrack: TrackGroup = {
    id: busId,
    instrumentIdx: 0,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    isBusFolder: true,
    isLinkFolder: false,
    isFolded: false,
    isSequencerFolded: false,
    customName: lang === 'pt' ? 'Seção Alfaias' : 'Section Alfaias',
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  const masterTrack = alfaiaTracks.find((t) => String(t.id) === String(firstMarcanteId)) || alfaiaTracks[0];

  tracks.forEach((t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    if (ALFAIA_IDS.includes(instId)) {
      t.busId = String(busId);
      t.linkedToTrackId = String(busId);
      if (t.id === masterTrack.id) {
        t.isLinkMaster = true;
        t.isHidden = false;
      } else {
        t.isLinkMaster = false;
        t.isHidden = false;
        t.patternOverrides = {};
      }
    }
  });

  const firstAlfaiaIdx = tracks.findIndex((t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id;
    return ALFAIA_IDS.includes(instId);
  });

  const result = [...tracks];
  if (firstAlfaiaIdx !== -1) {
    result.splice(firstAlfaiaIdx, 0, busTrack);
  } else {
    result.unshift(busTrack);
  }

  return result;
}
