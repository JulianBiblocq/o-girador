import { instrumentsConfig, isDarkText, getVisualStrokeSymbol } from '../../data';
import { resolveSlaveStepOpacity, SlaveFocusContext } from '../../utils/slaveStepOpacityResolver';
import { resolveVoiceStepData } from './TimelineStepVoiceResolver';

export interface TimelineStepData {
  val: string | number | [string, string];
  isSplit: boolean; isRightHalfOnly: boolean; leftText: string; leftFillColor: string;
  leftTxtColor: string; leftIsAccent: boolean; rightText: string; rightFillColor: string;
  rightTxtColor: string; renderCas: number; stepOpacity: number; isVoice: boolean;
  isProlongation: boolean; isFollowedByProlongation: boolean; syl: string; isPux: boolean;
  voiceColor: string; note: string; timeSigStr: string; isEcoMode: boolean;
}

export function resolveTimelineStepData(
  currentTrack: any, tracks: any[], actualStepIdx: number, patternId: number, patternIdx: number,
  measureIdx: number, instrumentIdx: number, isLeftHanded: boolean, isEcoMode: boolean,
  isLinkFolder: boolean, isSlave: boolean, isLinkMaster: boolean,
  parentBusTrackId?: number, masterTrackId?: number, _slaveTrackIds?: number[], _hasChildOverrides?: boolean,
  measureTimeSigs?: Record<number, string>, timeSig?: string, focusCtx?: SlaveFocusContext
): TimelineStepData {
  const inst = instrumentsConfig[instrumentIdx];
  const isVoice = Boolean(
    inst?.type === 'voice' || inst?.id === 'toada' || inst?.id === 'puxador' || inst?.id === 'coro' ||
    currentTrack.customName === 'Toada' || currentTrack.customName === 'Puxador' || currentTrack.customName === 'Coro'
  );

  let masterVal: string | number | [string, string] = 0;
  let resolvedVal: string | number | [string, string] = 0, resolvedNote = '';
  let isSplit = false, leftText = '', leftFillColor = 'transparent', leftTxtColor = '#f4ecd8', leftIsAccent = false;
  let rightText = '', rightFillColor = 'transparent', rightTxtColor = '#f4ecd8', renderCas = 0, stepOpacity = 1.0;

  const applyOwnInstrumentVisual = (val: any, targetInst: any) => {
    if (!val || val === 0 || val === '0' || val === '' || (val as any)?.length === 0) return;
    if (Array.isArray(val) && val.length === 2) {
      isSplit = true;
      const vL = getVisualStrokeSymbol(val[0], isLeftHanded, targetInst.id);
      leftText = String(vL); leftFillColor = targetInst.colors?.[vL as string] || targetInst.color || '#111';
      leftTxtColor = isDarkText(targetInst.id, String(val[0])) ? '#1a1a1a' : '#f4ecd8';
      const vR = getVisualStrokeSymbol(val[1], isLeftHanded, targetInst.id);
      rightText = String(vR); rightFillColor = targetInst.colors?.[vR as string] || targetInst.color || '#111';
      rightTxtColor = isDarkText(targetInst.id, String(val[1])) ? '#1a1a1a' : '#f4ecd8';
    } else {
      const v = getVisualStrokeSymbol(val, isLeftHanded, targetInst.id);
      if (v !== 0 && v !== '0') {
        const pv = String(Array.isArray(v) ? v[0] : v);
        leftIsAccent = pv === pv.toUpperCase();
        leftText = isVoice ? '' : pv;
        leftFillColor = isVoice ? (targetInst.color || '#111') : (targetInst.colors?.[pv] || targetInst.color || '#111');
        leftTxtColor = isDarkText(targetInst.id, String(Array.isArray(val) ? val[0] : val)) ? '#1a1a1a' : '#f4ecd8';
      }
    }
  };

  if (isLinkFolder) {
    const masterPattern = currentTrack.patterns?.[patternIdx];
    resolvedVal = masterPattern?.activeSteps?.[actualStepIdx] ?? 0;
    resolvedNote = masterPattern?.notes?.[actualStepIdx] ?? '';
    applyOwnInstrumentVisual(resolvedVal, inst);
  } else if (isSlave) {
    const parentBus = tracks.find((p) => p.id === parentBusTrackId) || tracks.find((p) => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
    const masterTrack = tracks.find((t) => t.id === masterTrackId) || tracks.find((t) => (String(t.linkedToTrackId) === String(currentTrack.linkedToTrackId) || String(t.id) === String(currentTrack.linkedToTrackId)) && t.isLinkMaster);
    const mp = masterTrack?.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx])) || parentBus?.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx])) || masterTrack?.patterns?.[0] || parentBus?.patterns?.[0];
    masterVal = mp?.activeSteps?.[actualStepIdx] ?? 0;

    const ov = currentTrack.patternOverrides?.[measureIdx];
    const ownAssigned = currentTrack.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx]));
    if (ov === null) {
      resolvedVal = 0;
    } else if (ov !== undefined) {
      const cp = currentTrack.patterns?.find((p: any) => p.id === ov) || parentBus?.patterns?.find((p: any) => p.id === ov) || masterTrack?.patterns?.find((p: any) => p.id === ov);
      resolvedVal = cp?.activeSteps?.[actualStepIdx] ?? 0;
      resolvedNote = cp?.notes?.[actualStepIdx] ?? '';
    } else if (ownAssigned) {
      resolvedVal = ownAssigned.activeSteps?.[actualStepIdx] ?? 0;
      resolvedNote = ownAssigned.notes?.[actualStepIdx] ?? '';
    } else {
      resolvedVal = masterVal;
      resolvedNote = mp?.notes?.[actualStepIdx] ?? '';
    }

    applyOwnInstrumentVisual(resolvedVal, inst);
    stepOpacity = resolveSlaveStepOpacity({ track: currentTrack, allTracks: tracks, measureIdx, stepIdx: actualStepIdx, ownStepVal: resolvedVal, masterStepVal: masterVal, focusCtx });
    renderCas = stepOpacity < 1.0 ? 4 : 2;
  } else if (isLinkMaster) {
    const parentBus = tracks.find((p) => p.id === parentBusTrackId) || tracks.find((p) => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
    const mp = currentTrack.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx])) || parentBus?.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx])) || currentTrack.patterns?.[0] || parentBus?.patterns?.[0];
    resolvedVal = mp?.activeSteps?.[actualStepIdx] ?? 0;
    resolvedNote = mp?.notes?.[actualStepIdx] ?? '';
    applyOwnInstrumentVisual(resolvedVal, inst);
  } else {
    const ptn = (patternId !== -1 ? currentTrack.patterns?.find((p: any) => p.id === patternId) : null) || currentTrack.patterns?.[patternIdx];
    resolvedVal = ptn?.activeSteps?.[actualStepIdx] ?? 0;
    resolvedNote = ptn?.notes?.[actualStepIdx] ?? '';
    applyOwnInstrumentVisual(resolvedVal, inst);
  }

  const voiceData = isVoice ? resolveVoiceStepData(currentTrack, patternId, patternIdx, actualStepIdx, inst?.id) : { isProlongation: false, isFollowedByProlongation: false, syl: '', isPux: true, voiceColor: '#c25e38' };
  return { val: resolvedVal, isSplit, isRightHalfOnly: false, leftText, leftFillColor, leftTxtColor, leftIsAccent, rightText, rightFillColor, rightTxtColor, renderCas, stepOpacity, isVoice, isProlongation: voiceData.isProlongation, isFollowedByProlongation: voiceData.isFollowedByProlongation, syl: voiceData.syl, isPux: voiceData.isPux, voiceColor: voiceData.voiceColor, note: isVoice ? (currentTrack.patterns?.[patternIdx]?.notes?.[actualStepIdx] || '') : resolvedNote, timeSigStr: measureTimeSigs?.[measureIdx] || timeSig || '4/4', isEcoMode };
}
