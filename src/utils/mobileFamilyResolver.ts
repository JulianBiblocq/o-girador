/**
 * Résolveur universel des familles d'instruments pour le Mode Danse (< 140 lignes).
 * Ignore à 100 % `isFocusActive`, `focusTrackId`, `referenceTrackId` et `t.isHidden`.
 */
import { instrumentsConfig } from '../data';
import { getAncestorChainBottomUp } from '../stores/helpers/trackHierarchyParentResolver';
import { reconcileAncestorsSoloBottomUp } from '../stores/helpers/trackSoloProHelpers';
import { isSlaveTrack, resolveMasterTrack } from './trackMasterResolver';

const FAMILY_INSTRUMENTS: Record<string, string[]> = {
  alfaias: ['alfaia', 'marcante', 'meiao', 'repique'],
  caixas: ['caixa', 'tarol'],
  timbal: ['timbal'],
  gongue: ['gongue'],
  sementes: ['agbe', 'mineiro'],
  agbe: ['agbe', 'mineiro'],
  toada: ['toada', 'puxador', 'coro'],
};

const isStepCellActive = (s: any): boolean =>
  Array.isArray(s) ? s.some(isStepCellActive) : s !== 0 && s !== '0' && s !== '' && s !== null && s !== undefined && s !== '-';

export function getFamilyTracks(tracks: any[] = [], familyId: string): any[] {
  const normId = familyId.toLowerCase() === 'agbe' ? 'sementes' : familyId.toLowerCase();
  const validInstIds = FAMILY_INSTRUMENTS[normId] || [];

  const directTracks = tracks.filter((t) => {
    if (!t) return false;
    const inst = instrumentsConfig[t.instrumentIdx];
    const instId = inst?.id || '', instType = inst?.type || '';
    if (validInstIds.includes(instId) || (normId === 'toada' && (instType === 'voice' || t.isVocal))) return true;
    const name = (t.customName || '').toLowerCase();
    if (normId === 'alfaias' && name.includes('alfaia')) return true;
    if (normId === 'caixas' && (name.includes('caixa') || name.includes('tarol'))) return true;
    if (normId === 'sementes' && (name.includes('semente') || name.includes('agb') || name.includes('mineiro'))) return true;
    return normId === 'toada' && (name.includes('toada') || name.includes('voz') || name.includes('voix'));
  });

  const leafIds = new Set(directTracks.filter((t) => !t.isBusFolder && !t.isLinkFolder).map((t) => String(t.id)));
  const parentIds = new Set([
    ...directTracks.map((t) => t.busId).filter(Boolean).map(String),
    ...directTracks.map((t) => t.linkedToTrackId).filter(Boolean).map(String),
  ]);

  const containerTracks = tracks.filter((t) => {
    if (!t || (!t.isBusFolder && !t.isLinkFolder)) return false;
    const idStr = String(t.id);
    if (!parentIds.has(idStr)) return false;
    const children = tracks.filter((c) => c && !c.isBusFolder && !c.isLinkFolder && (String(c.busId) === idStr || String(c.linkedToTrackId) === idStr));
    return children.length > 0 && children.every((c) => leafIds.has(String(c.id)));
  });

  const allMap = new Map<number, any>();
  [...directTracks, ...containerTracks].forEach((t) => allMap.set(t.id, t));
  return Array.from(allMap.values());
}

export function getFamilyLeafTracks(tracks: any[] = [], familyId: string): any[] {
  return getFamilyTracks(tracks, familyId).filter((t) => !t.isBusFolder && !t.isLinkFolder);
}

