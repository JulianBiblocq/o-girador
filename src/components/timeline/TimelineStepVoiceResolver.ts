import { isVoiceStepProlongation } from '../../utils/musicTheory';

export interface VoiceStepData {
  isProlongation: boolean;
  isFollowedByProlongation: boolean;
  syl: string;
  isPux: boolean;
  voiceColor: string;
}

export function resolveVoiceStepData(
  currentTrack: any,
  patternId: number,
  patternIdx: number,
  actualStepIdx: number,
  instId?: string
): VoiceStepData {
  const ptn = (patternId !== -1 ? currentTrack.patterns?.find((p: any) => p.id === patternId) : null) || currentTrack.patterns?.[patternIdx];
  const curVal = ptn?.activeSteps?.[actualStepIdx] ?? 0;
  const curActive = curVal !== 0 && curVal !== '' && curVal !== '0' && curVal !== '-' && !((curVal as any)?.length === 0);
  const curNote = (ptn?.notes?.[actualStepIdx] || '').trim();
  const syl = (ptn?.lyrics?.[actualStepIdx] || '').trim();
  const isPux = curVal === 'P' || instId === 'puxador' || (instId !== 'coro' && curVal !== 'C');
  const voiceColor = isPux ? '#c25e38' : '#2a9d8f';

  let isProlongation = false;
  let isFollowedByProlongation = false;

  if (curActive) {
    const prevVal = actualStepIdx > 0 ? (ptn?.activeSteps?.[actualStepIdx - 1] ?? 0) : 0;
    const prevActive = prevVal !== 0 && prevVal !== '' && prevVal !== '0' && prevVal !== '-' && !((prevVal as any)?.length === 0);
    const prevNote = actualStepIdx > 0 ? (ptn?.notes?.[actualStepIdx - 1] || '').trim() : '';
    const nextVal = actualStepIdx < (ptn?.steps ?? 16) - 1 ? (ptn?.activeSteps?.[actualStepIdx + 1] ?? 0) : 0;
    const nextActive = nextVal !== 0 && nextVal !== '' && nextVal !== '0' && nextVal !== '-' && !((nextVal as any)?.length === 0);
    const nextNote = actualStepIdx < (ptn?.steps ?? 16) - 1 ? (ptn?.notes?.[actualStepIdx + 1] || '').trim() : '';
    const nextSyl = actualStepIdx < (ptn?.steps ?? 16) - 1 ? (ptn?.lyrics?.[actualStepIdx + 1] || '').trim() : '';
    isProlongation = isVoiceStepProlongation(curActive, prevActive, curNote, prevNote, syl);
    isFollowedByProlongation = isVoiceStepProlongation(nextActive, curActive, nextNote, curNote, nextSyl);
  }

  return { isProlongation, isFollowedByProlongation, syl, isPux, voiceColor };
}
