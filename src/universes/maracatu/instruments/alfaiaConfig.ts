/**
 * O Girador - Alfaia Studio Audio Configuration (Marcante, Meião, Repique) (< 55 lignes)
 * Banques multi-samples dédiées 48 kHz Mono, macroPitch = 0 st (playbackRate = 1.0), calibration Studio 1.0.
 */
import { InstrumentAudioConfig, StrokeMapping } from './types';
import { AlfaiaStudioRole, buildDedicatedAlfaiaStrokes } from './alfaiaBankBuilder';

const ALFAIA_UI_ORDER = ['D', 'E', 'd', 'e', 'A', 'X', 'C', 'B', 'I'];

export function getAlfaiaStrokes(role: AlfaiaStudioRole = 'meiao'): StrokeMapping[] {
  return buildDedicatedAlfaiaStrokes(role, role === 'marcante' ? 8 : 6);
}

export const marcanteConfig: InstrumentAudioConfig = {
  id: 'marcante',
  name: 'Marcante (alfaia)',
  uiOrder: ALFAIA_UI_ORDER,
  leftHandedSupport: true,
  macroPitch: 0,
  calibratedStudioBank: true,
  strokes: buildDedicatedAlfaiaStrokes('marcante', 8),
};

export const meiaoConfig: InstrumentAudioConfig = {
  id: 'meiao',
  name: 'Meião (alfaia)',
  uiOrder: ALFAIA_UI_ORDER,
  leftHandedSupport: true,
  macroPitch: 0,
  calibratedStudioBank: true,
  strokes: buildDedicatedAlfaiaStrokes('meiao', 6),
};

export const repiqueConfig: InstrumentAudioConfig = {
  id: 'repique',
  name: 'Repique (alfaia)',
  uiOrder: ALFAIA_UI_ORDER,
  leftHandedSupport: true,
  macroPitch: 0,
  calibratedStudioBank: true,
  strokes: buildDedicatedAlfaiaStrokes('repique', 6),
};
