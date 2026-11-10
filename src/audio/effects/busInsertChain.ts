import {
  busInputs,
  busChannels,
  lowCutNodes,
  eqNodes,
} from './effectsChainNodes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { applyInsertEqTargets, createInsertEqNodes, createLowCutFilter } from './insertEqTargets';

const wiredBusInsertChains = new Map<string | number, { input: any; channel: any }>();

export function clearWiredBusInsert(busId: string | number): void {
  wiredBusInsertChains.delete(busId);
}

export function syncBusInsertChain(busId: string | number, track: any) {
  const inputNode = busInputs[busId];
  const channelNode = busChannels[busId];
  if (!inputNode || !channelNode) return;

  const isNeutral = Boolean(useSequencerStore.getState().ecoConfig?.disableEq);
  let currentLowCut = lowCutNodes[busId];
  if (!currentLowCut) {
    currentLowCut = createLowCutFilter(track, isNeutral);
    lowCutNodes[busId] = currentLowCut;
  }

  let currentEQ = eqNodes[busId];
  if (!currentEQ) {
    currentEQ = createInsertEqNodes(track.eqBands);
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

  applyInsertEqTargets(currentLowCut, currentEQ, track, isNeutral);
}
