/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './effects/effectsChainNodes';
export { initMasterEffectsChain } from './effects/masterChainInitializer';
export {
  getDeferredReverbActivation,
  setDeferredReverbActivation,
  ensureReverbConnected,
  handleReverbEcoToggle,
} from './effects/reverbEcoHandler';
export { syncTrackInsertChain } from './effects/trackInsertChain';
export {
  setOnTrackDisposeCallback,
  disposeTrackNodes,
  disposeAllTrackNodes,
} from './effects/trackDisposeHandler';
export { syncMasterCompressorBypass } from './effects/masterBypassHandler';

export function initInstrumentNodes() {
  // Les nœuds sont instanciés dynamiquement par track.id dans useAudioSync.ts
}
