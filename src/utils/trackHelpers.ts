import { instrumentsConfig } from '../data';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';

function resolveNextParentTrack(current: any, allTracks: any[]): any | undefined {
  const nextId = current.busId || current.linkedToTrackId;
  let parent = nextId ? allTracks.find((t: any) => String(t.id) === String(nextId)) : undefined;
  if (!parent && current.linkedToTrackId) {
    parent = allTracks.find(
      (t: any) =>
        t.id !== current.id &&
        t.linkedToTrackId &&
        String(t.linkedToTrackId) === String(current.linkedToTrackId) &&
        (t.isLinkMaster || t.busId)
    );
  }
  if (!parent && !current.isBusFolder && current.instrumentIdx === 4) {
    const cxBus = allTracks.find(
      (b: any) => b.isBusFolder && (b.customName?.toLowerCase().includes('caixa') || b.instrumentIdx === 3)
    );
    const hasLinkedCx =
      Boolean(current.linkedToTrackId) ||
      (cxBus &&
        allTracks.some(
          (c: any) =>
            !c.isBusFolder &&
            c.instrumentIdx === 3 &&
            c.isLinkMaster &&
            (String(c.busId) === String(cxBus.id) || String(c.linkedToTrackId) === String(cxBus.id))
        ));
    if (cxBus && hasLinkedCx) parent = cxBus;
  }
  return parent;
}

export function getTopParentBusId(track: any, allTracks: any[]): string | null {
  if (!track) return null;
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

    current = resolveNextParentTrack(current, allTracks);
  }

  return null;
}

export function getRootLinkGroupId(track: any, allTracks: any[]): string | null {
  if (!track) return null;
  let current = track;
  let rootId: string | null = track.isLinkFolder ? String(track.id) : null;
  const visited = new Set<string>();

  while (current) {
    const curId = String(current.id);
    if (visited.has(curId)) break;
    visited.add(curId);

    if (current.isLinkFolder) rootId = curId;
    const parent = resolveNextParentTrack(current, allTracks);
    if (!parent) break;
    if (current.linkedToTrackId || parent.isLinkFolder || parent.isLinkMaster) {
      rootId = String(parent.id);
    }
    current = parent;
  }

  if (!rootId) {
    const hasLinkedChild = allTracks.some(
      (o: any) =>
        o.id !== track.id &&
        ((o.linkedToTrackId && String(o.linkedToTrackId) === String(track.id)) ||
          (track.isLinkFolder && o.busId && String(o.busId) === String(track.id)))
    );
    if (hasLinkedChild) return String(track.id);
  }

  return rootId;
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

  if (track.isBusFolder && track.isLinkFolder) return `${getPluralName(baseName)}`;
  if (track.isLinkMaster) return `${getPluralName(baseName)}`;
  if (track.isBusFolder) return track.customName || 'Bus';

  const sameInstTracks = allTracks.filter(
    (t: any) => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === inst.id
  );

  if (sameInstTracks.length > 1) {
    sameInstTracks.sort((a, b) => a.id - b.id);
    const index = sameInstTracks.findIndex((t: any) => t.id === track.id);
    if (index !== -1) return `${baseName} n°${index + 1}`;
  }

  return baseName;
}
