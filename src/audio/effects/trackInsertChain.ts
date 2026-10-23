import * as Tone from 'tone';
import { usePerformanceStore } from '../../stores/usePerformanceStore';
import {
  channels,
  trackInputs,
  lowCutNodes,
  slaveSubCutNodes,
  eqNodes,
  reverbSends,
  distortionSends,
} from './effectsChainNodes';

export function syncTrackInsertChain(trackId: number, track: any) {
  const inputNode = trackInputs[trackId];
  const channelNode = channels[trackId];
  if (!inputNode || !channelNode) return;

  inputNode.disconnect();
  const lowCutNode = lowCutNodes[trackId];
  if (lowCutNode) lowCutNode.disconnect();
  const slaveSubCut = slaveSubCutNodes[trackId];
  if (slaveSubCut) slaveSubCut.disconnect();

  const eqNodeGroup = eqNodes[trackId];
  if (eqNodeGroup) {
    eqNodeGroup.low.disconnect();
    eqNodeGroup.mid.disconnect();
    eqNodeGroup.high.disconnect();
  }

  const perfState = usePerformanceStore.getState();
  const isReverbBypassed = perfState.bypassReverbFX;

  if (isReverbBypassed) {
    if (reverbSends[trackId]) {
      try { reverbSends[trackId].disconnect(); } catch (_) {}
    }
    if (distortionSends[trackId]) {
      try { distortionSends[trackId].disconnect(); } catch (_) {}
    }
  }


  const isLinkedSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
  const hasLowCut = !!track.lowCut;

  let currentLowCut = lowCutNodes[trackId];
  if (!currentLowCut) {
    currentLowCut = new Tone.Filter(hasLowCut ? (isLinkedSlave ? 110 : 80) : 20, 'highpass');
    lowCutNodes[trackId] = currentLowCut;
  } else {
    currentLowCut.frequency.value = hasLowCut ? (isLinkedSlave ? 110 : 80) : 20;
  }

  const eq = track.eqBands;
  let currentEQ = eqNodes[trackId];
  if (!currentEQ) {
    currentEQ = {
      low: new Tone.Filter(eq?.low?.f || 100, 'lowshelf'),
      mid: new Tone.Filter(eq?.mid?.f || 1000, 'peaking'),
      high: new Tone.Filter(eq?.high?.f || 8000, 'highshelf'),
    };
    eqNodes[trackId] = currentEQ;
  }

  if (currentEQ && eq) {
    const lowGainOffset = isLinkedSlave ? -1.5 : 0;
    currentEQ.low.frequency.value = eq.low?.f ?? 100;
    currentEQ.low.gain.value = (eq.low?.g ?? 0) + lowGainOffset;
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
