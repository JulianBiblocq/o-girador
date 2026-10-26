import * as Tone from 'tone';
import {
  channels,
  trackInputs,
  lowCutNodes,
  eqNodes,
} from './effectsChainNodes';
import { safeRampFreq, safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';

const wiredInsertChains = new Map<string | number, { input: any; channel: any }>();

export function clearWiredTrackInsert(trackId: string | number): void {
  wiredInsertChains.delete(trackId);
}

export function syncTrackInsertChain(trackId: number, track: any) {
  const inputNode = trackInputs[trackId];
  const channelNode = channels[trackId];
  if (!inputNode || !channelNode) return;

  const isLinkedSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
  const hasLowCut = !!track.lowCut;

  let currentLowCut = lowCutNodes[trackId];
  if (!currentLowCut) {
    currentLowCut = new Tone.Filter(hasLowCut ? (isLinkedSlave ? 110 : 80) : 20, 'highpass');
    lowCutNodes[trackId] = currentLowCut;
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

  const wired = wiredInsertChains.get(trackId);
  if (!wired || wired.input !== inputNode || wired.channel !== channelNode) {
    inputNode.connect(currentLowCut);
    currentLowCut.connect(currentEQ.low);
    currentEQ.low.connect(currentEQ.mid);
    currentEQ.mid.connect(currentEQ.high);
    currentEQ.high.connect(channelNode);
    wiredInsertChains.set(trackId, { input: inputNode, channel: channelNode });
  }

  const targetCutFreq = hasLowCut ? (isLinkedSlave ? 110 : 80) : 20;
  safeRampFreq(currentLowCut.frequency, targetCutFreq, 0.02);

  if (currentEQ && eq) {
    const lowGainOffset = isLinkedSlave ? -1.5 : 0;
    safeRampFreq(currentEQ.low.frequency, eq.low?.f ?? 100, 0.02);
    safeRampGainDb(currentEQ.low.gain, (eq.low?.g ?? 0) + lowGainOffset, 0.02);
    safeRampFreq(currentEQ.mid.frequency, eq.mid?.f ?? 1000, 0.02);
    safeRampGainDb(currentEQ.mid.gain, eq.mid?.g ?? 0, 0.02);
    currentEQ.mid.Q.value = eq.mid?.q === 'narrow' ? 2.5 : 0.7;
    safeRampFreq(currentEQ.high.frequency, eq.high?.f ?? 8000, 0.02);
    safeRampGainDb(currentEQ.high.gain, eq.high?.g ?? 0, 0.02);
  }
}
