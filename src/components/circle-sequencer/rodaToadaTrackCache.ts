import { InstrumentConfig, Pattern } from '../../types';
import { extractVoiceSteps, VoiceStepData } from './voiceStepExtraction';
import { buildVoiceBlocks, VoiceBlock } from './voiceBlockHelpers';

export interface CachedToadaGeometry {
  puxSteps: VoiceStepData[];
  coroSteps: VoiceStepData[];
  puxBlocks: VoiceBlock[];
  coroBlocks: VoiceBlock[];
}

interface ToadaCacheEntry {
  effectiveStepCount: number;
  hasSeparateVoiceTracks: boolean;
  puxPattern: Pattern | null;
  coroPattern: Pattern | null;
  nextPuxPattern: Pattern | null;
  nextCoroPattern: Pattern | null;
  prevPuxPattern: Pattern | null;
  prevCoroPattern: Pattern | null;
  activePattern: Pattern | null;
  instId: string;
  puxPlayingSteps: any;
  coroPlayingSteps: any;
  activePlayingSteps: any;
  soloPlayId: number | null | undefined;
  currentStepBucket: number;
  stepsInFirstBeat: number;
  stepsInLastBeat: number;
  result: CachedToadaGeometry;
}

const toadaCacheByTrack = new Map<number, ToadaCacheEntry>();

export function clearRodaToadaTrackCache(): void {
  toadaCacheByTrack.clear();
}

export function resolveCachedToadaStepsAndBlocks(params: {
  trackId: number;
  effectiveStepCount: number;
  hasSeparateVoiceTracks: boolean;
  puxPattern: Pattern | null;
  coroPattern: Pattern | null;
  nextPuxPattern: Pattern | null;
  nextCoroPattern: Pattern | null;
  prevPuxPattern: Pattern | null;
  prevCoroPattern: Pattern | null;
  activePattern: Pattern | null;
  currentInst: InstrumentConfig;
  puxPlayingSteps: any;
  coroPlayingSteps: any;
  activePlayingSteps: any;
  soloPlayId: number | null | undefined;
  currentStep: number;
  stepsInFirstBeat: number;
  stepsInLastBeat: number;
}): CachedToadaGeometry {
  const { trackId, effectiveStepCount, currentStep } = params;
  const currentStepBucket = currentStep < 0 ? -1 : currentStep;
  const prev = toadaCacheByTrack.get(trackId);

  if (
    prev &&
    prev.effectiveStepCount === effectiveStepCount &&
    prev.hasSeparateVoiceTracks === params.hasSeparateVoiceTracks &&
    prev.puxPattern === params.puxPattern &&
    prev.coroPattern === params.coroPattern &&
    prev.nextPuxPattern === params.nextPuxPattern &&
    prev.nextCoroPattern === params.nextCoroPattern &&
    prev.prevPuxPattern === params.prevPuxPattern &&
    prev.prevCoroPattern === params.prevCoroPattern &&
    prev.activePattern === params.activePattern &&
    prev.instId === params.currentInst.id &&
    prev.puxPlayingSteps === params.puxPlayingSteps &&
    prev.coroPlayingSteps === params.coroPlayingSteps &&
    prev.activePlayingSteps === params.activePlayingSteps &&
    prev.soloPlayId === params.soloPlayId &&
    prev.currentStepBucket === currentStepBucket &&
    prev.stepsInFirstBeat === params.stepsInFirstBeat &&
    prev.stepsInLastBeat === params.stepsInLastBeat
  ) {
    return prev.result;
  }

  const { puxSteps, coroSteps } = extractVoiceSteps(
    effectiveStepCount, params.hasSeparateVoiceTracks, params.puxPattern, params.coroPattern,
    params.nextPuxPattern, params.nextCoroPattern, params.activePattern as any, params.currentInst,
    params.puxPlayingSteps, params.coroPlayingSteps, params.activePlayingSteps, params.soloPlayId,
    params.prevPuxPattern, params.prevCoroPattern, currentStep, params.stepsInFirstBeat, params.stepsInLastBeat
  );
  const result: CachedToadaGeometry = {
    puxSteps,
    coroSteps,
    puxBlocks: buildVoiceBlocks(puxSteps, effectiveStepCount),
    coroBlocks: buildVoiceBlocks(coroSteps, effectiveStepCount),
  };
  if (toadaCacheByTrack.size > 16) toadaCacheByTrack.clear();
  toadaCacheByTrack.set(trackId, {
    effectiveStepCount, hasSeparateVoiceTracks: params.hasSeparateVoiceTracks,
    puxPattern: params.puxPattern, coroPattern: params.coroPattern,
    nextPuxPattern: params.nextPuxPattern, nextCoroPattern: params.nextCoroPattern,
    prevPuxPattern: params.prevPuxPattern, prevCoroPattern: params.prevCoroPattern,
    activePattern: params.activePattern, instId: params.currentInst.id,
    puxPlayingSteps: params.puxPlayingSteps, coroPlayingSteps: params.coroPlayingSteps,
    activePlayingSteps: params.activePlayingSteps, soloPlayId: params.soloPlayId,
    currentStepBucket, stepsInFirstBeat: params.stepsInFirstBeat, stepsInLastBeat: params.stepsInLastBeat,
    result,
  });
  return result;
}
