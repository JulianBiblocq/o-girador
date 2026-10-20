import * as Tone from 'tone';
import { TrackGroup } from '../../types';
import { channels, busChannels, reverbSends } from './audioEngineNodes';
import { faderPositionToGain } from '../../utils/audioMath';
import { getEffectiveVolume } from '../../stores/useSequencerStore';

interface ScheduleAutomationProps {
  tracks: TrackGroup[];
  currentMeasureIdx: number;
  prevMeasureIdx: number;
  measureDurationSec: number;
  time: number;
}

export function scheduleMeasureAutomationRamps({
  tracks,
  currentMeasureIdx,
  prevMeasureIdx,
  measureDurationSec,
  time,
}: ScheduleAutomationProps): void {
  tracks.forEach((t) => {
    const channel = t.isBusFolder ? busChannels[t.id] : channels[t.id];
    if (!channel) return;

    // 1. Automation Volume
    if (!t.automationBypass?.volume && t.measureVols && t.measureVols.length && channel.volume) {
      try {
        const isConnectedToBus = Boolean(t.busId && busChannels?.[t.busId]);
        const baseEffectiveVol = isConnectedToBus ? (t.volumeVal ?? 75) : getEffectiveVolume(tracks, t.id);
        const baseGain = faderPositionToGain(baseEffectiveVol);

        const rawTargetVol = t.measureVols[currentMeasureIdx] !== undefined ? t.measureVols[currentMeasureIdx] : 75;
        const rawPrevVol = t.measureVols[prevMeasureIdx] !== undefined ? t.measureVols[prevMeasureIdx] : 75;
        const trackTransition = t.measureVolTransitions?.[currentMeasureIdx] || 'immediate';

        const startGain = Math.max(0.00001, baseGain * faderPositionToGain(rawPrevVol));
        const endGain = Math.max(0.00001, baseGain * faderPositionToGain(rawTargetVol));

        channel.volume.cancelScheduledValues(time);

        if (startGain !== endGain) {
          if (trackTransition === 'ramp') {
            channel.volume.setValueAtTime(Tone.gainToDb(startGain), time);
            channel.volume.linearRampToValueAtTime(Tone.gainToDb(endGain), time + measureDurationSec);
          } else if (trackTransition === 'bezier') {
            channel.volume.setValueAtTime(Tone.gainToDb(startGain), time);
            channel.volume.exponentialRampToValueAtTime(Tone.gainToDb(endGain), time + measureDurationSec);
          } else {
            channel.volume.setValueAtTime(Tone.gainToDb(endGain), time);
          }
        } else {
          channel.volume.setValueAtTime(Tone.gainToDb(endGain), time);
        }
      } catch (_) {}
    }

    // 2. Automation Pan
    if (!t.automationBypass?.pan && t.measurePans && t.measurePans.length && channel.pan) {
      try {
        const defaultPan = t.panVal ?? t.pan ?? 0;
        const rawTargetPan = t.measurePans[currentMeasureIdx] !== undefined ? t.measurePans[currentMeasureIdx] : defaultPan;
        const rawPrevPan = t.measurePans[prevMeasureIdx] !== undefined ? t.measurePans[prevMeasureIdx] : defaultPan;
        const panTransition = t.measurePanTransitions?.[currentMeasureIdx] || 'immediate';

        const startPan = Math.max(-1, Math.min(1, rawPrevPan / 100));
        const endPan = Math.max(-1, Math.min(1, rawTargetPan / 100));

        channel.pan.cancelScheduledValues(time);

        if (startPan !== endPan) {
          if (panTransition === 'ramp') {
            channel.pan.setValueAtTime(startPan, time);
            channel.pan.linearRampToValueAtTime(endPan, time + measureDurationSec);
          } else if (panTransition === 'bezier') {
            const steps = 8;
            const curve: number[] = [];
            for (let i = 0; i < steps; i++) {
              const tNorm = i / (steps - 1);
              const ease = tNorm * tNorm * (3 - 2 * tNorm);
              curve.push(startPan + (endPan - startPan) * ease);
            }
            try {
              channel.pan.setValueCurveAtTime(curve, time, measureDurationSec);
            } catch (_) {
              channel.pan.setValueAtTime(startPan, time);
              channel.pan.linearRampToValueAtTime(endPan, time + measureDurationSec);
            }
          } else {
            channel.pan.setValueAtTime(endPan, time);
          }
        } else {
          channel.pan.setValueAtTime(endPan, time);
        }
      } catch (_) {}
    }

    // 3. Automation Send Réverbe
    const sendNode = reverbSends[t.id];
    if (!t.automationBypass?.reverb && t.measureReverbSends && t.measureReverbSends.length && sendNode?.gain) {
      try {
        const defaultRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
        const rawTargetRev = t.measureReverbSends[currentMeasureIdx] !== undefined ? t.measureReverbSends[currentMeasureIdx] : defaultRev;
        const rawPrevRev = t.measureReverbSends[prevMeasureIdx] !== undefined ? t.measureReverbSends[prevMeasureIdx] : defaultRev;
        const revTransition = t.measureReverbTransitions?.[currentMeasureIdx] || 'immediate';

        const isDb = sendNode.gain.units === 'decibels';
        const startVal = isDb
          ? (rawPrevRev <= 0 ? -Infinity : Tone.gainToDb(Math.max(0.0001, rawPrevRev / 100)))
          : Math.max(0, Math.min(1, rawPrevRev / 100));
        const endVal = isDb
          ? (rawTargetRev <= 0 ? -Infinity : Tone.gainToDb(Math.max(0.0001, rawTargetRev / 100)))
          : Math.max(0, Math.min(1, rawTargetRev / 100));

        sendNode.gain.cancelScheduledValues(time);

        if (startVal !== endVal) {
          if (revTransition === 'ramp') {
            sendNode.gain.setValueAtTime(startVal, time);
            sendNode.gain.linearRampToValueAtTime(endVal, time + measureDurationSec);
          } else if (revTransition === 'bezier') {
            const steps = 8;
            const curve = new Float32Array(steps);
            for (let i = 0; i < steps; i++) {
              const tNorm = i / (steps - 1);
              const ease = tNorm * tNorm * (3 - 2 * tNorm);
              curve[i] = startVal + (endVal - startVal) * ease;
            }
            try {
              sendNode.gain.setValueCurveAtTime(curve, time, measureDurationSec);
            } catch (_) {
              sendNode.gain.setValueAtTime(startVal, time);
              sendNode.gain.linearRampToValueAtTime(endVal, time + measureDurationSec);
            }
          } else {
            sendNode.gain.setValueAtTime(endVal, time);
          }
        } else {
          sendNode.gain.setValueAtTime(endVal, time);
        }
      } catch (_) {}
    }
  });
}
