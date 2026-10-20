import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import {
  channels,
  trackInputs,
  lowCutNodes,
  eqNodes,
  reverbSends,
  distortionSends,
} from './effectsChainNodes';

export function syncTrackInsertChain(trackId: number, track: any) {
  const isMobile = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
  const inputNode = trackInputs[trackId];
  const channelNode = channels[trackId];
  if (!inputNode || !channelNode) return;

  inputNode.disconnect();
  const lowCutNode = lowCutNodes[trackId];
  if (lowCutNode) lowCutNode.disconnect();
  
  const eqNodeGroup = eqNodes[trackId];
  if (eqNodeGroup) {
    eqNodeGroup.low.disconnect();
    eqNodeGroup.mid.disconnect();
    eqNodeGroup.high.disconnect();
  }

  if (isMobile) {
    inputNode.connect(channelNode);
    return;
  }

  const hasLowCut = !!track.lowCut;
  const disableEq = useSequencerStore.getState().ecoConfig?.disableEq;
  const eq = track.eqBands;
  const hasEQ = eq && !disableEq ? (
    (eq.low?.g !== undefined && eq.low.g !== 0) ||
    (eq.mid?.g !== undefined && eq.mid.g !== 0) ||
    (eq.high?.g !== undefined && eq.high.g !== 0)
  ) : false;

  let currentLowCut = lowCutNodes[trackId];
  if (hasLowCut && !currentLowCut) {
    currentLowCut = new Tone.Filter(80, 'highpass');
    lowCutNodes[trackId] = currentLowCut;
  }

  let currentEQ = eqNodes[trackId];
  if (hasEQ && !currentEQ) {
    currentEQ = {
      low: new Tone.Filter(eq?.low?.f || 100, 'lowshelf'),
      mid: new Tone.Filter(eq?.mid?.f || 1000, 'peaking'),
      high: new Tone.Filter(eq?.high?.f || 8000, 'highshelf'),
    };
    eqNodes[trackId] = currentEQ;
  }

  if (currentEQ && eq) {
    currentEQ.low.frequency.value = eq.low?.f ?? 100;
    currentEQ.low.gain.value = eq.low?.g ?? 0;
    currentEQ.mid.frequency.value = eq.mid?.f ?? 1000;
    currentEQ.mid.gain.value = eq.mid?.g ?? 0;
    currentEQ.mid.Q.value = eq.mid?.q === 'narrow' ? 2.0 : 0.7;
    currentEQ.high.frequency.value = eq.high?.f ?? 8000;
    currentEQ.high.gain.value = eq.high?.g ?? 0;
  }

  const perfState = usePerformanceStore.getState();
  const isEQBypassed = perfState.bypassEQ;
  const isReverbBypassed = perfState.bypassReverbFX;

  if (isEQBypassed) {
    if (lowCutNodes[trackId]) {
      try { lowCutNodes[trackId].disconnect(); } catch (_) {}
    }
    if (eqNodes[trackId]) {
      try {
        eqNodes[trackId].low.disconnect();
        eqNodes[trackId].mid.disconnect();
        eqNodes[trackId].high.disconnect();
      } catch (_) {}
    }
  }

  if (isReverbBypassed) {
    if (reverbSends[trackId]) {
      try { reverbSends[trackId].disconnect(); } catch (_) {}
    }
    if (distortionSends[trackId]) {
      try { distortionSends[trackId].disconnect(); } catch (_) {}
    }
  }

  let lastNode: any = inputNode;
  if (!isEQBypassed && hasLowCut && currentLowCut) {
    lastNode.connect(currentLowCut);
    lastNode = currentLowCut;
  }
  if (!isEQBypassed && hasEQ && currentEQ) {
    lastNode.connect(currentEQ.low);
    currentEQ.low.connect(currentEQ.mid);
    currentEQ.mid.connect(currentEQ.high);
    lastNode = currentEQ.high;
  }
  lastNode.connect(channelNode);
}
