import * as Tone from 'tone';
import {
  busInputs,
  busChannels,
  busCompTaps,
  busCompFallbacks,
  lowCutNodes,
  eqNodes,
} from './effectsChainNodes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { applyInsertEqTargets, createInsertEqNodes, createLowCutFilter } from './insertEqTargets';

const wiredBusInsertChains = new Map<string | number, { input: any; channel: any }>();

export function clearWiredBusInsert(busId: string | number): void {
  wiredBusInsertChains.delete(busId);
}

/**
 * Chaîne d'insert de Bus :
 * Entrée (±Ø) -> Coupe-Bas -> EQ 3 bandes -> Prise Comp -> Pont de repli (gain 1, ou 0 quand le Worklet est câblé) -> Fader & Pan.
 * Le `BusCompressorWorkletNode` se branche en parallèle natif Prise -> Worklet -> Entrée Fader (cf. busCompressorInsert).
 */
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

  if (!busCompTaps[busId]) busCompTaps[busId] = new Tone.Gain(1);
  if (!busCompFallbacks[busId]) busCompFallbacks[busId] = new Tone.Gain(1);
  const tap = busCompTaps[busId];
  const fallback = busCompFallbacks[busId];

  const wired = wiredBusInsertChains.get(busId);
  if (!wired || wired.input !== inputNode || wired.channel !== channelNode) {
    try { currentEQ.high.disconnect(); } catch (_) {}
    try { fallback.disconnect(); } catch (_) {}
    inputNode.connect(currentLowCut);
    currentLowCut.connect(currentEQ.low);
    currentEQ.low.connect(currentEQ.mid);
    currentEQ.mid.connect(currentEQ.high);
    currentEQ.high.connect(tap);
    tap.connect(fallback);
    fallback.connect(channelNode);
    wiredBusInsertChains.set(busId, { input: inputNode, channel: channelNode });
  }

  applyInsertEqTargets(currentLowCut, currentEQ, track, isNeutral);
}
