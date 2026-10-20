/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup } from '../../types';

export const sortTracksByRodaOrder = (
  tracksList: TrackGroup[],
  rodaTrackOrder?: number[]
): TrackGroup[] => {
  if (!rodaTrackOrder || rodaTrackOrder.length === 0) return tracksList;
  const orderMap = new Map(rodaTrackOrder.map((id, index) => [id, index]));
  return [...tracksList].sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    return idxA - idxB;
  });
};
