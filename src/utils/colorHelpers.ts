export { getTopParentBusId, getTrackDisplayName } from './trackHelpers';

/**
 * Retourne la couleur pure du coup fort principal de l'instrument sur la Roda
 * ('1' / 'D' / 'G' / 'P' / 'W' dans inst.colors), sans jamais faire de moyenne RGB.
 * Conserve la distinction Puxador (#c25e38) / Coro (#2a9d8f).
 */
export function getInstrumentPrimaryStrongColor(inst?: any, track?: any): string {
  const customLower = (track?.customName || '').toLowerCase();
  const instId = (inst?.id || '').toLowerCase();

  if (instId === 'coro' || customLower.includes('coro')) return '#2a9d8f';
  if (
    instId === 'puxador' ||
    instId === 'toada' ||
    customLower.includes('puxador') ||
    customLower === 'toada' ||
    String(track?.id) === 'toada'
  ) {
    return '#c25e38';
  }

  const colors = inst?.colors;
  if (colors) {
    if (instId === 'mineiro' && colors['P']) return colors['P'];
    if (instId === 'gongue' && colors['G']) return colors['G'];
    if (instId === 'apito' && colors['W']) return colors['W'];
    if (instId === 'timbal' && (colors['A'] || colors['G'])) return colors['A'] || colors['G'];
    const strong = colors['1'] || colors['D'] || colors['G'] || colors['P'] || colors['W'];
    if (strong) return strong;
  }

  return inst?.color || '#8b2a1a';
}

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

  const distinctColors: string[] = [];
  children.forEach((t: any) => {
    const inst = instrumentsConfig[t.instrumentIdx];
    const c = getInstrumentPrimaryStrongColor(inst, t);
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
 * Retourne la couleur vive du coup fort du Maître pour un groupe Track-Linking,
 * ou la couleur vive du premier membre pour un Bus Audio.
 */
export function getBusColor(busId: string, tracks: any[], instrumentsConfig: any[]): string {
  const children = collectIndividualTracks(busId, tracks);
  const master = children.find((t: any) => Boolean(t.isLinkMaster)) || children[0];
  if (master) {
    return getInstrumentPrimaryStrongColor(instrumentsConfig[master.instrumentIdx], master);
  }
  return '#8b2a1a';
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
  return (inst?.colors && inst.colors[visualState]) || getInstrumentPrimaryStrongColor(inst, target);
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
