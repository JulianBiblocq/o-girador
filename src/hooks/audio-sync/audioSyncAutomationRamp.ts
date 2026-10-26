/**
 * Programmation des rampes d'automation audio Web Audio / Tone.js (< 130 lignes).
 */
import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { channels, busChannels, busInputs, reverbSends } from './audioEngineNodes';
import { faderPositionToDb } from '../../utils/audioMath';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { applyMonoCompatiblePan } from '../../utils/audio/monoCompatiblePan';
import { isAutomationBypassed } from '../../utils/automationBypassHelper';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';
import { scheduleMasterVolumeRamp } from './audioSyncMasterRamp';

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

function applyParamTransition(
  param: any, start: number, end: number, trans: string, time: number, dur: number
): void {
  param.cancelScheduledValues(time);
  if (start !== end && trans !== 'immediate') {
    if (trans === 'bezier') {
      try { param.setValueCurveAtTime(makeEaseCurve(start, end), time, dur); return; } catch (_) {}
    }
    param.setValueAtTime(start, time);
    param.linearRampToValueAtTime(end, time + dur);
  } else {
    param.setValueAtTime(end, time);
  }
}

export function scheduleMeasureAutomationRamps({
  tracks, currentMeasureIdx, prevMeasureIdx, measureDurationSec, time,
}: ScheduleAutomationProps): void {
  const state = useSequencerStore.getState();
  const globalBypass = state.globalAutomationBypass;

  // Master Volume Automation
  scheduleMasterVolumeRamp(state, currentMeasureIdx, prevMeasureIdx, measureDurationSec, time);

  // Pistes & Bus
  tracks.forEach((t) => {
    const isGroupBus = Boolean(t.isBusFolder || t.isLinkFolder);
    const channel = isGroupBus ? busChannels[t.id] : channels[t.id];
    if (!channel) return;

    // 1. Volume
    if (!isAutomationBypassed(t, 'volume', globalBypass) && hasActiveTrackAutomation(t, 'volume') && t.measureVols?.length && channel.volume) {
      try {
        const defaultVol = t.volumeVal ?? 75;
        const rawTarget = t.measureVols[currentMeasureIdx] !== undefined ? t.measureVols[currentMeasureIdx] : defaultVol;
        const rawPrev = t.measureVols[prevMeasureIdx] !== undefined ? t.measureVols[prevMeasureIdx] : defaultVol;
        const trans = t.measureVolTransitions?.[currentMeasureIdx] || 'immediate';

        const targetBusId = t.busId || (t.linkedToTrackId ? t.linkedToTrackId : null);
        const isConnectedToBus = Boolean(targetBusId && (busInputs[targetBusId] || busChannels[targetBusId]));
        void isConnectedToBus;

        const activePanVal = (!isAutomationBypassed(t, 'pan', globalBypass) && hasActiveTrackAutomation(t, 'pan') && t.measurePans?.[currentMeasureIdx] !== undefined)
          ? t.measurePans[currentMeasureIdx]
          : (t.panVal ?? t.pan ?? 0);
        const { panCompensationDb } = isGroupBus ? { panCompensationDb: 0 } : applyMonoCompatiblePan(activePanVal);

        const toTrackDb = (pos: number): number => {
          const rawDb = faderPositionToDb(pos);
          const safeDb = Number.isFinite(rawDb) ? Math.max(-100, Math.min(12, rawDb)) : -100;
          return safeDb > -90 ? Math.min(12, safeDb + panCompensationDb) : safeDb;
        };

        applyParamTransition(channel.volume, toTrackDb(rawPrev), toTrackDb(rawTarget), trans, time, measureDurationSec);
      } catch (_) {}
    }

    // 2. Pan
    if (!isAutomationBypassed(t, 'pan', globalBypass) && hasActiveTrackAutomation(t, 'pan') && t.measurePans?.length && channel.pan) {
      try {
        const dPan = t.panVal ?? t.pan ?? 0;
        const rawTarget = t.measurePans[currentMeasureIdx] !== undefined ? t.measurePans[currentMeasureIdx] : dPan;
        const rawPrev = t.measurePans[prevMeasureIdx] !== undefined ? t.measurePans[prevMeasureIdx] : dPan;
        const trans = t.measurePanTransitions?.[currentMeasureIdx] || 'immediate';
        const startP = applyMonoCompatiblePan(rawPrev).acousticPan;
        const endP = applyMonoCompatiblePan(rawTarget).acousticPan;
        applyParamTransition(channel.pan, startP, endP, trans, time, measureDurationSec);
      } catch (_) {}
    }

    // 3. Reverb Send
    const send = reverbSends[t.id];
    if (!isAutomationBypassed(t, 'reverb', globalBypass) && hasActiveTrackAutomation(t, 'reverb') && t.measureReverbSends?.length && send?.gain) {
      try {
        const dRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
        const rawTarget = t.measureReverbSends[currentMeasureIdx] !== undefined ? t.measureReverbSends[currentMeasureIdx] : dRev;
        const rawPrev = t.measureReverbSends[prevMeasureIdx] !== undefined ? t.measureReverbSends[prevMeasureIdx] : dRev;
        const trans = t.measureReverbTransitions?.[currentMeasureIdx] || 'immediate';
        const isDb = send.gain.units === 'decibels';
        const toVal = (r: number) => isDb ? (r <= 0 ? -100 : Tone.gainToDb(Math.max(0.0001, r / 100))) : Math.max(0, Math.min(1, r / 100));
        applyParamTransition(send.gain, toVal(rawPrev), toVal(rawTarget), trans, time, measureDurationSec);
      } catch (_) {}
    }
  });
}
