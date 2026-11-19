/**
 * O Girador - Time Signature Beat Markers and Max Ticks Helpers
 */

import type { TimeSignature } from '../../../types';
import { getRodaMeasureGeometry } from '../../../utils/rodaTimeSigGeometry';

export function getMarkers(timeSignature: TimeSignature | string, _maxTicks?: number): number[] {
  const geom = getRodaMeasureGeometry(timeSignature);
  return Array.from({ length: geom.beatsCount }, (_, b) => b * geom.ticksPerBeat);
}

export function getMaxTicks(timeSignature: TimeSignature | string): number {
  return getRodaMeasureGeometry(timeSignature).maxTicks;
}
