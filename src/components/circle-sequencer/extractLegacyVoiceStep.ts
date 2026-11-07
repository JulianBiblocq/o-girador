
import { Pattern, InstrumentConfig } from '../../types';

const isStepValActive = (val: any) =>
  val !== 0 && val !== '0' && val !== '' && val !== undefined && val !== null && val !== '-';

const sanitizeStepNote = (rawNote: string, rawSyl: string, ignorePitch?: boolean): string => {
  const n = (rawNote || '').trim();
  const s = (rawSyl || '').trim();
  if (!ignorePitch) return n;
  return (n === '───' || n === '-' || s === '───') ? '───' : '';
};

export function extractLegacyVoiceStep(
  i: number,
  effectiveStepCount: number,
  puxPattern: Pattern | null,
  coroPattern: Pattern | null,
  activePattern: Pattern | null,
  nextPuxPattern: Pattern | null,
  nextCoroPattern: Pattern | null,
  currentInst: InstrumentConfig,
  activePlayingSteps: any,
  soloPlayId: number | null | undefined
): { pActive: boolean; pNote: string; pSyl: string; pAnacrusis: boolean; cActive: boolean; cNote: string; cSyl: string; cAnacrusis: boolean } {
  let pActive = false;
  let pNote = '';
  let pSyl = '';
  let pAnacrusis = false;

  let cActive = false;
  let cNote = '';
  let cSyl = '';
  let cAnacrusis = false;

  const basePat = puxPattern || coroPattern || activePattern;
  const nextBasePat = nextPuxPattern || nextCoroPattern;
  const sVal = activePlayingSteps[i];
  const sStr = String(Array.isArray(sVal) ? sVal[0] : sVal).toUpperCase();
  const isRawActive = isStepValActive(sVal);

  if (isRawActive) {
    const sylVal = (basePat?.lyrics?.[i] || '').trim();
    const noteVal = sanitizeStepNote(basePat?.notes?.[i] || '', sylVal, basePat?.ignoreMelodyPitch);
    if (sStr === 'C' || (currentInst.id === 'coro' && sStr !== 'P')) {
      cActive = true;
      cNote = noteVal;
      cSyl = sylVal;
    } else {
      pActive = true;
      pNote = noteVal;
      cSyl = cSyl;
      pSyl = sylVal;
    }
  } else {
    const isPickupWindow = i >= effectiveStepCount - 4;
    const preVal = basePat?.preRollActiveSteps?.[i];
    const isPreActive = isStepValActive(preVal);
    const nextPreVal = (soloPlayId === undefined || soloPlayId === null && isPickupWindow) ? nextBasePat?.preRollActiveSteps?.[i] : 0;
    const isNextPreActive = isStepValActive(nextPreVal);

    const targetPat = isPreActive ? basePat : (isNextPreActive ? nextBasePat : null);
    const activeVal = isPreActive ? preVal : (isNextPreActive ? nextPreVal : null);

    if (targetPat && activeVal) {
      const sylVal = (targetPat.preRollLyrics?.[i] || '').trim();
      const noteVal = sanitizeStepNote(targetPat.preRollNotes?.[i] || '', sylVal, targetPat.ignoreMelodyPitch);
      const preStr = String(activeVal).toUpperCase();
      if (preStr === 'C' || (currentInst.id === 'coro' && preStr !== 'P')) {
        cActive = true;
        cNote = noteVal;
        cSyl = sylVal;
        cAnacrusis = true;
      } else {
        pActive = true;
        pNote = noteVal;
        pSyl = sylVal;
        pAnacrusis = true;
      }
    }
  }

  return { pActive, pNote, pSyl, pAnacrusis, cActive, cNote, cSyl, cAnacrusis };
}
