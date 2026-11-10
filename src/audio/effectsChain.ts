
export * from './effects/effectsChainNodes';
export { initMasterEffectsChain } from './effects/masterChainInitializer';
export {
  getDeferredReverbActivation,
  setDeferredReverbActivation,
  ensureReverbConnected,
  handleReverbEcoToggle,
} from './effects/reverbEcoHandler';
export { syncTrackInsertChain } from './effects/trackInsertChain';
export { syncBusInsertChain } from './effects/busInsertChain';
export * from './effects/insertEqTargets';
export {
  setOnTrackDisposeCallback,
  disposeTrackNodes,
  disposeAllTrackNodes,
} from './effects/trackDisposeHandler';
export {
  syncMasterCompressorBypass,
  syncMasterBusWorkletParams,
  previewMasterCompressorSetting,
  resetMasterCompressorCache,
} from './effects/masterBypassHandler';
export * from './effects/postBusSendRouter';
export {
  initMasterMonoNodes,
  setMasterMonoCheck,
  setMasterMonoWorkletActive,
  isMasterMonoActive,
  disposeMasterMonoNodes,
} from './effects/masterMonoHandler';

export function initInstrumentNodes() {
  // Les nœuds sont instanciés dynamiquement par track.id dans useAudioSync.ts
}
