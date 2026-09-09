import { instrumentsConfig } from '../data';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';

/**
 * Calculates the average RGB color of all child tracks inside a bus
 * to dynamically colorize the bus connection outlines.
 */
export function getBusColor(busId: string, tracks: any[], instrumentsConfig: any[]): string {
  const visited = new Set<string>();

  const collectIndividualTracks = (currentId: string): any[] => {
    if (visited.has(currentId)) return [];
    visited.add(currentId);

    const directChildren = tracks.filter((t: any) =>
      String(t.busId) === String(currentId) || String(t.linkedToTrackId) === String(currentId)
    );

    let results: any[] = [];
    directChildren.forEach((t: any) => {
      if (!t.isBusFolder) {
        results.push(t);
      } else {
        results = results.concat(collectIndividualTracks(String(t.id)));
      }
    });
    return results;
  };

  const children = collectIndividualTracks(busId);

  if (children.length === 0) return '#bdc3c7';

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  children.forEach((t: any) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const colorHex = inst?.color || '#bdc3c7';
    const hex = colorHex.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }
  });

  if (count === 0) return '#bdc3c7';

  const rAvg = Math.round(rSum / count).toString(16).padStart(2, '0');
  const gAvg = Math.round(gSum / count).toString(16).padStart(2, '0');
  const bAvg = Math.round(bSum / count).toString(16).padStart(2, '0');

  return `#${rAvg}${gAvg}${bAvg}`;
}

export function getBusNoteColor(busId: string, visualState: string, tracks: any[], instrumentsConfig: any[]): string {
  const visited = new Set<string>();

  const collectIndividualTracks = (currentId: string): any[] => {
    if (visited.has(currentId)) return [];
    visited.add(currentId);

    const directChildren = tracks.filter((t: any) =>
      String(t.busId) === String(currentId) || String(t.linkedToTrackId) === String(currentId)
    );

    let results: any[] = [];
    directChildren.forEach((t: any) => {
      if (!t.isBusFolder) {
        results.push(t);
      } else {
        results = results.concat(collectIndividualTracks(String(t.id)));
      }
    });
    return results;
  };

  const children = collectIndividualTracks(busId);

  if (children.length === 0) return '#bdc3c7';

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  children.forEach((t: any) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const colorHex = (inst?.colors && inst.colors[visualState]) || inst?.color || '#bdc3c7';
    const hex = colorHex.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }
  });

  if (count === 0) return '#bdc3c7';

  const rAvg = Math.round(rSum / count).toString(16).padStart(2, '0');
  const gAvg = Math.round(gSum / count).toString(16).padStart(2, '0');
  const bAvg = Math.round(bSum / count).toString(16).padStart(2, '0');

  return `#${rAvg}${gAvg}${bAvg}`;
}

export function getContrastColor(hexcolor: string): string {
  if (!hexcolor || hexcolor === 'transparent') return '#1a1a1a';
  const hex = hexcolor.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? '#1a1a1a' : '#f4ecd8';
    }
  }
  return '#1a1a1a';
}

export function getTopParentBusId(track: any, allTracks: any[]): string | null {
  // If it's a root parent bus (isBusFolder && !isLinkFolder), it's its own root bus
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

export function getTrackDisplayName(track: any, allTracks: any[]): string {
  if (track.customName) return track.customName;
  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return 'Instrument';

  // Base instrument name resolved dynamically (respecting association custom nomenclature)
  const baseName = useNomenclatureStore.getState().getInstrumentLabel(track.instrumentIdx);

  if (track.isBusFolder && track.isLinkFolder) {
    return `🔗 ${getPluralName(baseName)}`;
  }
  if (track.isLinkMaster) {
    return `🔗 ${getPluralName(baseName)}`;
  }
  if (track.isBusFolder) {
    return track.customName || 'Bus';
  }

  // Trouver toutes les pistes d'instrument physiques (non-bus) du même type
  const sameInstTracks = allTracks.filter((t: any) => 
    !t.isBusFolder && 
    instrumentsConfig[t.instrumentIdx]?.id === inst.id
  );

  if (sameInstTracks.length > 1) {
    sameInstTracks.sort((a, b) => a.id - b.id);
    const index = sameInstTracks.findIndex((t: any) => t.id === track.id);
    if (index !== -1) {
      return `${baseName} n°${index + 1}`;
    }
  }

  return baseName;
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
