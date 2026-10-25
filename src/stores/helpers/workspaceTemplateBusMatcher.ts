import { TrackGroup, WorkspaceTemplateTrack } from '../../types';

export type InstrumentFamily = 'alfaias' | 'caixas' | 'sementes' | 'vozes' | 'other';

export function getBusFamily(
  bus: { customName?: string; id: number; instrumentIdx?: number },
  allTracks: any[],
  config: any[]
): InstrumentFamily {
  const name = (bus.customName || '').trim().toLowerCase();
  if (name.includes('alfaia') || name === 'al' || name === 'mc' || name === 'me' || name === 'rp') return 'alfaias';
  if (name.includes('caixa') || name.includes('tarol') || name === 'cx' || name === 'tr') return 'caixas';
  if (name.includes('semente') || name.includes('agbe') || name.includes('mineiro') || name === 'ab' || name === 'mi') return 'sementes';
  if (name.includes('voz') || name.includes('vozes') || name.includes('vocal') || name.includes('toada') || name.includes('coro') || name.includes('puxador')) return 'vozes';

  const children = allTracks.filter((t) => !t.isBusFolder && (String(t.busId) === String(bus.id) || String(t.linkedToTrackId) === String(bus.id)));
  for (const c of children) {
    const instId = config[c.instrumentIdx]?.id || '';
    if (['marcante', 'meiao', 'repique'].includes(instId) || [0, 1, 2].includes(c.instrumentIdx)) return 'alfaias';
    if (['caixa', 'tarol'].includes(instId) || [3, 4].includes(c.instrumentIdx)) return 'caixas';
    if (['agbe', 'mineiro'].includes(instId) || [6, 7].includes(c.instrumentIdx)) return 'sementes';
    if (['puxador', 'coro', 'toada'].includes(instId) || [10, 11, 12].includes(c.instrumentIdx)) return 'vozes';
  }

  if (bus.instrumentIdx !== undefined) {
    if ([0, 1, 2].includes(bus.instrumentIdx)) return 'alfaias';
    if ([3, 4].includes(bus.instrumentIdx)) return 'caixas';
    if ([6, 7].includes(bus.instrumentIdx)) return 'sementes';
    if ([10, 11, 12].includes(bus.instrumentIdx)) return 'vozes';
  }

  return 'other';
}

export function findMatchingBusForTemplate(
  tplBus: WorkspaceTemplateTrack,
  songBusFolders: TrackGroup[],
  matchedBusSongIds: Set<number>,
  tplTracks: WorkspaceTemplateTrack[],
  songTracks: TrackGroup[],
  config: any[]
): TrackGroup | undefined {
  const tplName = (tplBus.customName || '').trim().toLowerCase();
  const tplFam = getBusFamily(tplBus, tplTracks, config);

  const nameMatch = songBusFolders.find(
    (sb) => !matchedBusSongIds.has(sb.id) && sb.customName && sb.customName.trim().toLowerCase() === tplName
  );
  if (nameMatch) return nameMatch;

  if (tplFam !== 'other') {
    const famMatch = songBusFolders.find((sb) => {
      if (matchedBusSongIds.has(sb.id)) return false;
      const sbFam = getBusFamily(sb, songTracks, config);
      return sbFam === tplFam;
    });
    if (famMatch) return famMatch;
  }

  return undefined;
}
