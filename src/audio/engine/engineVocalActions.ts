/**
 * O Girador - Audio Engine Vocal Synthesizer Facade Actions
 */

import { VocalPresetId } from '../vocalPresets';
import { EngineVoiceSynthManager } from './engineVoiceSynth';
import { EngineVoiceTriggers } from './engineVoiceTriggers';

export class EngineVocalActions {
  public static triggerPitch(
    audioCtx: AudioContext,
    mgr: EngineVoiceSynthManager,
    pitch: string | number,
    vel = 0.8,
    trackId?: string | number
  ): void {
    EngineVoiceTriggers.triggerVoicePitch(audioCtx, mgr, pitch, vel, trackId);
  }

  public static triggerAttackRelease(
    audioCtx: AudioContext,
    mgr: EngineVoiceSynthManager,
    pitch: string | number,
    dur: number | string,
    time?: number,
    vel = 0.8,
    trackId?: string | number
  ): void {
    EngineVoiceTriggers.triggerVoiceAttackRelease(audioCtx, mgr, pitch, dur, time, vel, trackId);
  }

  public static releasePitch(
    mgr: EngineVoiceSynthManager,
    pitch?: string | number,
    trackId?: string | number
  ): void {
    EngineVoiceTriggers.releaseVoicePitch(mgr, pitch, trackId);
  }

  public static initSynth(mgr: EngineVoiceSynthManager, presetId?: VocalPresetId, channels?: Map<string, any>): void {
    mgr.initVoiceSynth(presetId, channels);
  }

  public static applyPreset(mgr: EngineVoiceSynthManager, presetId: VocalPresetId, channels?: Map<string, any>): void {
    mgr.applyVocalPreset(presetId, channels);
  }

  public static getOrCreateSynth(mgr: EngineVoiceSynthManager, trackId?: string | number, channels?: Map<string, any>): any {
    return mgr.getOrCreateVoiceSynth(trackId, channels);
  }
}
