import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { masterVolumeNode, masterEQNode, masterCompressorNode } from './audioEngineNodes';
import { syncMasterCompressorBypass } from '../../audio/effectsChain';
import { isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';

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
  // Sync Master Volume node
  useEffect(() => {
    if (masterVolumeNode) {
      const state = useSequencerStore.getState();
      const globalBypass = state.globalAutomationBypass;
      const isMasterBypassed = isMasterVolumeBypassedHelper(state.isMasterVolumeBypassed, globalBypass);
      const hasVolAuto = !isMasterBypassed && state.measureVols && state.measureVols.some(v => v !== 100);

      // Si la lecture tourne et qu'une automation master est active, ne pas écraser la rampe en cours
      if (state.isPlaying && hasVolAuto) {
        return;
      }

      const safeDb = typeof masterVol === 'number' && Number.isFinite(masterVol) && masterVol <= 12
        ? Math.max(-100, masterVol)
        : 0;
      const baseGain = safeDb <= -60 ? 0 : Tone.dbToGain(safeDb);
      masterVolumeNode.gain.setValueAtTime(baseGain, Tone.context.currentTime);
    }
  }, [masterVol]);

  // Sync Master EQ (lowshelf 100Hz, peaking 1000Hz, highshelf 4500Hz en série permanente)
  useEffect(() => {
    if (masterEQNode) {
      masterEQNode.low.value = masterEQ.low;
      masterEQNode.mid.value = masterEQ.mid;
      masterEQNode.high.value = masterEQ.high;
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
