
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isVoiceStepProlongation } from '../../utils/musicTheory';

interface ResolveToadaStepVisualProps {
  tracks: TrackGroup[];
  currentMeasure: number;
  stepIdx: number;
  emptyStepBg: string;
}

export function resolveToadaStepVisual({
  tracks,
  currentMeasure,
  stepIdx,
  emptyStepBg,
}: ResolveToadaStepVisualProps) {
  const puxTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || t.customName === 'Puxador');
  const coroTrack = tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || t.customName === 'Coro');

  // 1. Puxador resolution
  const puxOverride = puxTrack?.patternOverrides?.[currentMeasure];
  const puxPattern = puxTrack
    ? (puxOverride === null
        ? null
        : puxOverride !== undefined
        ? puxTrack.patterns?.find(p => p.id === puxOverride)
        : puxTrack.patterns?.find(p => Boolean(p.measureAssignments?.[currentMeasure])) || puxTrack.patterns?.[0] || null)
    : null;

  const puxVal = puxPattern?.activeSteps?.[stepIdx] ?? 0;
  const isPuxActive = puxVal !== 0 && puxVal !== '' && puxVal !== '0' && puxVal !== '-';
  const puxSyl = (puxPattern?.lyrics?.[stepIdx] || '').trim();
  const puxNote = (puxPattern?.notes?.[stepIdx] || '').trim();
  const puxPrevVal = stepIdx > 0 ? (puxPattern?.activeSteps?.[stepIdx - 1] ?? 0) : 0;
  const puxPrevActive = puxPrevVal !== 0 && puxPrevVal !== '' && puxPrevVal !== '0' && puxPrevVal !== '-';
  const puxPrevNote = stepIdx > 0 ? (puxPattern?.notes?.[stepIdx - 1] || '').trim() : '';
  const puxProlongation = isVoiceStepProlongation(isPuxActive, puxPrevActive, puxNote, puxPrevNote, puxSyl);
  const puxDisplay = puxProlongation ? '───' : (puxSyl || puxNote || (isPuxActive ? 'P' : ''));

  // 2. Coro resolution
  const coroOverride = coroTrack?.patternOverrides?.[currentMeasure];
  const coroPattern = coroTrack
    ? (coroOverride === null
        ? null
        : coroOverride !== undefined
        ? coroTrack.patterns?.find(p => p.id === coroOverride)
        : coroTrack.patterns?.find(p => Boolean(p.measureAssignments?.[currentMeasure])) || coroTrack.patterns?.[0] || null)
    : null;

  const coroVal = coroPattern?.activeSteps?.[stepIdx] ?? 0;
  const isCoroActive = coroVal !== 0 && coroVal !== '' && coroVal !== '0' && coroVal !== '-';
  const coroSyl = (coroPattern?.lyrics?.[stepIdx] || '').trim();
  const coroNote = (coroPattern?.notes?.[stepIdx] || '').trim();
  const coroPrevVal = stepIdx > 0 ? (coroPattern?.activeSteps?.[stepIdx - 1] ?? 0) : 0;
  const coroPrevActive = coroPrevVal !== 0 && coroPrevVal !== '' && coroPrevVal !== '0' && coroPrevVal !== '-';
  const coroPrevNote = stepIdx > 0 ? (coroPattern?.notes?.[stepIdx - 1] || '').trim() : '';
  const coroProlongation = isVoiceStepProlongation(isCoroActive, coroPrevActive, coroNote, coroPrevNote, coroSyl);
  const coroDisplay = coroProlongation ? '───' : (coroSyl || coroNote || (isCoroActive ? 'C' : ''));

  // 3. Synthesis logic
  if (isPuxActive && isCoroActive) {
    return {
      isVoice: true,
      isProlongation: false,
      displayVal: '',
      isSplit: true,
      bgColor: emptyStepBg,
      txtColor: 'rgba(26, 26, 26, 0.4)',
      leftBg: '#c25e38',
      leftTxt: '#ffffff',
      leftSym: puxDisplay,
      rightBg: '#2a9d8f',
      rightTxt: '#ffffff',
      rightSym: coroDisplay,
    };
  }

  if (isPuxActive) {
    return {
      isVoice: true,
      isProlongation: puxProlongation,
      displayVal: puxDisplay,
      isSplit: false,
      bgColor: '#c25e38',
      txtColor: puxProlongation ? 'rgba(255, 255, 255, 0.85)' : '#ffffff',
      leftBg: emptyStepBg,
      leftTxt: 'transparent',
      leftSym: '',
      rightBg: emptyStepBg,
      rightTxt: 'transparent',
      rightSym: '',
    };
  }

  if (isCoroActive) {
    return {
      isVoice: true,
      isProlongation: coroProlongation,
      displayVal: coroDisplay,
      isSplit: false,
      bgColor: '#2a9d8f',
      txtColor: coroProlongation ? 'rgba(255, 255, 255, 0.85)' : '#ffffff',
      leftBg: emptyStepBg,
      leftTxt: 'transparent',
      leftSym: '',
      rightBg: emptyStepBg,
      rightTxt: 'transparent',
      rightSym: '',
    };
  }

  return {
    isVoice: true,
    isProlongation: false,
    displayVal: '',
    isSplit: false,
    bgColor: emptyStepBg,
    txtColor: 'rgba(26, 26, 26, 0.4)',
    leftBg: emptyStepBg,
    leftTxt: 'transparent',
    leftSym: '',
    rightBg: emptyStepBg,
    rightTxt: 'transparent',
    rightSym: '',
  };
}
