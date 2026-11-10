import { AudioEngine } from '../../AudioEngine';
import { InputManager } from '../../InputManager';
import {
  masterVolumeNode,
  masterEQNode,
  masterCompressorNode,
  masterPostLimiterTap,
  masterMeterNode,
  masterLeftMeterNode,
  masterRightMeterNode,
  masterReverbVolumeNode,
  reverbNode,
  distortionNode,
  masterDistortionVolumeNode,
  reverbBusReceive,
  distortionBusReceive,
  metroChannel,
  channels,
  meters,
  reverbSends,
  distortionSends,
  trackInputs,
  busInputs,
  busChannels,
  busMeters,
  busReverbSendVca,
  busDistoSendVca
} from '../../audio/effectsChain';
import {
  activeNativeOscillators,
  playNativeMetroClick,
  playNativeVoiceSynth,
  stopAllNativeOscillators
} from '../../audio/nativeSynths';

export const voiceSynths: { [id: string]: any } = {};
export let audioEngine: AudioEngine | null = null;
export let inputManager: InputManager | null = null;

export function setAudioEngine(engine: AudioEngine | null): void {
  audioEngine = engine;
}

export function setInputManager(manager: InputManager | null): void {
  inputManager = manager;
}

export function getAudioEngine(): AudioEngine | null {
  return audioEngine;
}

export function getInputManager(): InputManager | null {
  return inputManager;
}

export {
  masterVolumeNode,
  masterEQNode as masterEQ,
  masterEQNode,
  masterCompressorNode as masterCompressor,
  masterCompressorNode,
  masterPostLimiterTap,
  masterMeterNode,
  masterLeftMeterNode,
  masterRightMeterNode,
  masterReverbVolumeNode,
  reverbNode,
  distortionNode,
  masterDistortionVolumeNode,
  reverbBusReceive,
  distortionBusReceive,
  metroChannel,
  channels,
  meters,
  reverbSends,
  distortionSends,
  trackInputs,
  busInputs,
  busChannels,
  busMeters,
  busReverbSendVca,
  busDistoSendVca,
  activeNativeOscillators,
  playNativeMetroClick,
  playNativeVoiceSynth,
  stopAllNativeOscillators
};
