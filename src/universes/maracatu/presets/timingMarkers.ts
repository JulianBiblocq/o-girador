/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Time Signature Beat Markers and Max Ticks Helpers
 */

import { TimeSignature } from '../../../types';

export function getMarkers(timeSignature: TimeSignature, maxTicks: number): number[] {
  if (timeSignature === '4/4') return [0, 24, 48, 72];
  if (timeSignature === '3/4') return [0, 24, 48];
  if (timeSignature === '2/4') return [0, 24];
  if (timeSignature === '6/8') return [0, 12, 24, 36, 48, 60];
  if (timeSignature === '12/8') return [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132];
  return [0, 24, 48, 72];
}

export function getMaxTicks(timeSignature: TimeSignature): number {
  if (timeSignature === '4/4') return 96;
  if (timeSignature === '3/4') return 72;
  if (timeSignature === '2/4') return 48;
  if (timeSignature === '6/8') return 72;
  if (timeSignature === '12/8') return 144;
  return 96;
}