export function isFamilyActiveInSong(tracks: any[] = [], familyId: string): boolean {
  const leafTracks = getFamilyLeafTracks(tracks, familyId);
  if (leafTracks.length === 0) return false;
  const normId = familyId.toLowerCase() === 'agbe' ? 'sementes' : familyId.toLowerCase();

  const hasContent = (patterns: any[] = []): boolean => {
    if (patterns.length === 0) return false;
    const assigned = patterns.filter((p: any) => p.measureAssignments?.some(Boolean));
    const pool = assigned.length > 0 ? assigned : patterns;
    if (normId === 'toada') {
      return pool.some((p: any) =>
        p.hasVocalAudio || p.vocalAudioUrl || p.vocalAudioData || p.vocalClip ||
        p.notes?.some((n: any) => n && n !== '-' && n !== '') ||
        p.lyrics?.some((l: any) => l && l.trim() && l.trim() !== '-') ||
        p.activeSteps?.some(isStepCellActive)
      );
    }
    return pool.some((p: any) => p.activeSteps?.some(isStepCellActive));
  };

  return leafTracks.some((t) => {
    if (hasContent(t.patterns || [])) return true;
    if (isSlaveTrack(t, tracks)) {
      const master = resolveMasterTrack(t.id, tracks);
      if (master && hasContent(master.patterns || [])) return true;
    }
    return false;
  });
}

export function isFamilyMuted(tracks: any[] = [], familyId: string): boolean {
  const leafTracks = getFamilyLeafTracks(tracks, familyId);
  return leafTracks.length > 0 && leafTracks.every((t) =>
    Boolean(t.isMute) || getAncestorChainBottomUp(tracks, t.id).some((anc) => Boolean(anc.isMute))
  );
}

export function isFamilySolo(tracks: any[] = [], familyId: string): boolean {
  return getFamilyLeafTracks(tracks, familyId).some((t) => Boolean(t.isSolo));
}

export function getFamilyVolume(tracks: any[] = [], familyId: string): number {
  const famTracks = getFamilyTracks(tracks, familyId);
  if (famTracks.length === 0) return 75;
  const busTrack = famTracks.find((t) => t.isBusFolder);
  if (busTrack && typeof busTrack.volumeVal === 'number') return busTrack.volumeVal;
  const leafTracks = famTracks.filter((t) => !t.isBusFolder && !t.isLinkFolder);
  return leafTracks.length === 0 ? 75 : Math.round(leafTracks.reduce((acc, t) => acc + (t.volumeVal ?? 75), 0) / leafTracks.length);
}

export function applyFamilyMute(tracks: any[] = [], familyId: string, isMute: boolean): any[] {
  const famTracks = getFamilyTracks(tracks, familyId), famIds = new Set(famTracks.map((t) => t.id));
  let updated = tracks.map((t) => famIds.has(t.id) ? (isMute ? { ...t, isMute: true, isSolo: false } : { ...t, isMute: false }) : t);
  famTracks.forEach((t) => { updated = reconcileAncestorsSoloBottomUp(updated, t.id); });
  return updated;
}

export function applyFamilySolo(tracks: any[] = [], familyId: string, isSolo: boolean): any[] {
  const famTracks = getFamilyTracks(tracks, familyId), famIds = new Set(famTracks.map((t) => t.id));
  let updated = tracks.map((t) => famIds.has(t.id) ? (isSolo ? { ...t, isSolo: true, isMute: false } : { ...t, isSolo: false }) : t);
  famTracks.forEach((t) => { updated = reconcileAncestorsSoloBottomUp(updated, t.id); });
  return updated;
}

export function applyFamilyVolume(
  tracks: any[] = [], familyId: string, targetVolume: number,
  handleTrackVolumeChange: (trackId: number, vol: number) => void
): void {
  const famTracks = getFamilyTracks(tracks, familyId);
  if (famTracks.length === 0) return;
  const busTrack = famTracks.find((t) => t.isBusFolder);
  if (busTrack) { handleTrackVolumeChange(busTrack.id, targetVolume); return; }
  famTracks.filter((t) => !t.isLinkFolder).forEach((t) => handleTrackVolumeChange(t.id, targetVolume));
}
