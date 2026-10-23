import * as Tone from 'tone';

export let masterVolumeNode: Tone.Gain | null = null;
export function setMasterVolumeNode(node: Tone.Gain | null) { masterVolumeNode = node; }

export let masterEQNode: Tone.EQ3 | null = null;
export function setMasterEQNode(node: Tone.EQ3 | null) { masterEQNode = node; }

export let masterCompressorNode: Tone.Compressor | null = null;
export function setMasterCompressorNode(node: Tone.Compressor | null) { masterCompressorNode = node; }

export let masterSoftClipperNode: Tone.WaveShaper | null = null;
export function setMasterSoftClipperNode(node: Tone.WaveShaper | null) { masterSoftClipperNode = node; }

export let masterMeterNode: Tone.Meter | null = null;
export function setMasterMeterNode(node: Tone.Meter | null) { masterMeterNode = node; }

export let masterLeftMeterNode: Tone.Meter | null = null;
export function setMasterLeftMeterNode(node: Tone.Meter | null) { masterLeftMeterNode = node; }

export let masterRightMeterNode: Tone.Meter | null = null;
export function setMasterRightMeterNode(node: Tone.Meter | null) { masterRightMeterNode = node; }

export let masterReverbVolumeNode: Tone.Gain | null = null;
export function setMasterReverbVolumeNode(node: Tone.Gain | null) { masterReverbVolumeNode = node; }

export let reverbNode: Tone.Reverb | null = null;
export function setReverbNode(node: Tone.Reverb | null) { reverbNode = node; }

export let distortionNode: Tone.Distortion | null = null;
export function setDistortionNode(node: Tone.Distortion | null) { distortionNode = node; }

export let masterDistortionVolumeNode: Tone.Gain | null = null;
export function setMasterDistortionVolumeNode(node: Tone.Gain | null) { masterDistortionVolumeNode = node; }

export let reverbBusReceive: Tone.Channel | null = null;
export function setReverbBusReceive(node: Tone.Channel | null) { reverbBusReceive = node; }

export let distortionBusReceive: Tone.Channel | null = null;
export function setDistortionBusReceive(node: Tone.Channel | null) { distortionBusReceive = node; }

export let metroChannel: Tone.Channel | null = null;
export function setMetroChannel(node: Tone.Channel | null) { metroChannel = node; }

export const channels: { [trackId: number]: Tone.Channel } = {};
export const meters: { [trackId: number]: Tone.Meter } = {};
export const reverbSends: { [trackId: number]: any } = {};
export const distortionSends: { [trackId: number]: any } = {};
export const trackInputs: { [trackId: number]: Tone.Gain } = {};
export const lowCutNodes: { [trackId: number]: Tone.Filter } = {};
export const slaveSubCutNodes: { [trackId: number]: Tone.Filter } = {};
export const eqNodes: { 
  [trackId: number]: {
    low: Tone.Filter;
    mid: Tone.Filter;
    high: Tone.Filter;
  }
} = {};
export const busChannels: { [busId: string]: Tone.Channel } = {};
export const busMeters: { [busId: string]: Tone.Meter } = {};
