/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CircleSequencerProps } from './circle-sequencer/circleSequencerTypes';
import { useCircleSequencerState } from './circle-sequencer/useCircleSequencerState';
import { CircleSequencerView } from './circle-sequencer/CircleSequencerView';

export {
  sortTracksByRodaOrder,
  drawGouacheRibbon,
  resolvePatternForMeasure,
  getDefaultStepsForMeasure,
  getPhysicalStepFromRatio,
  drawCenterKaraoke,
} from './circle-sequencer';

const CircleSequencerComponent: React.FC<CircleSequencerProps> = (props) => {
  const state = useCircleSequencerState(props);
  return <CircleSequencerView state={state} />;
};

export const CircleSequencer = React.memo(CircleSequencerComponent);
export default CircleSequencer;
