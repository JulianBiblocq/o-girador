import {
  channels,
  meters,
  busChannels,
  busMeters,
  busCompTaps,
  busCompFallbacks,
  reverbSends,
  distortionSends,
  trackInputs,
  busInputs,
  lowCutNodes,
  eqNodes,
  busReverbSendVca,
  busDistoSendVca,
} from './effectsChainNodes';
import { disposeBusCompressorInsert } from './busCompressorInsert';
import { clearWiredTrackInsert } from './trackInsertChain';
import { clearWiredBusInsert } from './busInsertChain';
import { disposeAllRodaSpectralSubBuses } from './rodaSpectralSubBus';

let onTrackDisposeCallback: ((trackId: number | string) => void) | null = null;

export function setOnTrackDisposeCallback(cb: (trackId: number | string) => void) {
  onTrackDisposeCallback = cb;
}

function safeDisconnectAndDispose(dict: Record<string | number, any>, key: number | string): void {
  const node = dict[key];
  if (!node) return;
  try { node.disconnect?.(); } catch (_) {}
  try { node.dispose?.(); } catch (_) {}
  delete dict[key];
}

export function disposeTrackNodes(trackId: number | string) {
  try {
    onTrackDisposeCallback?.(trackId);
  } catch (_) {}

  clearWiredTrackInsert(trackId);
  clearWiredBusInsert(trackId);
  try { disposeBusCompressorInsert(trackId); } catch (_) {}

  safeDisconnectAndDispose(reverbSends, trackId);
  safeDisconnectAndDispose(distortionSends, trackId);
  safeDisconnectAndDispose(busReverbSendVca, trackId);
  safeDisconnectAndDispose(busDistoSendVca, trackId);
  safeDisconnectAndDispose(busCompTaps, trackId);
  safeDisconnectAndDispose(busCompFallbacks, trackId);
  safeDisconnectAndDispose(lowCutNodes, trackId);

  const eq = eqNodes[trackId];
  if (eq) {
    try { eq.low.disconnect(); eq.low.dispose(); } catch (_) {}
    try { eq.mid.disconnect(); eq.mid.dispose(); } catch (_) {}
    try { eq.high.disconnect(); eq.high.dispose(); } catch (_) {}
    delete eqNodes[trackId];
  }

  safeDisconnectAndDispose(trackInputs, trackId);
  safeDisconnectAndDispose(busInputs, trackId);
  safeDisconnectAndDispose(meters, trackId);
  safeDisconnectAndDispose(busMeters, trackId);
  safeDisconnectAndDispose(channels, trackId);
  safeDisconnectAndDispose(busChannels, trackId);
}

export function disposeAllTrackNodes() {
  const seen = new Set<string>();
  const dicts = [channels, busChannels, trackInputs, busInputs];
  for (const dict of dicts) {
    for (const rawKey of Object.keys(dict)) {
      if (seen.has(rawKey)) continue;
      seen.add(rawKey);
      const numKey = Number(rawKey);
      disposeTrackNodes(Number.isFinite(numKey) && String(numKey) === rawKey ? numKey : rawKey);
    }
  }
  disposeAllRodaSpectralSubBuses();
}
