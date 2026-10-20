import { instrumentsConfig, isDarkText, getVisualStrokeSymbol } from '../../data';
import { getBusNoteColor } from '../../utils/colorHelpers';
import { resolveBusSatellites } from './TimelineStepBusSatellites';
import { resolveVoiceStepData } from './TimelineStepVoiceResolver';

export interface TimelineStepData {
  val: string | number | [string, string];
  isSplit: boolean; isRightHalfOnly: boolean; leftText: string; leftFillColor: string;
  leftTxtColor: string; leftIsAccent: boolean; rightText: string; rightFillColor: string;
  rightTxtColor: string; renderCas: number; isVoice: boolean; isProlongation: boolean;
  isFollowedByProlongation: boolean; syl: string; isPux: boolean; voiceColor: string;
  note: string; timeSigStr: string; isEcoMode: boolean;
}

export function resolveTimelineStepData(
  currentTrack: any, tracks: any[], actualStepIdx: number, patternId: number, patternIdx: number,
  measureIdx: number, instrumentIdx: number, isLeftHanded: boolean, isEcoMode: boolean,
  isLinkFolder: boolean, isSlave: boolean, isLinkMaster: boolean,
  parentBusTrackId?: number, masterTrackId?: number, slaveTrackIds?: number[], hasChildOverrides?: boolean,
  measureTimeSigs?: Record<number, string>, timeSig?: string
): TimelineStepData {
  const inst = instrumentsConfig[instrumentIdx];
  const isVoice = Boolean(inst?.type === 'voice' || inst?.id === 'toada' || inst?.id === 'puxador' || inst?.id === 'coro' || currentTrack.customName === 'Toada' || currentTrack.customName === 'Puxador' || currentTrack.customName === 'Coro');

  let masterVal: string | number | [string, string] = 0, esclaveVal: string | number | [string, string] = 0;
  let resolvedVal: string | number | [string, string] = 0, resolvedNote = '';
  let isSplit = false, isRightHalfOnly = false, leftText = '', leftFillColor = 'transparent', leftTxtColor = '#f4ecd8', leftIsAccent = false;
  let rightText = '', rightFillColor = 'transparent', rightTxtColor = '#f4ecd8', renderCas = 0;

  if (isLinkFolder) {
    const masterPattern = currentTrack.patterns?.[patternIdx];
    masterVal = masterPattern?.activeSteps?.[actualStepIdx] ?? 0;
    resolvedVal = masterVal;
    resolvedNote = masterPattern?.notes?.[actualStepIdx] ?? '';
    const hasMaster = masterVal !== 0 && masterVal !== '0' && masterVal !== '' && masterVal !== undefined && masterVal !== null;

    if (hasMaster) {
      const v = getVisualStrokeSymbol(masterVal, isLeftHanded, inst.id);
      if (v !== 0 && v !== '0') {
        const s = String(Array.isArray(v) ? v[0] : v);
        leftFillColor = getBusNoteColor(String(currentTrack.id), s, tracks, instrumentsConfig);
        leftIsAccent = s === s.toUpperCase();
        leftText = s;
        leftTxtColor = isDarkText(inst.id, String(Array.isArray(masterVal) ? masterVal[0] : masterVal)) ? '#1a1a1a' : '#f4ecd8';
      } else if (String(v) === '0' || String(v) === '-') {
        leftFillColor = '#ab5318'; leftText = '-'; leftTxtColor = '#1a1a1a';
      }
    }

    const satellites = resolveBusSatellites(currentTrack, tracks, slaveTrackIds, hasChildOverrides, measureIdx, actualStepIdx, isLeftHanded);
    if (hasMaster && satellites.length > 0) {
      isSplit = true;
      rightText = satellites[0].text; rightFillColor = satellites[0].color; rightTxtColor = satellites[0].isDark ? '#1a1a1a' : '#f4ecd8';
    } else if (!hasMaster && satellites.length >= 2) {
      isSplit = true;
      leftText = satellites[0].text; leftFillColor = satellites[0].color; leftTxtColor = satellites[0].isDark ? '#1a1a1a' : '#f4ecd8';
      rightText = satellites[1].text; rightFillColor = satellites[1].color; rightTxtColor = satellites[1].isDark ? '#1a1a1a' : '#f4ecd8';
    } else if (!hasMaster && satellites.length === 1) {
      isRightHalfOnly = true;
      rightText = satellites[0].text; rightFillColor = satellites[0].color; rightTxtColor = satellites[0].isDark ? '#1a1a1a' : '#f4ecd8';
    }
  } else if (isSlave) {
    const parentBus = tracks.find((p) => p.id === parentBusTrackId) || tracks.find((p) => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
    const masterTrack = tracks.find((t) => t.id === masterTrackId) || tracks.find((t) => String(t.linkedToTrackId) === String(currentTrack.linkedToTrackId) && t.isLinkMaster);
    const masterInst = masterTrack ? instrumentsConfig[masterTrack.instrumentIdx] : null;

    if (parentBus) {
      const mp = parentBus.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx])) || parentBus.patterns?.[0];
      masterVal = mp?.activeSteps?.[actualStepIdx] ?? 0;
      const ov = currentTrack.patternOverrides?.[measureIdx];
      if (ov !== null && ov !== undefined) {
        const cp = parentBus.patterns.find((p: any) => p.id === ov);
        esclaveVal = cp?.activeSteps?.[actualStepIdx] ?? 0;
        resolvedVal = esclaveVal;
        resolvedNote = cp?.notes?.[actualStepIdx] ?? '';
      }
    }
    if (esclaveVal !== 0 && esclaveVal !== '') {
      renderCas = 2;
      const p = Array.isArray(esclaveVal) ? esclaveVal[0] : esclaveVal;
      leftFillColor = inst.colors?.[p as string] || inst.color || '#111';
      leftText = String(getVisualStrokeSymbol(esclaveVal, isLeftHanded, inst.id));
      leftTxtColor = isDarkText(inst.id, String(p)) ? '#1a1a1a' : '#f4ecd8';
    } else if (masterVal !== 0 && masterVal !== '') {
      renderCas = 4;
      const p = Array.isArray(masterVal) ? masterVal[0] : masterVal;
      leftFillColor = masterInst ? (masterInst.colors?.[p as string] || masterInst.color || '#111') : '#111';
      if (masterInst) {
        leftText = String(getVisualStrokeSymbol(masterVal, isLeftHanded, masterInst.id));
        leftTxtColor = isDarkText(masterInst.id, String(p)) ? '#1a1a1a' : '#f4ecd8';
      }
    }
  } else if (isLinkMaster) {
    const parentBus = tracks.find((p) => p.id === parentBusTrackId) || tracks.find((p) => String(p.id) === String(currentTrack.linkedToTrackId) && p.isLinkFolder);
    if (parentBus) {
      const mp = parentBus.patterns?.find((p: any) => Boolean(p.measureAssignments?.[measureIdx])) || parentBus.patterns?.[0];
      const val = mp?.activeSteps?.[actualStepIdx] ?? 0;
      resolvedVal = val;
      resolvedNote = mp?.notes?.[actualStepIdx] ?? '';
      if (val !== 0 && val !== '') {
        const v = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
        const pv = Array.isArray(v) ? v[0] : v;
        leftText = isVoice ? '' : String(pv);
        leftFillColor = isVoice ? (inst.color || '#111') : (inst.colors?.[pv as string] || inst.color || '#111');
        leftTxtColor = isDarkText(inst.id, String(Array.isArray(val) ? val[0] : val)) ? '#1a1a1a' : '#f4ecd8';
      }
    }
  } else {
    const ptn = (patternId !== -1 ? currentTrack.patterns?.find((p: any) => p.id === patternId) : null) || currentTrack.patterns?.[patternIdx];
    const val = ptn?.activeSteps?.[actualStepIdx] ?? 0;
    resolvedVal = val;
    resolvedNote = ptn?.notes?.[actualStepIdx] ?? '';
    if (val !== 0 && val !== '' && !((val as any)?.length === 0)) {
      if (Array.isArray(val) && val.length === 2) {
        isSplit = true;
        const vL = getVisualStrokeSymbol(val[0], isLeftHanded, inst.id);
        leftText = String(vL); leftFillColor = inst.colors?.[vL as string] || inst.color || '#111';
        leftTxtColor = isDarkText(inst.id, String(val[0])) ? '#1a1a1a' : '#f4ecd8';
        const vR = getVisualStrokeSymbol(val[1], isLeftHanded, inst.id);
        rightText = String(vR); rightFillColor = inst.colors?.[vR as string] || inst.color || '#111';
        rightTxtColor = isDarkText(inst.id, String(val[1])) ? '#1a1a1a' : '#f4ecd8';
      } else {
        const v = getVisualStrokeSymbol(val as string | number, isLeftHanded, inst.id);
        leftText = isVoice ? '' : String(v);
        leftFillColor = isVoice ? (inst.color || '#111') : (inst.colors?.[v as string] || inst.color || '#111');
        leftTxtColor = isDarkText(inst.id, String(val)) ? '#1a1a1a' : '#f4ecd8';
      }
    }
  }

  const voiceData = isVoice ? resolveVoiceStepData(currentTrack, patternId, patternIdx, actualStepIdx, inst?.id) : { isProlongation: false, isFollowedByProlongation: false, syl: '', isPux: true, voiceColor: '#c25e38' };
  return { val: resolvedVal, isSplit, isRightHalfOnly, leftText, leftFillColor, leftTxtColor, leftIsAccent, rightText, rightFillColor, rightTxtColor, renderCas, isVoice, isProlongation: voiceData.isProlongation, isFollowedByProlongation: voiceData.isFollowedByProlongation, syl: voiceData.syl, isPux: voiceData.isPux, voiceColor: voiceData.voiceColor, note: isVoice ? (currentTrack.patterns?.[patternIdx]?.notes?.[actualStepIdx] || '') : resolvedNote, timeSigStr: measureTimeSigs?.[measureIdx] || timeSig || '4/4', isEcoMode };
}
