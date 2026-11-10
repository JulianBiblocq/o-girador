import * as Tone from 'tone';
import type { MasterBusWorkletManager } from '../worklet/master-bus/MasterBusWorkletManager';

export let masterVolumeNode: Tone.Gain | null = null;
export function setMasterVolumeNode(node: Tone.Gain | null) { masterVolumeNode = node; }

export let masterVocalInputNode: Tone.Gain | null = null;
export function setMasterVocalInputNode(node: Tone.Gain | null) { masterVocalInputNode = node; }

export let masterBusWorkletManager: MasterBusWorkletManager | null = null;
export function setMasterBusWorkletManager(mgr: MasterBusWorkletManager | null) { masterBusWorkletManager = mgr; }

export interface MasterEQNodeInterface {
  low: any;
  mid: any;
  high: any;
  lowFilter?: any;
  midFilter?: any;
  highFilter?: any;
  input?: any;
  output?: any;
}

export let masterEQNode: MasterEQNodeInterface | null = null;
export function setMasterEQNode(node: MasterEQNodeInterface | null) { masterEQNode = node; }

export let masterCompressorNode: Tone.Compressor | null = null;
export function setMasterCompressorNode(node: Tone.Compressor | null) { masterCompressorNode = node; }

export let masterPostLimiterTap: Tone.Gain | null = null;
export function setMasterPostLimiterTap(node: Tone.Gain | null) { masterPostLimiterTap = node; }

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

export const channels: { [trackId: string | number]: Tone.Channel } = {};
export const meters: { [trackId: string | number]: any } = {};
export const reverbSends: { [trackId: string | number]: any } = {};
export const distortionSends: { [trackId: string | number]: any } = {};
export const trackInputs: { [trackId: string | number]: Tone.Gain } = {};
export const busInputs: { [busId: string | number]: Tone.Gain } = {};
export const lowCutNodes: { [trackId: string | number]: Tone.Filter } = {};
export const slaveSubCutNodes: { [trackId: string | number]: Tone.Filter } = {};
export const eqNodes: { 
  [trackId: string | number]: {
    low: Tone.Filter;
    mid: Tone.Filter;
    high: Tone.Filter;
  }
} = {};
export const busChannels: { [busId: string | number]: Tone.Channel } = {};
export const busMeters: { [busId: string | number]: any } = {};
export const busReverbSendVca: { [busId: string | number]: Tone.Gain } = {};
export const busDistoSendVca: { [busId: string | number]: Tone.Gain } = {};
