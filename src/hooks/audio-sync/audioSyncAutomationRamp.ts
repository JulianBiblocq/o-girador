/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Programmation des rampes d'automation audio Web Audio / Tone.js (< 135 lignes).
 */
import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { channels, busChannels, reverbSends, masterVolumeNode } from './audioEngineNodes';
import { faderPositionToGain } from '../../utils/audioMath';
import { getEffectiveVolume, useSequencerStore } from '../../stores/useSequencerStore';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { isAutomationBypassed, isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';

interface ScheduleAutomationProps {
  tracks: TrackGroup[];
  currentMeasureIdx: number;
  prevMeasureIdx: number;
  measureDurationSec: number;
  time: number;
}

function makeEaseCurve(start: number, end: number, steps = 8): number[] {
  const curve: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    curve.push(start + (end - start) * (t * t * (3 - 2 * t)));
  }
  return curve;
}

export function scheduleMeasureAutomationRamps({
  tracks, currentMeasureIdx, prevMeasureIdx, measureDurationSec, time,
}: ScheduleAutomationProps): void {
  const state = useSequencerStore.getState();
  const globalBypass = state.globalAutomationBypass;

  // Master Volume Automation
  const isMasterBypassed = isMasterVolumeBypassedHelper(state.isMasterVolumeBypassed, globalBypass);
  if (!isMasterBypassed && state.measureVols?.length && masterVolumeNode?.gain) {
    try {
      const rawTarget = state.measureVols[currentMeasureIdx] !== undefined ? state.measureVols[currentMeasureIdx] : 100;
      const rawPrev = state.measureVols[prevMeasureIdx] !== undefined ? state.measureVols[prevMeasureIdx] : 100;
      const trans = state.measureVolTransitions?.[currentMeasureIdx] || 'immediate';
      const startG = Math.max(0, rawPrev / 100);
      const endG = Math.max(0, rawTarget / 100);
      masterVolumeNode.gain.cancelScheduledValues(time);
      if (startG !== endG && trans === 'ramp') {
        masterVolumeNode.gain.setValueAtTime(startG, time);
        masterVolumeNode.gain.linearRampToValueAtTime(endG, time + measureDurationSec);
      } else {
        masterVolumeNode.gain.setValueAtTime(endG, time);
      }
    } catch (_) {}
  }

  // Pistes & Bus
  tracks.forEach((t) => {
    const channel = t.isBusFolder ? busChannels[t.id] : channels[t.id];
    if (!channel) return;

    // 1. Volume
    if (!isAutomationBypassed(t, 'volume', globalBypass) && t.measureVols?.length && channel.volume) {
      try {
        const isConnected = Boolean(t.busId && busChannels?.[t.busId]);
        const baseGain = faderPositionToGain(isConnected ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id));
        const rawTarget = t.measureVols[currentMeasureIdx] !== undefined ? t.measureVols[currentMeasureIdx] : 75;
        const rawPrev = t.measureVols[prevMeasureIdx] !== undefined ? t.measureVols[prevMeasureIdx] : 75;
        const trans = t.measureVolTransitions?.[currentMeasureIdx] || 'immediate';
        const startG = Math.max(0.00001, baseGain * faderPositionToGain(rawPrev));
        const endG = Math.max(0.00001, baseGain * faderPositionToGain(rawTarget));
        channel.volume.cancelScheduledValues(time);
        if (startG !== endG) {
          channel.volume.setValueAtTime(Tone.gainToDb(startG), time);
          if (trans === 'bezier') channel.volume.exponentialRampToValueAtTime(Tone.gainToDb(endG), time + measureDurationSec);
          else channel.volume.linearRampToValueAtTime(Tone.gainToDb(endG), time + measureDurationSec);
        } else {
          channel.volume.setValueAtTime(Tone.gainToDb(endG), time);
        }
      } catch (_) {}
    }

    // 2. Pan
    if (!isAutomationBypassed(t, 'pan', globalBypass) && t.measurePans?.length && channel.pan) {
      try {
        const dPan = t.panVal ?? t.pan ?? 0;
        const rawTarget = t.measurePans[currentMeasureIdx] !== undefined ? t.measurePans[currentMeasureIdx] : dPan;
        const rawPrev = t.measurePans[prevMeasureIdx] !== undefined ? t.measurePans[prevMeasureIdx] : dPan;
        const trans = t.measurePanTransitions?.[currentMeasureIdx] || 'immediate';
        const startP = applyMonoCompatiblePan(rawPrev).acousticPan;
        const endP = applyMonoCompatiblePan(rawTarget).acousticPan;
        channel.pan.cancelScheduledValues(time);
        if (startP !== endP) {
          if (trans === 'bezier') {
            try { channel.pan.setValueCurveAtTime(makeEaseCurve(startP, endP), time, measureDurationSec); }
            catch (_) { channel.pan.linearRampToValueAtTime(endP, time + measureDurationSec); }
          } else {
            channel.pan.setValueAtTime(startP, time);
            channel.pan.linearRampToValueAtTime(endP, time + measureDurationSec);
          }
        } else {
          channel.pan.setValueAtTime(endP, time);
        }
      } catch (_) {}
    }

    // 3. Reverb Send
    const send = reverbSends[t.id];
    if (!isAutomationBypassed(t, 'reverb', globalBypass) && t.measureReverbSends?.length && send?.gain) {
      try {
        const dRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
        const rawTarget = t.measureReverbSends[currentMeasureIdx] !== undefined ? t.measureReverbSends[currentMeasureIdx] : dRev;
        const rawPrev = t.measureReverbSends[prevMeasureIdx] !== undefined ? t.measureReverbSends[prevMeasureIdx] : dRev;
        const trans = t.measureReverbTransitions?.[currentMeasureIdx] || 'immediate';
        const isDb = send.gain.units === 'decibels';
        const toVal = (r: number) => isDb ? (r <= 0 ? -100 : Tone.gainToDb(Math.max(0.0001, r / 100))) : Math.max(0, Math.min(1, r / 100));
        const startVal = toVal(rawPrev);
        const endVal = toVal(rawTarget);
        send.gain.cancelScheduledValues(time);
        if (startVal !== endVal) {
          if (trans === 'bezier') {
            try { send.gain.setValueCurveAtTime(makeEaseCurve(startVal, endVal), time, measureDurationSec); }
            catch (_) { send.gain.linearRampToValueAtTime(endVal, time + measureDurationSec); }
          } else {
            send.gain.setValueAtTime(startVal, time);
            send.gain.linearRampToValueAtTime(endVal, time + measureDurationSec);
          }
        } else {
          send.gain.setValueAtTime(endVal, time);
        }
      } catch (_) {}
    }
  });
}
