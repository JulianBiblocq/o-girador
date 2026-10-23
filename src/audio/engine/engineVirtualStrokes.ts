/**
 * O Girador - Audio Engine Virtual Stroke Normalization & Resolution
 */

import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { HUMANIZED_INSTRUMENTS_SET } from './engineTypes';

export class EngineVirtualStrokes {
  public static normalizeSymbol(instrumentId: string, strokeSymbol: string): string {
    let normSymbol = strokeSymbol;

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
        if (!map.has(upper)) {
          map.set(upper, stroke);
        }
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

    const normSymbol = this.normalizeSymbol(instrumentId, strokeSymbol);
    let stroke = strokesMap.get(normSymbol);
    if (!stroke || stroke.files.length === 0) {
      stroke = strokesMap.get(normSymbol.toUpperCase());
    }
    return stroke && stroke.files.length > 0 ? stroke : null;
  }
}
