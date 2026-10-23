
import { Pattern } from '../../types/store.types';
import { drawStaticMeasureBeats } from './drawStaticMeasureBeats';

export function drawStaticMeasureGrid(params: {
  ctx: CanvasRenderingContext2D;
  temps1Px: number;
  width: number;
  height: number;
  yCenter: number;
  pattern: Pattern;
  isCompound: boolean;
  beatsCount: number;
  beatDurationSec: number;
  pixelsPerSecond: number;
  patternMeasures: number;
}) {
  const {
    ctx, temps1Px, width, height, yCenter, pattern,
    isCompound, beatsCount, beatDurationSec, pixelsPerSecond, patternMeasures,
  } = params;

  const syllables: string[] = (pattern as any).syllables || pattern.lyrics || [];
  const notes: string[] = pattern.notes || [];
  const activeSteps = pattern.activeSteps || [];
  const stepsCountM = pattern.steps || (isCompound ? 12 : 16);
  const measureMDurationSec = beatsCount * beatDurationSec;
  const stepPxM = (measureMDurationSec * pixelsPerSecond) / stepsCountM;

  for (let m = 0; m < patternMeasures; m++) {
    const mStartPx = temps1Px + m * (measureMDurationSec * pixelsPerSecond);
    drawStaticMeasureBeats({ ctx, mStartPx, stepsCountM, stepPxM, width, height, isCompound });

    for (let s = 0; s < stepsCountM; s++) {
      const stepVal = activeSteps[s];
      if (stepVal === undefined || stepVal === null || stepVal === 0 || stepVal === '0') continue;
      const syl = (syllables[s] || '').trim();
      const note = (notes[s] || '').trim();
      const prevVal = s > 0 ? activeSteps[s - 1] : 0;
      const prevIsActive = s > 0 && prevVal !== undefined && prevVal !== null && prevVal !== 0 && prevVal !== '0';
      const prevNote = s > 0 ? (notes[s - 1] || '').trim() : '';
      const isSustain = s > 0 && prevIsActive && (
        syl === '-' || syl === '—' || syl === '--' || (syl === '' && note && note === prevNote)
      );
      if (isSustain) continue;

      let sustainEndStep = s;
      for (let next = s + 1; next < stepsCountM; next++) {
        const nVal = activeSteps[next];
        const nActive = nVal !== undefined && nVal !== null && nVal !== 0 && nVal !== '0';
        const nSyl = (syllables[next] || '').trim();
        const nNote = (notes[next] || '').trim();
        const nIsSustain = nActive && (
          nSyl === '-' || nSyl === '—' || nSyl === '--' || (nSyl === '' && nNote && nNote === note)
        );
        if (nIsSustain) sustainEndStep = next;
        else break;
      }

      const xCenter = mStartPx + s * stepPxM + stepPxM / 2;
      if (sustainEndStep > s) {
        const xEndCenter = mStartPx + sustainEndStep * stepPxM + stepPxM / 2;
        ctx.strokeStyle = '#8b2a1a';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(xCenter, yCenter);
        ctx.lineTo(xEndCenter, yCenter);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xEndCenter, yCenter - 4);
        ctx.lineTo(xEndCenter, yCenter + 4);
        ctx.stroke();
      }

      ctx.fillStyle = '#8b2a1a';
      ctx.beginPath();
      ctx.arc(xCenter, yCenter, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f4ecd8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.stroke();

      const displaySyl = syl && syl !== '-' && syl !== '—' && syl !== '--' ? syl : '';
      if (displaySyl) {
        ctx.font = 'bold 12px monospace, sans-serif';
        ctx.fillStyle = '#8b2a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(displaySyl, xCenter, yCenter - 10);
      }

      if (note) {
        ctx.font = 'bold 9px monospace, sans-serif';
        ctx.fillStyle = 'rgba(26, 26, 26, 0.75)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(note, xCenter, yCenter + 10);
      }
    }
  }
}
