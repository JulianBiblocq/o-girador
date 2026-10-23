import {
  channels,
  meters,
  reverbSends,
  distortionSends,
  trackInputs,
  lowCutNodes,
  slaveSubCutNodes,
  eqNodes,
} from './effectsChainNodes';

let onTrackDisposeCallback: ((trackId: number) => void) | null = null;

export function setOnTrackDisposeCallback(cb: (trackId: number) => void) {
  onTrackDisposeCallback = cb;
}

export function disposeTrackNodes(trackId: number) {
  try {
    if (onTrackDisposeCallback) {
      onTrackDisposeCallback(trackId);
    }
  } catch (_) {}

  try {
    if (reverbSends[trackId]) {
      try { reverbSends[trackId].dispose(); } catch (_) {}
      delete reverbSends[trackId];
    }
  } catch (_) {}

  try {
    if (distortionSends[trackId]) {
      try { distortionSends[trackId].dispose(); } catch (_) {}
      delete distortionSends[trackId];
    }
  } catch (_) {}

  try {
    if (lowCutNodes[trackId]) {
      try { lowCutNodes[trackId].disconnect(); lowCutNodes[trackId].dispose(); } catch (_) {}
      delete lowCutNodes[trackId];
    }
  } catch (_) {}

  try {
    if (slaveSubCutNodes[trackId]) {
      try { slaveSubCutNodes[trackId].disconnect(); slaveSubCutNodes[trackId].dispose(); } catch (_) {}
      delete slaveSubCutNodes[trackId];
    }
  } catch (_) {}

  try {
    if (eqNodes[trackId]) {
      try {
        eqNodes[trackId].low.disconnect(); eqNodes[trackId].low.dispose();
        eqNodes[trackId].mid.disconnect(); eqNodes[trackId].mid.dispose();
        eqNodes[trackId].high.disconnect(); eqNodes[trackId].high.dispose();
      } catch (_) {}
      delete eqNodes[trackId];
    }
  } catch (_) {}

  try {
    if (trackInputs[trackId]) {
      try { trackInputs[trackId].disconnect(); trackInputs[trackId].dispose(); } catch (_) {}
      delete trackInputs[trackId];
    }
  } catch (_) {}

  try {
    if (meters[trackId]) {
      try { meters[trackId].disconnect(); (meters[trackId] as any).dispose?.(); } catch (_) {}
      delete meters[trackId];
    }
  } catch (_) {}

  try {
    if (channels[trackId]) {
      try { channels[trackId].disconnect(); channels[trackId].dispose(); } catch (_) {}
      delete channels[trackId];
    }
  } catch (_) {}
}

export function disposeAllTrackNodes() {
  const activeIds = Object.keys(channels).map(Number);
  activeIds.forEach((id) => disposeTrackNodes(id));
}
