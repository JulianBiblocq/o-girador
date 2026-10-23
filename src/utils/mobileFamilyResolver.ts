/**
 * Résolveur universel des familles d'instruments pour le Mode Danse (< 120 lignes).
 */
import { instrumentsConfig } from '../data';

const FAMILY_INSTRUMENTS: Record<string, string[]> = {
  alfaias: ['alfaia', 'marcante', 'meiao', 'repique'],
  caixas: ['caixa', 'tarol'],
  timbal: ['timbal'],
  gongue: ['gongue'],
  sementes: ['agbe', 'mineiro'],
  agbe: ['agbe', 'mineiro'],
  toada: ['toada', 'puxador', 'coro'],
};

export function getFamilyTracks(tracks: any[] = [], familyId: string): any[] {
  const normId = familyId.toLowerCase() === 'agbe' ? 'sementes' : familyId.toLowerCase();
  const validInstIds = FAMILY_INSTRUMENTS[normId] || [];

  const directTracks = tracks.filter((t) => {
    const instId = instrumentsConfig[t.instrumentIdx]?.id || '';
    const instType = instrumentsConfig[t.instrumentIdx]?.type || '';
    if (validInstIds.includes(instId)) return true;
    if (normId === 'toada' && (instType === 'voice' || t.isVocal)) return true;
    const name = (t.customName || '').toLowerCase();
    if (normId === 'alfaias' && name.includes('alfaia')) return true;
    if (normId === 'caixas' && (name.includes('caixa') || name.includes('tarol'))) return true;
    if (normId === 'sementes' && (name.includes('semente') || name.includes('agb') || name.includes('mineiro'))) return true;
    if (normId === 'toada' && (name.includes('toada') || name.includes('voz') || name.includes('voix'))) return true;
    return false;
  });

  const busIds = new Set(directTracks.map((t) => t.busId).filter(Boolean));
  const busTracks = tracks.filter((t) => busIds.has(String(t.id)));

  const allMap = new Map<number, any>();
  [...directTracks, ...busTracks].forEach((t) => allMap.set(t.id, t));
  return Array.from(allMap.values());
}

export function isFamilyActiveInSong(tracks: any[] = [], familyId: string): boolean {
  const famTracks = getFamilyTracks(tracks, familyId);
  const playableTracks = famTracks.filter((t) => !t.isHidden && !t.isBusFolder);
  if (playableTracks.length === 0) return false;

  const normId = familyId.toLowerCase() === 'agbe' ? 'sementes' : familyId.toLowerCase();

  return playableTracks.some((t) => {
    const patterns = t.patterns || [];
    if (patterns.length === 0) return false;

    const assigned = patterns.filter((p: any) => p.measureAssignments?.some(Boolean));
    const activePool = assigned.length > 0 ? assigned : patterns;

    if (normId === 'toada') {
      return activePool.some((p: any) =>
        p.hasVocalAudio || p.vocalAudioUrl || p.vocalAudioData ||
        p.notes?.some((n: any) => n && n !== '-' && n !== '') ||
        p.lyrics?.some((l: any) => l && l.trim() && l.trim() !== '-') ||
        p.activeSteps?.some((s: any) => s !== 0 && s !== '0' && s !== '')
      );
    }

    return activePool.some((p: any) =>
      p.activeSteps?.some((s: any) => s !== 0 && s !== '0' && s !== '' && s !== null && s !== undefined)
    );
  });
}

export function getFamilyVolume(tracks: any[] = [], familyId: string): number {
  const famTracks = getFamilyTracks(tracks, familyId);
  if (famTracks.length === 0) return 75;
  const busTrack = famTracks.find((t) => t.isBusFolder);
  if (busTrack && typeof busTrack.volumeVal === 'number') return busTrack.volumeVal;
  const leafTracks = famTracks.filter((t) => !t.isBusFolder);
  if (leafTracks.length === 0) return 75;
  return Math.round(leafTracks.reduce((acc, t) => acc + (t.volumeVal ?? 75), 0) / leafTracks.length);
}

export function applyFamilyMute(tracks: any[] = [], familyId: string, isMute: boolean): any[] {
  const famTrackIds = new Set(getFamilyTracks(tracks, familyId).map((t) => t.id));
  return tracks.map((t) => (famTrackIds.has(t.id) ? { ...t, isMute } : t));
}

export function applyFamilySolo(tracks: any[] = [], familyId: string, isSolo: boolean): any[] {
  const famTrackIds = new Set(getFamilyTracks(tracks, familyId).filter((t) => !t.isBusFolder).map((t) => t.id));
  return tracks.map((t) => (famTrackIds.has(t.id) ? { ...t, isSolo } : t));
}

export function applyFamilyVolume(
  tracks: any[] = [],
  familyId: string,
  targetVolume: number,
  handleTrackVolumeChange: (trackId: number, vol: number) => void
): void {
  const famTracks = getFamilyTracks(tracks, familyId);
  if (famTracks.length === 0) return;
  const busTrack = famTracks.find((t) => t.isBusFolder);
  if (busTrack) {
    handleTrackVolumeChange(busTrack.id, targetVolume);
    return;
  }
  famTracks.forEach((t) => handleTrackVolumeChange(t.id, targetVolume));
}
