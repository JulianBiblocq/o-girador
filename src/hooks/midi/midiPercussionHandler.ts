import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { instrumentsConfig } from '../../data';
import { getStrokesForInstrument } from '../../utils/instrumentStrokes';
import { writePercussionStepAndAdvance } from './midiPercussionStepWriter';

export function handleMidiPercussionNote(
  note: number,
  velocity: number,
  target: any,
  seqStore: any
): void {
  const { isPatternRecording, armedPatternId, armedTrackId, updatePatternStep, tracks, lang, isLeftHanded } = seqStore;
  const editingTrackId = seqStore.editingTrackId;
  let strokeChar = target?.symbol;

  const effectiveTrackId = (target ? target.trackId : null) ?? editingTrackId ?? armedTrackId;
  const targetTrack = tracks.find((t: any) => t.id === effectiveTrackId);

  if (!strokeChar && targetTrack) {
    const inst = instrumentsConfig[targetTrack.instrumentIdx];
    if (inst) {
      const strokes = getStrokesForInstrument(inst.id, inst.type, lang || 'fr', isLeftHanded || false);
      if (strokes.length > 0) {
        const strokeIndex = (note % strokes.length + strokes.length) % strokes.length;
        strokeChar = strokes[strokeIndex]?.symbol || strokes[0]?.symbol || 'D';
      }
    }
  }
  if (!strokeChar) strokeChar = 'D';

  const trackIdToPlay: number | string | null = targetTrack?.id ?? target?.trackId ?? armedTrackId ?? editingTrackId;

  // 1. Audio bypass zero-latence
  if (audioEngine && trackIdToPlay !== null) {
    audioEngine.playNote(trackIdToPlay, strokeChar, Tone.now(), velocity / 127.0, 1.0);

    if (target) {
      const domElements = document.querySelectorAll(`[data-midi-target="${target.instrumentId}-${target.symbol}"]`);
      domElements.forEach(el => {
        (el as HTMLElement).animate([
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0.4, transform: 'scale(0.85)' },
          { opacity: 1, transform: 'scale(1)' }
        ], { duration: 120, easing: 'ease-out' });
      });
    }
  }

  // 2. Enregistrement en direct pendant la lecture
  if (isPatternRecording && armedPatternId !== null && armedTrackId !== null) {
    const armedTrack = tracks.find((t: any) => t.id === armedTrackId);
    const armedPattern = armedTrack?.patterns.find((p: any) => p.id === armedPatternId);
    if (!armedTrack || !armedPattern) return;

    const stepsCount = armedPattern.steps || 16;
    const ppq = Tone.Transport.PPQ || 192;
    const patternTicks = stepsCount * (ppq / 4);
    const currentTick = Math.max(0, Tone.Transport.ticks) % patternTicks;
    const targetStep = (Math.round(currentTick / (patternTicks / stepsCount)) % stepsCount + stepsCount) % stepsCount;

    const currentVal = armedPattern.activeSteps?.[targetStep];
    let finalVal: string | number | [string, string] = strokeChar;

    if (currentVal && currentVal !== 0 && currentVal !== '0') {
      if (Array.isArray(currentVal)) {
        finalVal = [currentVal[0], strokeChar];
      } else if (typeof currentVal === 'string') {
        finalVal = currentVal !== strokeChar ? [currentVal, strokeChar] : strokeChar;
      }
    }

    updatePatternStep(armedTrackId, armedPatternId, targetStep, finalVal);

    const cellElements = document.querySelectorAll<HTMLElement>(
      `[data-pattern-id="${armedPatternId}"][data-step-index="${targetStep}"]`
    );
    cellElements.forEach(cellEl => {
      cellEl.animate([
        { transform: 'scale(1.25)', filter: 'brightness(1.8)', opacity: 1 },
        { transform: 'scale(1)', filter: 'brightness(1)', opacity: 1 }
      ], { duration: 160, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
    });
    return;
  }

  // 3. Saisie pas-à-pas hors lecture
  writePercussionStepAndAdvance(targetTrack, strokeChar, seqStore);
}
