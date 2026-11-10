import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { masterVolumeNode, masterEQNode } from './audioEngineNodes';
import { syncMasterBusWorkletParams, syncMasterCompressorBypass } from '../../audio/effectsChain';
import { isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';
import { safeRampGainDb } from '../../utils/audio/safeAudioParamRamp';

interface UseMasterEffectsSyncProps {
  masterVol: number;
  masterEQ: { low: number; mid: number; high: number };
  masterCompressor: { threshold: number; ratio: number };
}

export function useMasterEffectsSync({
  masterVol,
  masterEQ,
  masterCompressor,
}: UseMasterEffectsSyncProps) {
  useEffect(() => {
    if (masterVolumeNode) {
      const state = useSequencerStore.getState();
      const globalBypass = state.globalAutomationBypass;
      const isMasterBypassed = isMasterVolumeBypassedHelper(state.isMasterVolumeBypassed, globalBypass);
      const hasVolAuto = !isMasterBypassed && state.measureVols && state.measureVols.some((v) => v !== 100);

      if (state.isPlaying && hasVolAuto) {
        return;
      }

      const safeDb = typeof masterVol === 'number' && Number.isFinite(masterVol)
        ? Math.max(-100, Math.min(12, masterVol))
        : 0;
      const baseGain = safeDb <= -60 ? 0 : Tone.dbToGain(safeDb);
      if (typeof masterVolumeNode.gain.rampTo === 'function') {
        masterVolumeNode.gain.rampTo(baseGain, 0.02);
      } else {
        masterVolumeNode.gain.setValueAtTime(baseGain, Tone.context.currentTime);
      }
    }
  }, [masterVol]);

  useEffect(() => {
    if (masterEQNode) {
      safeRampGainDb(masterEQNode.low, masterEQ.low, 0.02);
      safeRampGainDb(masterEQNode.mid, masterEQ.mid, 0.02);
      safeRampGainDb(masterEQNode.high, masterEQ.high, 0.02);
    }
  }, [masterEQ]);

  useEffect(() => {
    const applyState = (s: ReturnType<typeof useSequencerStore.getState>) => {
      const disableFx = Boolean(s.ecoConfig?.disableFx);
      const isBypassed = !(s.masterEffectsActive?.compressor ?? true) || disableFx;
      syncMasterCompressorBypass(isBypassed, masterCompressor, disableFx);
      if (s.masterFX?.masterBus) {
        syncMasterBusWorkletParams(s.masterFX.masterBus);
      }
    };

    applyState(useSequencerStore.getState());

    const unsubscribe = useSequencerStore.subscribe((state, prevState) => {
      const nextComp = state.masterEffectsActive?.compressor ?? true;
      const prevComp = prevState.masterEffectsActive?.compressor ?? true;
      const nextEco = Boolean(state.ecoConfig?.disableFx);
      const prevEco = Boolean(prevState.ecoConfig?.disableFx);
      if (nextComp !== prevComp || nextEco !== prevEco || state.masterFX?.masterBus !== prevState.masterFX?.masterBus) {
        applyState(state);
      }
    });

    return () => unsubscribe();
  }, [masterCompressor]);
}
