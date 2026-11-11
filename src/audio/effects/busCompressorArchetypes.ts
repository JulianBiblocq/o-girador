/**
 * busCompressorArchetypes.ts — 4 Archétypes Acoustiques Maracatu & Auto-Détection de Bus (< 125 lignes).
 */
import { instrumentsConfig } from '../../data';
import type {
  BusCompressorArchetypeId,
  BusCompressorPresetArchetypeId,
  BusCompressorSettings,
} from './busCompressorTypes';

type ArchetypeParams = Omit<BusCompressorSettings, 'enabled' | 'archetype'>;

export const BUS_COMPRESSOR_ARCHETYPES: Readonly<Record<BusCompressorPresetArchetypeId, Readonly<ArchetypeParams>>> = {
  /** Cola Alfaias */
  alfaias_glue: { thresholdDb: -16, ratio: 3.0, attackMs: 22, releaseMs: 110, kneeDb: 6, sidechainHpfHz: 115, makeupDb: 1.5, mixPct: 75 },
  /** Tapete Caixas */
  caixas_carpet: { thresholdDb: -18, ratio: 4.0, attackMs: 8, releaseMs: 65, kneeDb: 6, sidechainHpfHz: 140, makeupDb: 2.0, mixPct: 75 },
  /** Controle Sementes */
  sementes_control: { thresholdDb: -17, ratio: 3.5, attackMs: 3, releaseMs: 50, kneeDb: 6, sidechainHpfHz: 220, makeupDb: 1.0, mixPct: 70 },
  /** Presença Toada */
  toada_presence: { thresholdDb: -18, ratio: 3.0, attackMs: 10, releaseMs: 140, kneeDb: 6, sidechainHpfHz: 90, makeupDb: 2.0, mixPct: 85 },
};

export const BUS_COMPRESSOR_ARCHETYPE_LABELS: Readonly<Record<BusCompressorPresetArchetypeId, string>> = {
  alfaias_glue: 'Cola Alfaias',
  caixas_carpet: 'Tapete Caixas',
  sementes_control: 'Controle Sementes',
  toada_presence: 'Presença Toada',
};

export function buildArchetypeSettings(archetype: BusCompressorPresetArchetypeId, enabled = true): BusCompressorSettings {
  return { enabled, archetype, ...BUS_COMPRESSOR_ARCHETYPES[archetype] };
}

interface ArchetypeTrackLike {
  id: number | string;
  instrumentIdx?: number;
  customName?: string;
  busId?: string | number;
  linkedToTrackId?: string | number;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
}

const KEYWORD_RULES: ReadonlyArray<readonly [BusCompressorPresetArchetypeId, RegExp]> = [
  ['toada_presence', /toada|puxador|coro|voz|vox|voix|vocal/],
  ['caixas_carpet', /caixa|tarol|snare/],
  ['sementes_control', /agbe|mineiro|gongue|apito|semente|shaker|ferro/],
  ['alfaias_glue', /alfaia|marcante|meiao|repique|bombo|zabumba/],
];

function normalizeLabel(raw: string): string {
  return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function classifyLabel(raw: string | undefined): BusCompressorPresetArchetypeId | null {
  if (!raw) return null;
  const label = normalizeLabel(raw);
  for (const [archetype, rx] of KEYWORD_RULES) if (rx.test(label)) return archetype;
  return null;
}

function classifyInstrument(track: ArchetypeTrackLike): BusCompressorPresetArchetypeId | null {
  const inst = typeof track.instrumentIdx === 'number' ? instrumentsConfig[track.instrumentIdx] : undefined;
  if (!inst) return null;
  if (inst.type === 'voice') return 'toada_presence';
  return classifyLabel(inst.id);
}

function isToadaGroup(bus: ArchetypeTrackLike): boolean {
  return Boolean(bus.isBusFolder) && (bus.customName === 'Toada' || String(bus.id) === 'toada');
}

function collectDescendantLeaves(bus: ArchetypeTrackLike, allTracks: ArchetypeTrackLike[]): ArchetypeTrackLike[] {
  const leaves: ArchetypeTrackLike[] = [];
  const visited = new Set<string>([String(bus.id)]);
  const queue: string[] = [String(bus.id)];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const t of allTracks) {
      const tid = String(t.id);
      if (visited.has(tid)) continue;
      if (String(t.busId ?? '') !== parentId && String(t.linkedToTrackId ?? '') !== parentId) continue;
      visited.add(tid);
      if (t.isBusFolder || t.isLinkFolder) queue.push(tid);
      else leaves.push(t);
    }
  }
  return leaves;
}

/**
 * Inspecte le rôle / nom du bus puis vote à la majorité sur les instruments de ses pistes enfants.
 * Repli : `alfaias_glue`.
 */
export function detectBusArchetypeForGroup(
  busTrack: ArchetypeTrackLike,
  allTracks: ArchetypeTrackLike[]
): Exclude<BusCompressorArchetypeId, 'custom'> {
  if (isToadaGroup(busTrack)) return 'toada_presence';
  const byName = classifyLabel(busTrack.customName);
  if (byName) return byName;

  const votes: Record<BusCompressorPresetArchetypeId, number> = {
    alfaias_glue: 0, caixas_carpet: 0, sementes_control: 0, toada_presence: 0,
  };
  for (const leaf of collectDescendantLeaves(busTrack, allTracks)) {
    const cls = classifyInstrument(leaf) ?? classifyLabel(leaf.customName);
    if (cls) votes[cls] += 1;
  }
  let best: BusCompressorPresetArchetypeId = 'alfaias_glue';
  let bestCount = 0;
  for (const key of Object.keys(votes) as BusCompressorPresetArchetypeId[]) {
    if (votes[key] > bestCount) { best = key; bestCount = votes[key]; }
  }
  return best;
}
