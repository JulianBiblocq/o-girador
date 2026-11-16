import { Language } from '../types';
import { getVisualStrokeSymbol } from '../universes/maracatu/strokes/visualStrokeSymbol';
import { PedagogyEntryText, resolveDrumStrokePedagogy } from './strokePedagogyDrums';
import { resolveMetalShakerVocalPedagogy } from './strokePedagogyMetalsAndShakers';

export type { PedagogyEntryText };
export { resolveDrumStrokePedagogy, resolveMetalShakerVocalPedagogy };

export interface ResolvedStrokePedagogy extends PedagogyEntryText {
  semanticStroke: string;
  visualSymbol: string;
}

const HAND_SWAP_MAP: Record<string, string> = {
  Droite: 'Gauche',
  Gauche: 'Droite',
  droite: 'gauche',
  gauche: 'droite',
  Direita: 'Esquerda',
  Esquerda: 'Direita',
  direita: 'esquerda',
  esquerda: 'direita',
};

const HAND_SWAP_RE = /(?<![\p{L}\p{N}_])(Droite|Gauche|droite|gauche|Direita|Esquerda|direita|esquerda)(?![\p{L}\p{N}_])/gu;

export function swapDirectionalHands(text: string, isLeftHanded: boolean): string {
  if (!isLeftHanded || !text) return text;
  return text.replace(HAND_SWAP_RE, (match) => HAND_SWAP_MAP[match] ?? match);
}

/**
 * Résout la fiche pédagogique officielle (FR / PT-BR) d'une frappe selon l'instrument
 * et le mode gaucher (`isLeftHanded`), en inversant `Droite <-> Gauche` (`Direita <-> Esquerda`)
 * à la fois dans le titre et dans le corps du texte explicatif.
 */
export function resolveStrokePedagogy(
  instId: string,
  instType: string,
  rawSymbol: string | number,
  lang: Language,
  isLeftHanded = false,
  isVisualSymbol = false
): ResolvedStrokePedagogy | null {
  const sym = String(rawSymbol ?? '').trim();
  if (!sym) return null;

  const normInstId = (instId || '').toLowerCase();
  const normInstType = (instType || '').toLowerCase();

  const semanticStroke = isVisualSymbol
    ? String(getVisualStrokeSymbol(sym, isLeftHanded, normInstId))
    : sym;
  const visualSymbol = isVisualSymbol
    ? sym
    : String(getVisualStrokeSymbol(sym, isLeftHanded, normInstId));

  const rawEntry =
    resolveDrumStrokePedagogy(normInstId, semanticStroke, lang) ??
    resolveMetalShakerVocalPedagogy(normInstId, normInstType, semanticStroke, lang);

  if (!rawEntry) return null;

  return {
    semanticStroke,
    visualSymbol,
    title: swapDirectionalHands(rawEntry.title, isLeftHanded),
    description: swapDirectionalHands(rawEntry.description, isLeftHanded),
  };
}
