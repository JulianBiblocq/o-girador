/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { instrumentsConfig } from '../data';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';

export function getTopParentBusId(track: any, allTracks: any[]): string | null {
  if (track.isBusFolder && !track.isLinkFolder) {
    return String(track.id);
  }

  let current = track;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(String(current.id))) break;
    visited.add(String(current.id));

    if (current.isBusFolder && !current.isLinkFolder) {
      return String(current.id);
    }

    const nextParentId = current.busId || current.linkedToTrackId;
    if (nextParentId) {
      current = allTracks.find((t: any) => String(t.id) === String(nextParentId));
    } else {
      break;
    }
  }

  return null;
}

function getPluralName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('alfaia')) return 'Alfaias';
  if (lower.includes('caixa')) return 'Caixas';
  if (lower.includes('tarol')) return 'Tarols';
  if (lower.includes('agbe') || lower.includes('agbê')) return 'Agbês';
  if (lower.includes('mineiro')) return 'Mineiros';
  if (lower.includes('timbal')) return 'Timbais';
  if (lower.includes('gongue') || lower.includes('gonguê')) return 'Gonguês';
  if (lower.includes('marcante')) return 'Marcantes';
  if (lower.includes('meião') || lower.includes('meiao')) return 'Meiões';
  if (lower.includes('repique')) return 'Repiques';
  if (lower.endsWith('s')) return name;
  return `${name}s`;
}

export function getTrackDisplayName(track: any, allTracks: any[]): string {
  if (track.customName) return track.customName;
  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return 'Instrument';

  const baseName = useNomenclatureStore.getState().getInstrumentLabel(track.instrumentIdx);

  if (track.isBusFolder && track.isLinkFolder) return `🔗 ${getPluralName(baseName)}`;
  if (track.isLinkMaster) return `🔗 ${getPluralName(baseName)}`;
  if (track.isBusFolder) return track.customName || 'Bus';

  const sameInstTracks = allTracks.filter((t: any) =>
    !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === inst.id
  );

  if (sameInstTracks.length > 1) {
    sameInstTracks.sort((a, b) => a.id - b.id);
    const index = sameInstTracks.findIndex((t: any) => t.id === track.id);
    if (index !== -1) return `${baseName} n°${index + 1}`;
  }

  return baseName;
}
