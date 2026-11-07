import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { masterVolumeNode, masterEQNode } from './audioEngineNodes';
import { syncMasterCompressorBypass } from '../../audio/effectsChain';
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
  // Sync Master Volume node avec lissage Zero-Click (rampTo 20 ms, autorisant jusqu'à +12 dB)
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

  // Sync Master EQ (lowshelf 100Hz, peaking 1000Hz, highshelf 4500Hz en série permanente avec lissage 20 ms)
  useEffect(() => {
    if (masterEQNode) {
      safeRampGainDb(masterEQNode.low, masterEQ.low, 0.02);
      safeRampGainDb(masterEQNode.mid, masterEQ.mid, 0.02);
      safeRampGainDb(masterEQNode.high, masterEQ.high, 0.02);
    }
  }, [masterEQ]);

  // Sync Master Compressor
  useEffect(() => {
    const applyCompressor = (isCompActive: boolean) => {
      syncMasterCompressorBypass(!isCompActive, masterCompressor);
    };

    const initialState = useSequencerStore.getState();
    applyCompressor(initialState.masterEffectsActive?.compressor ?? true);

    const unsubscribe = useSequencerStore.subscribe((state, prevState) => {
      const isCompActive = state.masterEffectsActive?.compressor ?? true;
      const prevCompActive = prevState.masterEffectsActive?.compressor ?? true;

      if (isCompActive !== prevCompActive) {
        applyCompressor(isCompActive);
      }
    });

    return () => unsubscribe();
  }, [masterCompressor]);
}
