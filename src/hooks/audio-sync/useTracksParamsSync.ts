import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { syncBusChannels } from './syncBusChannels';
import { syncTrackChannels } from './syncTrackChannels';
import { percentToDb } from './audioParamsCache';
import { syncMasterReverbBypass, syncMasterDistortionBypass } from './audioSyncMasterBypass';
import { syncMasterCompressorBypass } from '../../audio/effectsChain';
import {
  masterReverbVolumeNode, reverbNode, masterDistortionVolumeNode,
  distortionNode, masterCompressor, masterVolumeNode, channels,
  meters, trackInputs, busChannels, busMeters, reverbSends,
  distortionSends, audioEngine
} from './audioEngineNodes';

export interface UseTracksParamsSyncProps {
  isAudioInitializedRef: { current: boolean };
  lastAppliedTracksParamsRef: { current: Record<string | number, string> };
  lastAppliedBussesRef: { current: Record<string | number, string | number | null> };
}

export function useTracksParamsSync(props: UseTracksParamsSyncProps): void {
  const { isAudioInitializedRef, lastAppliedTracksParamsRef, lastAppliedBussesRef } = props;

  useEffect(() => {
    const unsub = useSequencerStore.subscribe((state, prevState) => {
      if (state.masterFX !== prevState.masterFX || state.masterEffectsActive !== prevState.masterEffectsActive) {
        const masterFX = state.masterFX;
        const fxActive = state.masterEffectsActive || { compressor: true, reverb: true, disto: true };

        if (masterReverbVolumeNode) {
          const revBypassed = !fxActive.reverb || masterFX.reverb.isMuted;
          const revGain = revBypassed ? 0 : Tone.dbToGain(percentToDb(masterFX.reverb.returnVolume));
          masterReverbVolumeNode.gain.value = revGain;
          masterReverbVolumeNode.gain.rampTo(revGain, 0.02);
        }

        if (reverbNode) {
          const decay = 0.5 + 7.5 * (masterFX.reverb.time / 100);
          if (reverbNode.decay !== decay) reverbNode.decay = decay;
          if (typeof (reverbNode as any).wet?.rampTo === 'function') {
            (reverbNode as any).wet.rampTo(fxActive.reverb && !masterFX.reverb.isMuted ? 1 : 0, 0.02);
          }
        }
        syncMasterReverbBypass(!fxActive.reverb || masterFX.reverb.isMuted, masterFX.reverb.returnVolume);

        if (masterDistortionVolumeNode) {
          const distBypassed = !fxActive.disto || masterFX.distortion.isMuted;
          const distGain = distBypassed ? 0 : Tone.dbToGain(percentToDb(masterFX.distortion.returnVolume));
          masterDistortionVolumeNode.gain.value = distGain;
          masterDistortionVolumeNode.gain.rampTo(distGain, 0.02);
        }

        if (distortionNode) {
          const distVal = masterFX.distortion.drive / 100;
          if (distortionNode.distortion !== distVal) distortionNode.distortion = distVal;
          if (typeof distortionNode.wet?.rampTo === 'function') {
            distortionNode.wet.rampTo(fxActive.disto && !masterFX.distortion.isMuted ? 1 : 0, 0.02);
          }
        }
        syncMasterDistortionBypass(!fxActive.disto || masterFX.distortion.isMuted, masterFX.distortion.returnVolume);
        syncMasterCompressorBypass(!fxActive.compressor || state.isEcoMode, (masterCompressor as any) || undefined);
      }

      const tracksChanged = state.tracks !== prevState.tracks;
      const bypassChanged = state.globalAutomationBypass !== prevState.globalAutomationBypass;

      if (tracksChanged || bypassChanged) {
        if (!isAudioInitializedRef.current) return;
        if (bypassChanged) {
          lastAppliedTracksParamsRef.current = {};
          lastAppliedBussesRef.current = {};
          if (masterVolumeNode?.gain) {
            try {
              masterVolumeNode.gain.cancelScheduledValues(Tone.now());
            } catch (_) {}
          }
        }
        const tracks = state.tracks;
        syncBusChannels({
          tracks, isEcoMode: state.isEcoMode, busChannels, busMeters,
          reverbSends, distortionSends, lastAppliedTracksParamsRef,
          lastAppliedBussesRef, masterVolumeNode
        });
        syncTrackChannels({
          tracks, isEcoMode: state.isEcoMode, channels, meters,
          trackInputs, busChannels, reverbSends, distortionSends,
          lastAppliedTracksParamsRef, lastAppliedBussesRef,
          masterVolumeNode, audioEngine
        });
      }
    });

    return unsub;
  }, [isAudioInitializedRef, lastAppliedTracksParamsRef, lastAppliedBussesRef]);
}
