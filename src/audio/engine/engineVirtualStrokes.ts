/**
 * O Girador - Audio Engine Virtual Stroke Normalization & Fallback Resolution (< 90 lignes)
 * - Résout en priorité toute entrée explicite `strokesMap.get(strokeSymbol)` (ex: `f`/`v` virtuels à `0.82`, `a` Caixa/Tarol).
 */
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { ALFAIA_INSTRUMENTS, HUMANIZED_INSTRUMENTS_SET } from './engineTypes';

export class EngineVirtualStrokes {
  public static normalizeSymbol(instrumentId: string, strokeSymbol: string): string {
    let normSymbol = strokeSymbol;

    if (ALFAIA_INSTRUMENTS.has(instrumentId) && normSymbol === 'a') {
      return 'A';
    }
    if (normSymbol === 'f') normSymbol = 'F';
    else if (normSymbol === 'v') normSymbol = 'V';
    else if (normSymbol === 'r' && instrumentId !== 'caixa' && instrumentId !== 'tarol') normSymbol = 'R';

    if (HUMANIZED_INSTRUMENTS_SET.has(instrumentId)) {
      if (normSymbol === 't' || normSymbol === 'T') normSymbol = 'B';
      else if (normSymbol === 'C') normSymbol = 'c';
    } else if (instrumentId === 'timbal') {
      if (normSymbol === 'f') normSymbol = 'F';
      else if (normSymbol === 'v') normSymbol = 'V';
    } else if (instrumentId === 'agbe' || instrumentId === 'gongue') {
      if (normSymbol === 't') normSymbol = 'B';
      else if (instrumentId === 'gongue' && normSymbol === 'x') normSymbol = 'X';
    } else if (instrumentId === 'apito') {
      if (normSymbol === 'W') normSymbol = 'L';
      else if (normSymbol === 'w' || normSymbol === 'c') normSymbol = 'C';
    }

    return normSymbol;
  }

  public static buildStrokesMaps(
    configs: InstrumentAudioConfig[]
  ): Map<string, Map<string, StrokeMapping>> {
    const strokesMaps = new Map<string, Map<string, StrokeMapping>>();
    for (const config of configs) {
      const map = new Map<string, StrokeMapping>();
      for (const stroke of config.strokes) {
        map.set(stroke.symbol, stroke);
        const upper = stroke.symbol.toUpperCase();
        if (!map.has(upper)) map.set(upper, stroke);
      }
      strokesMaps.set(config.id, map);
    }
    return strokesMaps;
  }

  public static resolveStroke(
    strokesMaps: Map<string, Map<string, StrokeMapping>>,
    instrumentId: string,
    strokeSymbol: string
  ): StrokeMapping | null {
    const strokesMap = strokesMaps.get(instrumentId);
    if (!strokesMap) return null;

    const direct = strokesMap.get(strokeSymbol);
    if (direct && direct.files.length > 0) return direct;

    const normSymbol = this.normalizeSymbol(instrumentId, strokeSymbol);
    let stroke = strokesMap.get(normSymbol);
    if (!stroke || stroke.files.length === 0) {
      stroke = strokesMap.get(normSymbol.toUpperCase());
    }
    return stroke && stroke.files.length > 0 ? stroke : null;
  }

  /** Résout un coup et applique le fallback intelligent `A -> pool e (80 ms)` si le sample `A` est absent. */
  public static resolveStrokeWithAbafadoFallback(
    strokesMaps: Map<string, Map<string, StrokeMapping>>,
    instrumentId: string,
    strokeSymbol: string,
    hasUsableFiles?: (stroke: StrokeMapping) => boolean
  ): { stroke: StrokeMapping | null; forceShort80ms: boolean } {
    const primary = this.resolveStroke(strokesMaps, instrumentId, strokeSymbol);
    const primaryOk = Boolean(primary && (!hasUsableFiles || hasUsableFiles(primary)));
    if (primaryOk) return { stroke: primary, forceShort80ms: false };

    const norm = this.normalizeSymbol(instrumentId, strokeSymbol);
    if (ALFAIA_INSTRUMENTS.has(instrumentId) && norm === 'A') {
      const fallbackE = this.resolveStroke(strokesMaps, instrumentId, 'e');
      if (fallbackE && (!hasUsableFiles || hasUsableFiles(fallbackE))) {
        return { stroke: fallbackE, forceShort80ms: true };
      }
    }
    return { stroke: primary, forceShort80ms: false };
  }
}
