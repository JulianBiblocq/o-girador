import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { masterVolumeNode, masterEQNode, masterCompressorNode } from './audioEngineNodes';
import { syncMasterCompressorBypass } from '../../audio/effectsChain';

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
    const applyVolume = () => {
      if (masterVolumeNode) {
        const baseGain = masterVol <= -60 || !Number.isFinite(masterVol) ? 0 : Tone.dbToGain(masterVol);
        masterVolumeNode.gain.setValueAtTime(baseGain, Tone.context.currentTime);
      }
    };

    applyVolume();
    const unsubscribe = useSequencerStore.subscribe(() => {
      applyVolume();
    });
    return () => unsubscribe();
  }, [masterVol]);

  // Sync Master EQ with Smart Bypass
  useEffect(() => {
    if (masterEQNode && masterVolumeNode && masterCompressorNode) {
      masterEQNode.low.value = masterEQ.low;
      masterEQNode.mid.value = masterEQ.mid;
      masterEQNode.high.value = masterEQ.high;

      const isFlat = masterEQ.low === 0 && masterEQ.mid === 0 && masterEQ.high === 0;

      try { masterVolumeNode.disconnect(masterEQNode); } catch (_) {}
      try { masterVolumeNode.disconnect(masterCompressorNode); } catch (_) {}
      try { masterEQNode.disconnect(masterCompressorNode); } catch (_) {}

      if (isFlat) {
        masterVolumeNode.connect(masterCompressorNode);
      } else {
        masterVolumeNode.connect(masterEQNode);
        masterEQNode.connect(masterCompressorNode);
      }
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
