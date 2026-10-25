/**
 * Gestion dynamique de la nomenclature et des abréviations 2 lettres (< 140 lignes).
 */
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';

export const DEFAULT_PUPITRE_CODES: Record<string, string> = {
  al: 'Al', mc: 'Mc', me: 'Me', rp: 'Rp', cx: 'Cx', tr: 'Tr',
  gg: 'Gg', ab: 'Ab', mi: 'Mi', tb: 'Tb', ap: 'Ap', td: 'Td',
  cx_tr: 'Cx+Tr', ab_mi: 'Ab+Mi',
};

const STORAGE_KEY = 'girador_paper_pupitre_codes';

const FIRESTORE_ROLE_MAP: Record<string, string> = {
  alfaia_grave: 'mc', alfaia_medio: 'me', alfaia_agudo: 'rp',
  caixa_baixo: 'cx', caixa_alto: 'tr', gongue: 'gg',
  agbe: 'ab', mineiro: 'mi', timbal: 'tb', apito: 'ap',
};

export function getCustomPupitreCodes(): Record<string, string> {
  const merged: Record<string, string> = { ...DEFAULT_PUPITRE_CODES };
  const firestoreAbbr = useNomenclatureStore.getState().customNomenclatureAbbr;
  if (firestoreAbbr) {
    for (const [role, abbr] of Object.entries(firestoreAbbr)) {
      const code = FIRESTORE_ROLE_MAP[role];
      if (code && abbr) merged[code] = String(abbr).trim();
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) Object.assign(merged, JSON.parse(raw));
  } catch {}
  return merged;
}

export function saveCustomPupitreAbbr(key: string, newAbbr: string): Record<string, string> {
  const current = getCustomPupitreCodes();
  const cleanAbbr = newAbbr.trim().slice(0, 4) || DEFAULT_PUPITRE_CODES[key] || key.toUpperCase();
  current[key] = cleanAbbr;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch {}
  return current;
}

export function resolvePupitreAbbr(key: string): string {
  const custom = getCustomPupitreCodes();
  return custom[key.toLowerCase()] || DEFAULT_PUPITRE_CODES[key.toLowerCase()] || key.toUpperCase();
}

export function resolvePupitreDisplayName(key: string, lang: 'fr' | 'pt'): string {
  const k = key.toLowerCase();
  const custom = useNomenclatureStore.getState().customNomenclature;
  switch (k) {
    case 'al': return 'Alfaias';
    case 'mc': return custom?.alfaia_grave || 'Marcante';
    case 'me': return custom?.alfaia_medio || 'Meião';
    case 'rp': return custom?.alfaia_agudo || 'Repique';
    case 'cx': return custom?.caixa_baixo || 'Caixa';
    case 'tr': return custom?.caixa_alto || 'Tarol';
    case 'cx_tr': return 'Bus Caixas (Cx+Tr)';
    case 'gg': return custom?.gongue || 'Gonguê';
    case 'ab': return custom?.agbe || 'Agbê';
    case 'mi': return custom?.mineiro || 'Mineiro';
    case 'ab_mi': return 'Bus Sementes (Ab+Mi)';
    case 'tb': return custom?.timbal || 'Timbal';
    case 'ap': return custom?.apito || 'Apito';
    case 'td': return lang === 'fr' ? 'Toada / Chant' : 'Toada / Canto';
    default: return key;
  }
}

export interface ParsedPupitreHeader {
  code: string | null;
  raw: string;
  isVariation: boolean;
  targetCodes: string[];
  probability?: number;
}

export function parsePupitreHeader(rawText: string): ParsedPupitreHeader {
  if (!rawText) return { code: null, raw: '', isVariation: false, targetCodes: [] };
  const trimmed = rawText.trim().replace(/^\{+\s*/, '');
  const isVariation = /[↳\->]|\bvar\b/i.test(trimmed);

  let probability: number | undefined;
  if (isVariation) {
    const probMatch = trimmed.match(/(\d+)\s*%/);
    if (probMatch) probability = Math.max(0, Math.min(100, parseInt(probMatch[1], 10)));
  }

  // Nettoyage des indicateurs de variation et pourcentages pour isoler le pupitre
  const s = trimmed
    .replace(/[↳\->]/g, ' ')
    .replace(/\bvar\w*\b/gi, ' ')
    .replace(/\d+\s*%/g, ' ')
    .replace(/[{}]/g, ' ')
    .trim();

  // Liaisons multiples (ex: mc+me, mc+me+rp, cx+tr, ab+mi, me/rp)
  if (s.includes('+') || s.includes('/')) {
    const parts = s.split(/[+/]/).map((p) => matchPupitreCodeFromText(p)).filter(Boolean) as string[];
    return { code: parts[0] || null, raw: rawText, isVariation, targetCodes: parts, probability };
  }

  const matched = matchPupitreCodeFromText(s);
  return { code: matched, raw: rawText, isVariation, targetCodes: matched ? [matched] : [], probability };
}

export function matchPupitreCodeFromText(rawText: string): string | null {
  if (!rawText) return null;
  const s = rawText.trim().toLowerCase().replace(/^\{+\s*/, '');
  const custom = getCustomPupitreCodes();

  for (const [key, abbr] of Object.entries(custom)) {
    if (s === abbr.toLowerCase() || s.startsWith(abbr.toLowerCase())) return key;
  }
  if (s.includes('marcan') || s === 'mc') return 'mc';
  if (s.includes('meiao') || s.includes('meião') || s === 'me') return 'me';
  if (s.includes('repiq') || s === 'rp') return 'rp';
  if (s.includes('alfai') || s === 'al') return 'al';
  if (s.includes('tarol') || s === 'tr') return 'tr';
  if (s.includes('caixa') || s === 'cx') return 'cx';
  if (s.includes('gongu') || s === 'gg') return 'gg';
  if (s.includes('agbe') || s.includes('agbê') || s.includes('abe') || s === 'ab') return 'ab';
  if (s.includes('mineir') || s === 'mi') return 'mi';
  if (s.includes('timbal') || s === 'tb') return 'tb';
  if (s.includes('apito') || s === 'ap') return 'ap';
  if (s.includes('toada') || s.includes('voz') || s.includes('voix') || s === 'td') return 'td';
  return null;
}
