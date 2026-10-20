import { reverbBusReceive, reverbNode, distortionBusReceive, distortionNode } from '../../audio/effectsChain';

export const syncMasterReverbBypass = (isMuted: boolean, returnVolume: number) => {
  if (!reverbBusReceive || !reverbNode) return;
  const shouldBypass = isMuted || returnVolume === 0;
  try {
    reverbBusReceive.disconnect(reverbNode);
  } catch (_) {}
  if (!shouldBypass) {
    reverbBusReceive.connect(reverbNode);
  }
};

export const syncMasterDistortionBypass = (isMuted: boolean, returnVolume: number) => {
  if (!distortionBusReceive || !distortionNode) return;
  const shouldBypass = isMuted || returnVolume === 0;
  try {
    distortionBusReceive.disconnect(distortionNode);
  } catch (_) {}
  if (!shouldBypass) {
    distortionBusReceive.connect(distortionNode);
  }
};
