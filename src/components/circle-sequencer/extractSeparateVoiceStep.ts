
import type { Pattern } from '../../types';

const isStepValActive = (val: any) =>
  val !== 0 && val !== '0' && val !== '' && val !== undefined && val !== null && val !== '-';

const sanitizeStepNote = (rawNote: string, rawSyl: string, ignorePitch?: boolean): string => {
  const n = (rawNote || '').trim();
  const s = (rawSyl || '').trim();
  if (!ignorePitch) return n;
  return (n === '───' || n === '-' || s === '───') ? '───' : '';
};

export function extractSeparateVoiceStep(
  i: number,
  effectiveStepCount: number,
  puxPattern: Pattern | null,
  coroPattern: Pattern | null,
  nextPuxPattern: Pattern | null,
  nextCoroPattern: Pattern | null,
  puxPlayingSteps: any,
  coroPlayingSteps: any,
  soloPlayId: number | null | undefined,
  prevPuxPattern: Pattern | null = null,
  prevCoroPattern: Pattern | null = null,
  currentStep: number = -1
): { pActive: boolean; pNote: string; pSyl: string; pAnacrusis: boolean; cActive: boolean; cNote: string; cSyl: string; cAnacrusis: boolean } {
  let pActive = false;
  let pNote = '';
  let pSyl = '';
  let pAnacrusis = false;

  let cActive = false;
  let cNote = '';
  let cSyl = '';
  let cAnacrusis = false;

  if (puxPattern && puxPlayingSteps && isStepValActive(puxPlayingSteps[i])) {
    pActive = true;
    pSyl = (puxPattern.lyrics?.[i] || '').trim();
    pNote = sanitizeStepNote(puxPattern.notes?.[i] || '', pSyl, puxPattern.ignoreMelodyPitch);
  }
  if (coroPattern && coroPlayingSteps && isStepValActive(coroPlayingSteps[i])) {
    cActive = true;
    cSyl = (coroPattern.lyrics?.[i] || '').trim();
    cNote = sanitizeStepNote(coroPattern.notes?.[i] || '', cSyl, coroPattern.ignoreMelodyPitch);
  }

  // Projection de la queue +1T (pas 16..19 -> pas 0..3 sur le Temps 1) lorsque les pas 0..3 sont silencieux
  if (i < 4) {
    const preferPrev = currentStep >= 0 && currentStep < 4 && (soloPlayId === undefined || soloPlayId === null);
    if (!pActive) {
      const pTailPat = preferPrev
        ? (isStepValActive(prevPuxPattern?.tailActiveSteps?.[i]) ? prevPuxPattern : puxPattern)
        : (isStepValActive(puxPattern?.tailActiveSteps?.[i]) ? puxPattern : prevPuxPattern);
      if (isStepValActive(pTailPat?.tailActiveSteps?.[i])) {
        pActive = true;
        pSyl = (pTailPat?.tailLyrics?.[i] || '').trim();
        pNote = sanitizeStepNote(pTailPat?.tailNotes?.[i] || '', pSyl, pTailPat?.ignoreMelodyPitch);
      }
    }
    if (!cActive) {
      const cTailPat = preferPrev
        ? (isStepValActive(prevCoroPattern?.tailActiveSteps?.[i]) ? prevCoroPattern : coroPattern)
        : (isStepValActive(coroPattern?.tailActiveSteps?.[i]) ? coroPattern : prevCoroPattern);
      if (isStepValActive(cTailPat?.tailActiveSteps?.[i])) {
        cActive = true;
        cSyl = (cTailPat?.tailLyrics?.[i] || '').trim();
        cNote = sanitizeStepNote(cTailPat?.tailNotes?.[i] || '', cSyl, cTailPat?.ignoreMelodyPitch);
      }
    }
  }

  if (soloPlayId !== undefined && soloPlayId !== null) {
    if (!pActive && isStepValActive(puxPattern?.preRollActiveSteps?.[i])) {
      pActive = true;
      pSyl = (puxPattern?.preRollLyrics?.[i] || '').trim();
      pNote = sanitizeStepNote(puxPattern?.preRollNotes?.[i] || '', pSyl, puxPattern?.ignoreMelodyPitch);
      pAnacrusis = true;
    }
    if (!cActive && isStepValActive(coroPattern?.preRollActiveSteps?.[i])) {
      cActive = true;
      cSyl = (coroPattern?.preRollLyrics?.[i] || '').trim();
      cNote = sanitizeStepNote(coroPattern?.preRollNotes?.[i] || '', cSyl, coroPattern?.ignoreMelodyPitch);
      cAnacrusis = true;
    }
  } else {
    const isPickupWindow = i >= effectiveStepCount - 4;
    if (isPickupWindow && !pActive && !cActive) {
      if (isStepValActive(nextPuxPattern?.preRollActiveSteps?.[i])) {
        pActive = true;
        pSyl = (nextPuxPattern?.preRollLyrics?.[i] || '').trim();
        pNote = sanitizeStepNote(nextPuxPattern?.preRollNotes?.[i] || '', pSyl, nextPuxPattern?.ignoreMelodyPitch);
        pAnacrusis = true;
      }
      if (isStepValActive(nextCoroPattern?.preRollActiveSteps?.[i])) {
        cActive = true;
        cSyl = (nextCoroPattern?.preRollLyrics?.[i] || '').trim();
        cNote = sanitizeStepNote(nextCoroPattern?.preRollNotes?.[i] || '', cSyl, nextCoroPattern?.ignoreMelodyPitch);
        cAnacrusis = true;
      }
    }
  }

  return { pActive, pNote, pSyl, pAnacrusis, cActive, cNote, cSyl, cAnacrusis };
}
