/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import {
  busInputs,
  busChannels,
  lowCutNodes,
  eqNodes,
} from './effectsChainNodes';

export function syncBusInsertChain(busId: string | number, track: any) {
  const inputNode = busInputs[busId];
  const channelNode = busChannels[busId];
  if (!inputNode || !channelNode) return;

  inputNode.disconnect();
  const lowCutNode = lowCutNodes[busId];
  if (lowCutNode) lowCutNode.disconnect();

  const eqNodeGroup = eqNodes[busId];
  if (eqNodeGroup) {
    eqNodeGroup.low.disconnect();
    eqNodeGroup.mid.disconnect();
    eqNodeGroup.high.disconnect();
  }

  const perfState = usePerformanceStore.getState();
  const isEQBypassed = perfState.bypassEQ;

  if (isEQBypassed) {
    inputNode.connect(channelNode);
    return;
  }

  const hasLowCut = !!track.lowCut;
  let currentLowCut = lowCutNodes[busId];
  if (!currentLowCut) {
    currentLowCut = new Tone.Filter(hasLowCut ? 80 : 20, 'highpass');
    lowCutNodes[busId] = currentLowCut;
  } else {
    currentLowCut.frequency.value = hasLowCut ? 80 : 20;
  }

  const eq = track.eqBands;
  let currentEQ = eqNodes[busId];
  if (!currentEQ) {
    currentEQ = {
      low: new Tone.Filter(eq?.low?.f || 100, 'lowshelf'),
      mid: new Tone.Filter(eq?.mid?.f || 1000, 'peaking'),
      high: new Tone.Filter(eq?.high?.f || 8000, 'highshelf'),
    };
    eqNodes[busId] = currentEQ;
  }

  if (currentEQ && eq) {
    currentEQ.low.frequency.value = eq.low?.f ?? 100;
    currentEQ.low.gain.value = eq.low?.g ?? 0;
    currentEQ.mid.frequency.value = eq.mid?.f ?? 1000;
    currentEQ.mid.gain.value = eq.mid?.g ?? 0;
    currentEQ.mid.Q.value = eq.mid?.q === 'narrow' ? 2.5 : 0.7;
    currentEQ.high.frequency.value = eq.high?.f ?? 8000;
    currentEQ.high.gain.value = eq.high?.g ?? 0;
  }

  inputNode.connect(currentLowCut);
  currentLowCut.connect(currentEQ.low);
  currentEQ.low.connect(currentEQ.mid);
  currentEQ.mid.connect(currentEQ.high);
  currentEQ.high.connect(channelNode);
}
