import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { syncBusChannels } from './syncBusChannels';
import { syncTrackChannels } from './syncTrackChannels';
import { percentToDb } from './audioParamsCache';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { mapReverbTimeKnobToDecaySec, updateStudioReverbNode } from '../../audio/effects/studioReverbImpulse';
import { updateStudioSaturationNode } from '../../audio/effects/studioSaturationChain';
import { syncToadaVocalSlapback } from '../../audio/effects/toadaVocalSlapback';
import { syncMasterBusWorkletParams } from '../../audio/effectsChain';
import {
  masterReverbVolumeNode, reverbNode, masterDistortionVolumeNode,
  distortionNode, masterVolumeNode, channels,
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
      const fxChanged =
        state.masterFX !== prevState.masterFX ||
        state.masterEffectsActive !== prevState.masterEffectsActive ||
        state.isEcoMode !== prevState.isEcoMode ||
        state.ecoConfig !== prevState.ecoConfig;

      if (fxChanged) {
        const masterFX = state.masterFX;
        const fxActive = state.masterEffectsActive || { compressor: true, reverb: true, disto: true };
        const disableFx = Boolean(state.ecoConfig?.disableFx);

        if (masterReverbVolumeNode) {
          const revBypassed = disableFx || !fxActive.reverb || masterFX.reverb.isMuted;
          const revGain = revBypassed ? 0 : Tone.dbToGain(percentToDb(masterFX.reverb.returnVolume));
          safeRampTo(masterReverbVolumeNode.gain, Number.isFinite(revGain) ? revGain : 0, 0.02, 0, 4);
        }

        if (reverbNode) {
          updateStudioReverbNode(reverbNode, {
            decaySec: mapReverbTimeKnobToDecaySec(masterFX.reverb.time),
            spaceType: masterFX.reverb.spaceType,
            preDelayMs: masterFX.reverb.preDelayMs,
            lowCutHz: masterFX.reverb.lowCutHz,
            dampHz: masterFX.reverb.dampHz,
            stereoWidth: masterFX.reverb.stereoWidth,
          });
          if (typeof (reverbNode as any).wet?.rampTo === 'function') {
            (reverbNode as any).wet.rampTo(fxActive.reverb && !masterFX.reverb.isMuted ? 1 : 0, 0.02);
          }
        }

        if (masterDistortionVolumeNode) {
          const distBypassed = disableFx || !fxActive.disto || masterFX.distortion.isMuted;
          const distGain = distBypassed ? 0 : Tone.dbToGain(percentToDb(masterFX.distortion.returnVolume));
          safeRampTo(masterDistortionVolumeNode.gain, Number.isFinite(distGain) ? distGain : 0, 0.02, 0, 4);
        }

        if (distortionNode) {
          updateStudioSaturationNode(
            distortionNode,
            {
              drivePct: masterFX.distortion.drive,
              character: masterFX.distortion.character,
              preHpfHz: masterFX.distortion.preHpfHz,
              toneHz: masterFX.distortion.toneHz,
            },
            state.isEcoMode
          );
          if (typeof distortionNode.wet?.rampTo === 'function') {
            distortionNode.wet.rampTo(fxActive.disto && !masterFX.distortion.isMuted ? 1 : 0, 0.02);
          }
        }

        const busCfg = masterFX.masterBus;
        if (busCfg) {
          syncMasterBusWorkletParams(busCfg);
          syncToadaVocalSlapback(busCfg.toadaSlapbackMode ?? 'off', busCfg.toadaSlapbackWet ?? 0, disableFx);
        } else {
          syncToadaVocalSlapback('off', 0, disableFx);
        }
      }

      const tracksChanged = state.tracks !== prevState.tracks;
      const bypassChanged = state.globalAutomationBypass !== prevState.globalAutomationBypass;

      if (tracksChanged || bypassChanged) {
        if (!isAudioInitializedRef.current) return;
        if (bypassChanged) {
          lastAppliedTracksParamsRef.current = {};
          lastAppliedBussesRef.current = {};
          if (masterVolumeNode?.gain) {
            try { masterVolumeNode.gain.cancelScheduledValues(Tone.now()); } catch (_) {}
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
