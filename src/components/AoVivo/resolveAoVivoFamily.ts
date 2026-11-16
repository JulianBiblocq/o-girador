import { instrumentsConfig } from '../../data';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';

export type AoVivoResolvedFamily = 'alfaia' | 'caixa' | 'tarol' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';

function stripAccentsLower(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const EXCLUDED_IDS = new Set(['voix', 'voz', 'vozes', 'puxador', 'coro', 'toada', 'apito', '']);

export function normalizeAoVivoFamily(raw: unknown): AoVivoResolvedFamily | null {
  const id = stripAccentsLower(raw);
  if (EXCLUDED_IDS.has(id)) return null;
  if (['marcante', 'meiao', 'repique', 'alfaia', 'alfaia_grave', 'alfaia_medio', 'alfaia_agudo', 'alfaias'].includes(id)) return 'alfaia';
  if (['caixa', 'caixas', 'caixa_guerra'].includes(id)) return 'caixa';
  if (id === 'tarol') return 'tarol';
  if (['gongue', 'agogo'].includes(id)) return 'gongue';
  if (['timbal', 'timbau', 'atabaque'].includes(id)) return 'timbal';
  if (['agbe', 'xequere', 'shekere'].includes(id)) return 'agbe';
  if (['mineiro', 'ganza'].includes(id)) return 'mineiro';
  return null;
}

function classifyLabelHint(rawLabel: unknown): AoVivoResolvedFamily | 'excluded' | null {
  const clean = stripAccentsLower(rawLabel).replace(/\s*\([^)]*\)/g, ' ').replace(/^\d+[.\s-]+/, '').trim();
  if (!clean) return null;
  const direct = normalizeAoVivoFamily(clean);
  if (direct) return direct;
  if (/\b(voix|voz|vozes|toada|puxador|coro|apito)\b/.test(clean)) return 'excluded';
  if (/\bmineiro|ganza\b/.test(clean)) return 'mineiro';
  if (/\bagbe|xequere\b/.test(clean)) return 'agbe';
  if (/\btimbal|timbau\b/.test(clean)) return 'timbal';
  if (/\bgongue|agogo\b/.test(clean)) return 'gongue';
  if (/\btarol\b/.test(clean)) return 'tarol';
  if (/\bcaixa|caixas\b/.test(clean)) return 'caixa';
  if (/\bmarcante|meiao|repique|alfaia|alfaias\b/.test(clean)) return 'alfaia';
  return null;
}

export function resolveTrackAoVivoFamily(
  track: any,
  allTracks: any[]
): { resolvedTrack: any | null; family: AoVivoResolvedFamily | null; instId: string | null } {
  if (!track) return { resolvedTrack: null, family: null, instId: null };
  const labelHint = classifyLabelHint(track.customName ?? track.name);

  if (track.isBusFolder || track.isLinkFolder) {
    if (labelHint === 'excluded' || String(track.id).toLowerCase() === 'toada') {
      return { resolvedTrack: null, family: null, instId: null };
    }
    const children = (allTracks || []).filter(
      (t: any) => !t.isBusFolder && !t.isLinkFolder && (String(t.linkedToTrackId) === String(track.id) || String(t.busId) === String(track.id))
    );
    const child = children.find((t: any) => t.isLinkMaster === true) || children[0] || resolveMasterTrack(track.id, allTracks || []);
    if (child && child.id !== track.id && !child.isBusFolder && !child.isLinkFolder) {
      return resolveTrackAoVivoFamily(child, allTracks);
    }
    const busFam = labelHint || normalizeAoVivoFamily(instrumentsConfig[track.instrumentIdx]?.id);
    if (!busFam) return { resolvedTrack: null, family: null, instId: null };
    return { resolvedTrack: track, family: busFam, instId: busFam === 'alfaia' ? 'marcante' : busFam };
  }

  if (labelHint === 'excluded') return { resolvedTrack: null, family: null, instId: null };

  const cfgId = track.instrumentIdx !== undefined ? instrumentsConfig[track.instrumentIdx]?.id : undefined;
  const explicitFam = normalizeAoVivoFamily(track.instrumentId) ?? normalizeAoVivoFamily(track.roleId);
  const cfgFam = normalizeAoVivoFamily(cfgId);
  const family = explicitFam ?? (track.instrumentIdx === 0 && labelHint && labelHint !== 'alfaia' ? labelHint : cfgFam) ?? labelHint;

  if (!family) return { resolvedTrack: null, family: null, instId: null };
  const normCfg = stripAccentsLower(cfgId);
  const instId = family === 'alfaia' ? (['marcante', 'meiao', 'repique'].includes(normCfg) ? normCfg : 'marcante') : family;
  return { resolvedTrack: track, family, instId };
}

export function findTrackForAoVivoFamily(allTracks: any[], fam: AoVivoResolvedFamily): any | undefined {
  return (allTracks || []).find((t: any) => !t.isBusFolder && !t.isLinkFolder && resolveTrackAoVivoFamily(t, allTracks).family === fam);
}

export function resolveActiveAoVivoContext(
  activeAoVivoTrackId: string | number | null,
  allTracks: any[],
  labPreviewFamily: AoVivoResolvedFamily | null
): { resolvedTrack: any | null; family: AoVivoResolvedFamily | null; instId: string | null; isSyntheticPreview: boolean } {
  const rawTrack = activeAoVivoTrackId !== null
    ? (allTracks || []).find((t: any) => t.id === Number(activeAoVivoTrackId) || String(t.id) === String(activeAoVivoTrackId))
    : null;
  const base = resolveTrackAoVivoFamily(rawTrack, allTracks);
  if (!labPreviewFamily) return { ...base, isSyntheticPreview: false };
  if (base.family === labPreviewFamily && base.resolvedTrack) return { ...base, isSyntheticPreview: false };
  const match = findTrackForAoVivoFamily(allTracks, labPreviewFamily);
  if (match) return { ...resolveTrackAoVivoFamily(match, allTracks), isSyntheticPreview: false };
  return { resolvedTrack: null, family: labPreviewFamily, instId: labPreviewFamily === 'alfaia' ? 'marcante' : labPreviewFamily, isSyntheticPreview: true };
}

export function syncAoVivoOnTrackSwitch(
  targetTrackId: number | null,
  state: { activeAoVivoTrackId: number | null; tracks: any[] }
): { activeAoVivoTrackId?: number } {
  if (targetTrackId === null || state.activeAoVivoTrackId === null) return {};
  const trk = (state.tracks || []).find((t: any) => t.id === targetTrackId);
  const { resolvedTrack, family } = resolveTrackAoVivoFamily(trk, state.tracks || []);
  return family && resolvedTrack ? { activeAoVivoTrackId: resolvedTrack.id } : {};
}
