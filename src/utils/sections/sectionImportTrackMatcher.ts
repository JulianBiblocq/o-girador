import { instrumentsConfig } from '../../data';
import { SavedSectionData, SavedSectionTrack, TrackGroup } from '../../types';
import { getDefaultSignatureTuning } from '../audio/lutherieFactoryPresets';
import { normalizeInstrumentId, resolveTrackInstrumentId } from '../instrumentCompatibility';
import { allocSectionEntityId } from './sectionPatternSliceHelper';

export interface IndexedLeafTrack {
  track: TrackGroup;
  trackArrayIdx: number;
  instrumentId: string;
  occurrenceIndex: number;
}

export interface MissingSectionTrackInfo {
  savedTrack: SavedSectionTrack;
  instrumentId: string;
  occurrenceIndex: number;
  label: string;
}

export function resolveSavedTrackIdentity(st: SavedSectionTrack): { instrumentId: string; instrumentIdx: number } {
  const explicitId = normalizeInstrumentId(st.instrumentId);
  const byIdIdx = explicitId ? instrumentsConfig.findIndex((c) => normalizeInstrumentId(c.id) === explicitId) : -1;
  const safeIdx = byIdIdx >= 0 ? byIdIdx : Math.max(0, st.instrumentIdx ?? 0);
  const instId = explicitId || normalizeInstrumentId(instrumentsConfig[safeIdx]?.id) || 'marcante';
  return { instrumentId: instId, instrumentIdx: safeIdx };
}

export function indexTimelineLeafTracks(tracks: readonly TrackGroup[]): IndexedLeafTrack[] {
  const counts = new Map<string, number>();
  const out: IndexedLeafTrack[] = [];
  tracks.forEach((track, trackArrayIdx) => {
    if (!track || track.isBusFolder || track.isLinkFolder) return;
    const instId = resolveTrackInstrumentId(track, tracks) || normalizeInstrumentId(instrumentsConfig[track.instrumentIdx]?.id);
    if (!instId) return;
    const occ = counts.get(instId) ?? 0;
    counts.set(instId, occ + 1);
    out.push({ track, trackArrayIdx, instrumentId: instId, occurrenceIndex: occ });
  });
  return out;
}

export function inspectSectionTrackMatch(sectionData: SavedSectionData | null | undefined, tracks: readonly TrackGroup[]) {
  if (!sectionData?.tracks?.length) return { matchedCount: 0, missingTracks: [] as MissingSectionTrackInfo[] };
  const leafIndex = indexTimelineLeafTracks(tracks);
  const savedCounts = new Map<string, number>();
  const missingTracks: MissingSectionTrackInfo[] = [];
  let matchedCount = 0;

  for (const st of sectionData.tracks) {
    if ((st as any).isBusFolder || (st as any).isLinkFolder) continue;
    const { instrumentId, instrumentIdx } = resolveSavedTrackIdentity(st);
    const autoOcc = savedCounts.get(instrumentId) ?? 0;
    savedCounts.set(instrumentId, autoOcc + 1);
    const occ = st.occurrenceIndex !== undefined ? st.occurrenceIndex : autoOcc;
    const match = leafIndex.find((lt) => lt.instrumentId === instrumentId && lt.occurrenceIndex === occ);
    if (match) {
      matchedCount++;
    } else {
      const baseName = st.customName || instrumentsConfig[instrumentIdx]?.name || instrumentId;
      const label = occ > 0 && !baseName.includes('n°') ? `${baseName} n°${occ + 1}` : baseName;
      missingTracks.push({ savedTrack: st, instrumentId, occurrenceIndex: occ, label });
    }
  }
  return { matchedCount, missingTracks };
}

function findOrEnsureFamilyBus(tracks: TrackGroup[], instId: string): { busId?: string; insertionIdx: number } {
  const isAlfaia = ['marcante', 'meiao', 'repique'].includes(instId);
  const isCaixa = ['caixa', 'tarol'].includes(instId);
  const isSemente = ['agbe', 'mineiro'].includes(instId);
  const isVoice = instId === 'puxador' || instId === 'coro';

  let bus = tracks.find((t) => {
    if (!t.isBusFolder) return false;
    const nm = normalizeInstrumentId(t.customName);
    if (isAlfaia) return nm.includes('alfaia') || [0, 1, 2].includes(t.instrumentIdx);
    if (isCaixa) return nm.includes('caixa') || nm.includes('tarol') || [3, 4].includes(t.instrumentIdx);
    if (isSemente) return nm.includes('semente') || nm.includes('agbe') || nm.includes('mineiro') || [6, 7].includes(t.instrumentIdx);
    if (isVoice) return nm.includes('toada') || nm.includes('voz') || nm.includes('voix') || t.instrumentIdx === 12;
    return false;
  });

  if (isVoice && !bus) {
    const toadaIdx = instrumentsConfig.findIndex((c) => c.id === 'toada');
    bus = {
      id: allocSectionEntityId(), instrumentIdx: toadaIdx >= 0 ? toadaIdx : 12, customName: 'Toada',
      isBusFolder: true, isSequencerFolded: false, patterns: [], isMute: false, isSolo: false,
      isHidden: false, volumeVal: 75, selectedPatternId: -1, reverbVal: 0, panVal: 0, pan: 0,
      fxSends: { reverb: 0, distortion: 0 },
    };
    tracks.push(bus);
  }

  if (bus) {
    const busIdStr = String(bus.id);
    let lastIdx = tracks.findIndex((t) => t.id === bus!.id);
    tracks.forEach((t, idx) => {
      if (String(t.busId) === busIdStr || String(t.linkedToTrackId) === busIdStr) lastIdx = idx;
    });
    return { busId: busIdStr, insertionIdx: lastIdx + 1 };
  }

  const firstVoiceIdx = tracks.findIndex((t) => {
    const cid = normalizeInstrumentId(instrumentsConfig[t.instrumentIdx]?.id);
    return cid === 'toada' || cid === 'puxador' || cid === 'coro';
  });
  return { busId: undefined, insertionIdx: !isVoice && firstVoiceIdx >= 0 ? firstVoiceIdx : tracks.length };
}

export function instantiateMissingSectionTrack(tracks: TrackGroup[], st: SavedSectionTrack): TrackGroup {
  const { instrumentId, instrumentIdx } = resolveSavedTrackIdentity(st);
  const { busId, insertionIdx } = findOrEnsureFamilyBus(tracks, instrumentId);
  const newTrack: TrackGroup = {
    id: allocSectionEntityId(), instrumentIdx, customName: st.customName,
    ...(busId ? { busId } : {}), patterns: [], isMute: Boolean(st.isMute), isSolo: Boolean(st.isSolo),
    isHidden: false, volumeVal: st.volumeVal ?? 75, selectedPatternId: 0,
    reverbVal: st.reverbVal ?? 0, panVal: st.panVal ?? st.pan ?? 0, pan: st.pan ?? st.panVal ?? 0,
    tuning: st.tuning ?? getDefaultSignatureTuning(instrumentId),
    swingIntensity: st.swingIntensity, balancoPresetId: st.balancoPresetId, balancoAmount: st.balancoAmount,
    fxSends: st.fxSends ? { ...st.fxSends } : { reverb: st.reverbVal ?? 0, distortion: 0 },
  };
  tracks.splice(insertionIdx, 0, newTrack);
  return newTrack;
}
