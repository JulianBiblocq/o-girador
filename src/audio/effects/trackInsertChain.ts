import * as Tone from 'tone';
import {
  channels,
  trackInputs,
  lowCutNodes,
  eqNodes,
} from './effectsChainNodes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { applyInsertEqTargets, createInsertEqNodes } from './insertEqTargets';

const wiredInsertChains = new Map<string | number, { input: any; channel: any }>();

export function clearWiredTrackInsert(trackId: string | number): void {
  wiredInsertChains.delete(trackId);
}

export function syncTrackInsertChain(trackId: number, track: any) {
  const inputNode = trackInputs[trackId];
  const channelNode = channels[trackId];
  if (!inputNode || !channelNode) return;

  let currentLowCut = lowCutNodes[trackId];
  if (!currentLowCut) {
    currentLowCut = new Tone.Filter(track.lowCut ? 80 : 20, 'highpass');
    lowCutNodes[trackId] = currentLowCut;
  }

  let currentEQ = eqNodes[trackId];
  if (!currentEQ) {
    currentEQ = createInsertEqNodes(track.eqBands);
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

  const isNeutral = Boolean(useSequencerStore.getState().ecoConfig?.disableEq);
  applyInsertEqTargets(currentLowCut, currentEQ, track, isNeutral);
}
