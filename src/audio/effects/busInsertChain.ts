import * as Tone from 'tone';
import {
  busInputs,
  busChannels,
  lowCutNodes,
  eqNodes,
} from './effectsChainNodes';
import { safeRampFreq, safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';

const wiredBusInsertChains = new Map<string | number, { input: any; channel: any }>();

export function clearWiredBusInsert(busId: string | number): void {
  wiredBusInsertChains.delete(busId);
}

export function syncBusInsertChain(busId: string | number, track: any) {
  const inputNode = busInputs[busId];
  const channelNode = busChannels[busId];
  if (!inputNode || !channelNode) return;

  const hasLowCut = !!track.lowCut;
  let currentLowCut = lowCutNodes[busId];
  if (!currentLowCut) {
    currentLowCut = new Tone.Filter(hasLowCut ? 80 : 20, 'highpass');
    lowCutNodes[busId] = currentLowCut;
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

  const wired = wiredBusInsertChains.get(busId);
  if (!wired || wired.input !== inputNode || wired.channel !== channelNode) {
    inputNode.connect(currentLowCut);
    currentLowCut.connect(currentEQ.low);
    currentEQ.low.connect(currentEQ.mid);
    currentEQ.mid.connect(currentEQ.high);
    currentEQ.high.connect(channelNode);
    wiredBusInsertChains.set(busId, { input: inputNode, channel: channelNode });
  }

  const targetCutFreq = hasLowCut ? 80 : 20;
  safeRampFreq(currentLowCut.frequency, targetCutFreq, 0.02);

  if (currentEQ && eq) {
    safeRampFreq(currentEQ.low.frequency, eq.low?.f ?? 100, 0.02);
    safeRampGainDb(currentEQ.low.gain, eq.low?.g ?? 0, 0.02);
    safeRampFreq(currentEQ.mid.frequency, eq.mid?.f ?? 1000, 0.02);
    safeRampGainDb(currentEQ.mid.gain, eq.mid?.g ?? 0, 0.02);
    currentEQ.mid.Q.value = eq.mid?.q === 'narrow' ? 2.5 : 0.7;
    safeRampFreq(currentEQ.high.frequency, eq.high?.f ?? 8000, 0.02);
    safeRampGainDb(currentEQ.high.gain, eq.high?.g ?? 0, 0.02);
  }
}
