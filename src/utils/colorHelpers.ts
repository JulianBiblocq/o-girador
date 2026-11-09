export { getTopParentBusId, getTrackDisplayName } from './trackHelpers';

function collectIndividualTracks(busId: string, tracks: any[]): any[] {
  const visited = new Set<string>();

  const walk = (currentId: string): any[] => {
    if (visited.has(currentId)) return [];
    visited.add(currentId);

    const selfTrack = tracks.find((t: any) => String(t.id) === String(currentId));
    const directChildren = tracks.filter(
      (t: any) =>
        String(t.id) !== String(currentId) &&
        (String(t.busId) === String(currentId) || String(t.linkedToTrackId) === String(currentId))
    );

    let results: any[] = [];
    if (selfTrack && !selfTrack.isBusFolder && !selfTrack.isLinkFolder) {
      results.push(selfTrack);
    }
    directChildren.forEach((t: any) => {
      if (!t.isBusFolder && !t.isLinkFolder) {
        results.push(t);
      } else {
        results = results.concat(walk(String(t.id)));
      }
    });
    return results;
  };

  return walk(busId);
}

export function getBusMemberColors(busId: string, tracks: any[], instrumentsConfig: any[]): string[] {
  const children = collectIndividualTracks(busId, tracks);
  if (children.length === 0) return ['#8b2a1a'];

  const master = children.find((t: any) => Boolean(t.isLinkMaster));
  if (master) {
    const masterInst = instrumentsConfig[master.instrumentIdx];
    return [masterInst?.color || '#8b2a1a'];
  }

  const distinctColors: string[] = [];
  children.forEach((t: any) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const c = inst?.color || '#8b2a1a';
    if (!distinctColors.includes(c)) {
      distinctColors.push(c);
    }
  });

  return distinctColors.length > 0 ? distinctColors : ['#8b2a1a'];
}

export function getBusStripeGradient(
  colors: string[],
  direction: 'to bottom' | 'to right' = 'to bottom'
): string {
  if (!colors || colors.length === 0) return '#8b2a1a';
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  const stops = colors.map((c, idx) => {
    const start = (idx * step).toFixed(1);
    const end = ((idx + 1) * step).toFixed(1);
    return `${c} ${start}%, ${c} ${end}%`;
  });
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

/**
 * Retourne la couleur franche du Maître pour un groupe Track-Linking,
 * ou la couleur franche du premier membre pour un Bus Audio (zéro moyenne RGB).
 */
export function getBusColor(busId: string, tracks: any[], instrumentsConfig: any[]): string {
  const colors = getBusMemberColors(busId, tracks, instrumentsConfig);
  return colors[0] || '#8b2a1a';
}

export function getBusNoteColor(
  busId: string,
  visualState: string,
  tracks: any[],
  instrumentsConfig: any[]
): string {
  const children = collectIndividualTracks(busId, tracks);
  const target = children.find((t: any) => Boolean(t.isLinkMaster)) || children[0];
  if (!target) return '#8b2a1a';
  const inst = instrumentsConfig[target.instrumentIdx];
  return (inst?.colors && inst.colors[visualState]) || inst?.color || '#8b2a1a';
}

export function getContrastColor(hexcolor: string): string {
  if (!hexcolor || hexcolor === 'transparent') return '#1a1a1a';
  const hex = hexcolor.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? '#1a1a1a' : '#f4ecd8';
    }
  }
  return '#1a1a1a';
}
