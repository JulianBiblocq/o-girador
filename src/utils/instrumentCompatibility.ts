import { instrumentsConfig } from '../data';

export const COMPATIBLE_FAMILIES: Record<string, string[]> = {
  alfaias: [
    'marcante', 'meiao', 'repique', 'alfaia',
    'alfaia_grave', 'alfaia_medio', 'alfaia_agudo', 'alfaia_meiao', 'alfaia_replica',
  ],
  caixas: ['caixa', 'tarol'],
  voices: ['puxador', 'coro'],
};

export const SOLITARY_INSTRUMENTS = ['gongue', 'timbal', 'apito', 'agbe', 'mineiro'] as const;

export function normalizeInstrumentId(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const KNOWN_IDS = new Set<string>([
  ...Object.values(COMPATIBLE_FAMILIES).flat(),
  ...SOLITARY_INSTRUMENTS,
  ...instrumentsConfig.map((i) => normalizeInstrumentId(i.id)).filter((id) => id && id !== 'toada'),
]);

function isToadaFolderTrack(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const cfgId = item.instrumentIdx !== undefined ? normalizeInstrumentId(instrumentsConfig[item.instrumentIdx]?.id) : '';
  return Boolean(
    cfgId === 'toada' ||
    normalizeInstrumentId(item.id) === 'toada' ||
    (item.isBusFolder && normalizeInstrumentId(item.customName) === 'toada')
  );
}

export function resolveTrackInstrumentId(item: any, tracks?: readonly any[]): string {
  if (!item) return '';
  if (typeof item === 'string') return normalizeInstrumentId(item);
  if (typeof item !== 'object') return '';

  const explicit = item.sourceInstrumentType || item.sourceInstId || item.sourceType || item.instrumentId;
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    const normExp = normalizeInstrumentId(explicit);
    return normExp === 'toada' ? 'puxador' : normExp;
  }

  if (isToadaFolderTrack(item)) {
    if (Array.isArray(tracks) && tracks.length > 0) {
      const child = tracks.find((t) => {
        if (!t || t.isBusFolder || t.isLinkFolder) return false;
        const cid = normalizeInstrumentId(instrumentsConfig[t.instrumentIdx]?.id);
        return (String(t.busId) === String(item.id) && (cid === 'puxador' || cid === 'coro')) || cid === 'puxador' || cid === 'coro';
      });
      if (child) return normalizeInstrumentId(instrumentsConfig[child.instrumentIdx]?.id);
    }
    return 'puxador';
  }

  if (item.isBusFolder && !item.isLinkFolder) return '';

  if (item.isLinkFolder && Array.isArray(tracks) && tracks.length > 0) {
    const children = tracks.filter(
      (t) => t && !t.isBusFolder && !t.isLinkFolder &&
        (String(t.linkedToTrackId) === String(item.id) || String(t.busId) === String(item.id))
    );
    const master = children.find((t) => t.isLinkMaster === true) || children[0];
    if (master && master.instrumentIdx !== undefined && instrumentsConfig[master.instrumentIdx]?.id) {
      return normalizeInstrumentId(instrumentsConfig[master.instrumentIdx].id);
    }
  }

  if (item.instrumentIdx !== undefined && instrumentsConfig[item.instrumentIdx]?.id) {
    const cfgId = normalizeInstrumentId(instrumentsConfig[item.instrumentIdx].id);
    return cfgId === 'toada' ? 'puxador' : cfgId;
  }

  if (typeof item.id === 'string' && isNaN(Number(item.id))) {
    const normId = normalizeInstrumentId(item.id);
    if (normId === 'toada') return 'puxador';
    if (KNOWN_IDS.has(normId)) return normId;
  }

  return '';
}

export function getInstrumentFamily(instId: string): string {
  const cleanId = normalizeInstrumentId(instId);
  if (!cleanId) return '';
  for (const [family, members] of Object.entries(COMPATIBLE_FAMILIES)) {
    if (members.includes(cleanId)) return family;
  }
  return cleanId;
}

export function canTransferPatterns(source: any, target: any, tracks?: readonly any[]): boolean {
  if (!source || !target) return false;
  const normalizedSource = resolveTrackInstrumentId(source, tracks);
  const normalizedTarget = resolveTrackInstrumentId(target, tracks);
  if (!normalizedSource || !normalizedTarget) return false;

  if (normalizedSource === normalizedTarget) return true;

  for (const members of Object.values(COMPATIBLE_FAMILIES)) {
    if (members.includes(normalizedSource) && members.includes(normalizedTarget)) {
      return true;
    }
  }
  return false;
}

export function convertStepsToVocalRole(
  steps: (string | number | [string, string])[],
  targetRole: 'P' | 'C'
): (string | number | [string, string])[] {
  const sourceToReplace = targetRole === 'P' ? 'C' : 'P';
  return steps.map((step) => {
    if (step === sourceToReplace) return targetRole;
    if (step === targetRole) return step;
    if (Array.isArray(step)) {
      return step.map((s) => (s === sourceToReplace ? targetRole : s)) as [string, string];
    }
    return step;
  });
}
