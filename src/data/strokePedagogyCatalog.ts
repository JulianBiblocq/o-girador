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

/**
 * Résout la fiche pédagogique bilingue (FR / PT-BR) d'une frappe selon l'instrument
 * et le mode gaucher (`isLeftHanded`).
 * - Si `isVisualSymbol === true`, `rawSymbol` est déjà inversé visuellement (ex. sortie de `getStrokesForInstrument`).
 * - Sinon, `rawSymbol` est le symbole sémantique stocké dans `pattern.activeSteps`.
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

  const drumHit = resolveDrumStrokePedagogy(normInstId, semanticStroke, isLeftHanded, lang);
  if (drumHit) {
    return {
      semanticStroke,
      visualSymbol,
      title: drumHit.title,
      description: drumHit.description,
    };
  }

  const otherHit = resolveMetalShakerVocalPedagogy(normInstId, normInstType, semanticStroke, lang);
  if (otherHit) {
    return {
      semanticStroke,
      visualSymbol,
      title: otherHit.title,
      description: otherHit.description,
    };
  }

  return null;
}
