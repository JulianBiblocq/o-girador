import { TrackGroup, Pattern } from '../../types';
import { getVisualStrokeSymbol, isDarkText } from '../../data';
import { isVoiceStepProlongation } from '../../utils/musicTheory';
import { isToadaBus } from '../../stores/useSequencerStore';
import { resolveLinkedStepVisual } from './dawStepLinkedResolver';
import { resolveToadaStepVisual } from './dawToadaVisualResolver';

export function resolveStepVisual({
  stepIdx,
  val,
  isActiveCell,
  isGhostStep: _isGhostStep,
  curPat,
  inst,
  track,
  tracks,
  currentMeasure,
  isLeftHanded,
  emptyStepBg,
  effectiveTrack,
  activePattern,
}: {
  stepIdx: number;
  val: any;
  isActiveCell: boolean;
  isGhostStep: boolean;
  curPat: Pattern | null;
  inst: any;
  track: TrackGroup;
  tracks: TrackGroup[];
  currentMeasure: number;
  isLeftHanded: boolean;
  emptyStepBg: string;
  effectiveTrack: TrackGroup;
  activePattern: Pattern | null;
}) {
  if (isToadaBus(track) || track.customName === 'Toada' || inst.id === 'toada') {
    return resolveToadaStepVisual({ tracks, currentMeasure, stepIdx, emptyStepBg });
  }

  const isVoice = Boolean(
    inst.type === 'voice' || inst.id === 'toada' || inst.id === 'puxador' || inst.id === 'coro' ||
    track.customName === 'Toada' || track.customName === 'Puxador' || track.customName === 'Coro'
  );

  const curSyl = (curPat?.lyrics?.[stepIdx] || '').trim();
  const curNote = (curPat?.notes?.[stepIdx] || '').trim();
  let isProlongation = false;
  let isPux = true;

  if (isVoice) {
    isPux = val === 'P' || inst.id === 'puxador' || (inst.id !== 'coro' && val !== 'C');
    if (isActiveCell) {
      const prevVal = stepIdx > 0 ? (curPat?.activeSteps?.[stepIdx - 1] ?? 0) : 0;
      const prevIsActive = prevVal !== 0 && prevVal !== '' && prevVal !== '0' && prevVal !== '-';
      const prevNote = stepIdx > 0 ? (curPat?.notes?.[stepIdx - 1] || '').trim() : '';
      isProlongation = isVoiceStepProlongation(isActiveCell, prevIsActive, curNote, prevNote, curSyl);
    }
  }

  const visualVal = getVisualStrokeSymbol(Array.isArray(val) ? val[0] : val, isLeftHanded, inst.id);
  let displayVal = '';
  if (isVoice) {
    displayVal = isProlongation ? '───' : curSyl || curNote || (isActiveCell ? (isPux ? 'P' : 'C') : '');
  } else {
    displayVal = visualVal === 0 ? '' : (Array.isArray(val) ? val.map(v => getVisualStrokeSymbol(v, isLeftHanded, inst.id)).join('') : String(visualVal));
  }

  let masterBg = emptyStepBg;
  let masterTxt = 'rgba(26, 26, 26, 0.4)';
  if (isActiveCell) {
    if (isVoice) {
      masterBg = isPux ? '#c25e38' : '#2a9d8f';
      masterTxt = isProlongation ? 'rgba(255, 255, 255, 0.85)' : '#ffffff';
    } else {
      const primaryVal = String(visualVal);
      masterBg = inst.colors?.[primaryVal] || inst.color || '#111';
      masterTxt = inst.colors?.text || '#f4ecd8';
      if (isDarkText(inst.id, primaryVal)) masterTxt = '#1a1a1a';
    }
  }

  const children = tracks.filter(t => {
    if (t.id === track.id || t.isBusFolder || t.isLinkFolder) return false;
    if (String(t.linkedToTrackId) === String(track.id)) return true;
    if (track.linkedToTrackId && String(t.linkedToTrackId) === String(track.linkedToTrackId)) return true;
    return false;
  });
  if (children.length > 0) {
    const linked = resolveLinkedStepVisual({
      track, tracks, children, currentMeasure, activePattern, effectiveTrack,
      stepIdx, isLeftHanded, isActiveCell, visualVal: Array.isArray(visualVal) ? visualVal[0] : visualVal, displayVal, masterBg, masterTxt, emptyStepBg,
    });
    return { isVoice, isProlongation, ...linked };
  }

  if (Array.isArray(val) && val.length === 2) {
    const lVal = getVisualStrokeSymbol(val[0], isLeftHanded, inst.id);
    const rVal = getVisualStrokeSymbol(val[1], isLeftHanded, inst.id);
    return {
      isVoice,
      isProlongation,
      displayVal,
      isSplit: true,
      bgColor: emptyStepBg,
      txtColor: 'rgba(26, 26, 26, 0.4)',
      leftBg: lVal ? (inst.colors?.[String(lVal)] || inst.color || '#111') : emptyStepBg,
      leftTxt: lVal ? (isDarkText(inst.id, String(lVal)) ? '#1a1a1a' : (inst.colors?.text || '#f4ecd8')) : 'transparent',
      leftSym: lVal ? String(lVal) : '',
      rightBg: rVal ? (inst.colors?.[String(rVal)] || inst.color || '#111') : emptyStepBg,
      rightTxt: rVal ? (isDarkText(inst.id, String(rVal)) ? '#1a1a1a' : (inst.colors?.text || '#f4ecd8')) : 'transparent',
      rightSym: rVal ? String(rVal) : '',
    };
  }

  return {
    isVoice,
    isProlongation,
    displayVal,
    isSplit: false,
    bgColor: isActiveCell ? masterBg : emptyStepBg,
    txtColor: isActiveCell ? masterTxt : 'rgba(26, 26, 26, 0.4)',
    leftBg: emptyStepBg,
    leftTxt: 'transparent',
    leftSym: '',
    rightBg: emptyStepBg,
    rightTxt: 'transparent',
    rightSym: '',
  };
}
