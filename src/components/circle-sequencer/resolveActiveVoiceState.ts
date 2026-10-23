
import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { resolvePatternForMeasure, getDefaultStepsForMeasure, getPhysicalStepFromRatio } from './measurePatternHelpers';

export interface ActiveVoiceState {
  activePattern: Pattern | null | undefined;
  activeRole: 'puxador' | 'coro' | 'none';
  isAnacrusis: boolean;
  currentStep: number;
  totalSteps: number;
}

export function resolveActiveVoiceState(
  live: { step: number; measure: number; maxTicks: number; ratio: number; isPreRoll?: boolean },
  rawTracks: TrackGroup[],
  totalMeasures: number,
  isLoopRegionActive?: boolean,
  loopStartMeasure?: number | null,
  loopEndMeasure?: number | null,
  soloPlayId?: number | null,
  timeSig?: string,
  measureTimeSigs?: Record<number, string> | string[]
): ActiveVoiceState {
  const totalM = totalMeasures || 1;
  const measureIdx = live.step >= 0 ? Math.max(0, Math.min(live.measure, totalM - 1)) : 0;
  const effectiveTimeSig = (measureTimeSigs && (Array.isArray(measureTimeSigs) ? measureTimeSigs[measureIdx] : measureTimeSigs[measureIdx])) || timeSig || '4/4';
  const beatsCount = getBeatsPerMeasure(effectiveTimeSig);

  let puxTrack = rawTracks.find(t => {
    const inst = instrumentsConfig[t.instrumentIdx];
    return inst?.id === 'puxador' || String(t.id) === 'puxador' || (t as any).name === 'puxador' || t.customName?.toLowerCase() === 'puxador';
  });
  let coroTrack = rawTracks.find(t => {
    const inst = instrumentsConfig[t.instrumentIdx];
    return inst?.id === 'coro' || String(t.id) === 'coro' || (t as any).name === 'coro' || t.customName?.toLowerCase() === 'coro';
  });

  if (!puxTrack && !coroTrack) {
    puxTrack = rawTracks.find(t => {
      const inst = instrumentsConfig[t.instrumentIdx];
      if (inst?.type === 'voice') return true;
      return t.patterns?.some(p => p.lyrics && p.lyrics.some(l => l && l.trim() && l.trim() !== '-'));
    });
  }

  const puxPattern = resolvePatternForMeasure(puxTrack, measureIdx, soloPlayId) || puxTrack?.patterns?.[0];
  const coroPattern = resolvePatternForMeasure(coroTrack, measureIdx, soloPlayId) || coroTrack?.patterns?.[0];

  let nextMeasureIdx: number;
  if (isLoopRegionActive && loopEndMeasure !== null && loopEndMeasure !== undefined && measureIdx === loopEndMeasure) {
    nextMeasureIdx = (loopStartMeasure !== null && loopStartMeasure !== undefined) ? loopStartMeasure : 0;
  } else {
    nextMeasureIdx = (measureIdx + 1) % totalM;
  }

  const candidatePattern = puxPattern || coroPattern;
  const totalSteps = candidatePattern?.steps || (candidatePattern?.beatResolutions ? candidatePattern.beatResolutions.reduce((a, b) => a + b, 0) : getDefaultStepsForMeasure(measureIdx, timeSig, measureTimeSigs));

  const currentRatio = (live.ratio !== undefined && !isNaN(live.ratio))
    ? live.ratio
    : (live.step >= 0 && live.maxTicks > 0 ? live.step / live.maxTicks : 0);

  const currentStep = (live.step >= 0)
    ? getPhysicalStepFromRatio(currentRatio, candidatePattern, totalSteps, beatsCount)
    : 0;

  const stepsInLastBeat = candidatePattern?.beatResolutions && candidatePattern.beatResolutions.length > 0
    ? candidatePattern.beatResolutions[candidatePattern.beatResolutions.length - 1]
    : Math.max(1, Math.floor(totalSteps / beatsCount));
  const anacrusisThreshold = Math.max(0, totalSteps - stepsInLastBeat);

  let isAnacrusis = Boolean(live.isPreRoll);
  let activePattern: Pattern | null | undefined = undefined;
  let activeRole: 'puxador' | 'coro' | 'none' = 'none';

  if (isAnacrusis) {
    const nextPuxPre = puxPattern?.preRollActiveSteps;
    const nextCoroPre = coroPattern?.preRollActiveSteps;
    const hasPuxPre = Boolean(nextPuxPre && Object.values(nextPuxPre).some(v => v && v !== 0 && v !== '0'));
    const hasCoroPre = Boolean(nextCoroPre && Object.values(nextCoroPre).some(v => v && v !== 0 && v !== '0'));
    if (hasPuxPre) {
      activeRole = 'puxador';
      activePattern = puxPattern;
    } else if (hasCoroPre) {
      activeRole = 'coro';
      activePattern = coroPattern;
    }
  } else if (currentStep >= anacrusisThreshold) {
    const nextPuxPattern = resolvePatternForMeasure(puxTrack, nextMeasureIdx, soloPlayId);
    const nextCoroPattern = resolvePatternForMeasure(coroTrack, nextMeasureIdx, soloPlayId);
    const nextPuxPre = nextPuxPattern?.preRollActiveSteps?.[currentStep];
    const nextCoroPre = nextCoroPattern?.preRollActiveSteps?.[currentStep];
    const hasNextPuxPre = Boolean(nextPuxPre && nextPuxPre !== 0 && nextPuxPre !== '0');
    const hasNextCoroPre = Boolean(nextCoroPre && nextCoroPre !== 0 && nextCoroPre !== '0');

    if (hasNextPuxPre || hasNextCoroPre) {
      isAnacrusis = true;
      activeRole = hasNextPuxPre ? 'puxador' : 'coro';
      activePattern = hasNextPuxPre ? nextPuxPattern : nextCoroPattern;
    }
  }

  if (!isAnacrusis) {
    const puxHasNotes = Boolean(puxPattern?.activeSteps && Object.values(puxPattern.activeSteps).some(v => v && v !== 0 && v !== '0'));
    const coroHasNotes = Boolean(coroPattern?.activeSteps && Object.values(coroPattern.activeSteps).some(v => v && v !== 0 && v !== '0'));

    if (puxHasNotes && coroHasNotes) {
      const puxHitNow = Boolean(puxPattern?.activeSteps?.[currentStep] && puxPattern.activeSteps[currentStep] !== 0);
      const coroHitNow = Boolean(coroPattern?.activeSteps?.[currentStep] && coroPattern.activeSteps[currentStep] !== 0);
      activeRole = (!puxHitNow && coroHitNow) ? 'coro' : 'puxador';
      activePattern = (!puxHitNow && coroHitNow) ? coroPattern : puxPattern;
    } else if (puxHasNotes) {
      activeRole = 'puxador';
      activePattern = puxPattern;
    } else if (coroHasNotes) {
      activeRole = 'coro';
      activePattern = coroPattern;
    }
  }

  return { activePattern, activeRole, isAnacrusis, currentStep, totalSteps };
}
