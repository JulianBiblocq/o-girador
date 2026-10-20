/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceStepData } from './voiceStepExtraction';

export const drawSingleVoicePastille = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  voicePastilleRadius: number,
  pStep: VoiceStepData,
  cStep: VoiceStepData,
  dynamicScale: number,
  themeBorder: string
): void => {
  const showPux = pStep.active && !pStep.isProlongation;
  const showCoro = cStep.active && !cStep.isProlongation;

  if (showPux && showCoro) {
    ctx.beginPath();
    ctx.arc(x, y, voicePastilleRadius, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fillStyle = pStep.isAnacrusis ? 'rgba(194, 94, 56, 0.85)' : '#c25e38';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, voicePastilleRadius, Math.PI * 1.5, Math.PI * 0.5, false);
    ctx.closePath();
    ctx.fillStyle = cStep.isAnacrusis ? 'rgba(42, 157, 143, 0.85)' : '#2a9d8f';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y - voicePastilleRadius);
    ctx.lineTo(x, y + voicePastilleRadius);
    ctx.strokeStyle = themeBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, voicePastilleRadius, 0, Math.PI * 2);
    if (pStep.isAnacrusis || cStep.isAnacrusis) {
      ctx.setLineDash([4, 2.5]);
    }
    ctx.strokeStyle = (pStep.isAnacrusis || cStep.isAnacrusis) ? '#f4ecd8' : themeBorder;
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    let pText = pStep.syl || (pStep.note ? pStep.note : 'P');
    if (pText.endsWith('-')) pText = pText.slice(0, -1);
    let cText = cStep.syl || (cStep.note ? cStep.note : 'C');
    if (cText.endsWith('-')) cText = cText.slice(0, -1);

    const fontSize = Math.max(8, Math.floor((Math.max(pText.length, cText.length) > 2 ? 10 : 13) * dynamicScale * 0.9));
    ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (pText && pText !== '-') ctx.fillText(pText, x - voicePastilleRadius * 0.45, y + 1.5);
    if (cText && cText !== '-') ctx.fillText(cText, x + voicePastilleRadius * 0.45, y + 1.5);
  } else if (showPux) {
    ctx.beginPath();
    ctx.arc(x, y, voicePastilleRadius, 0, Math.PI * 2);
    ctx.fillStyle = pStep.isAnacrusis ? 'rgba(194, 94, 56, 0.88)' : '#c25e38';
    ctx.fill();

    if (pStep.isAnacrusis) {
      ctx.setLineDash([4, 2.5]);
      ctx.strokeStyle = '#f4ecd8';
      ctx.lineWidth = 2.2;
    } else {
      ctx.strokeStyle = '#e9cca8';
      ctx.lineWidth = 2.0;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    let text = pStep.syl || (pStep.note ? pStep.note : 'P');
    if (text.endsWith('-')) text = text.slice(0, -1);
    if (text && text !== '-') {
      const fontSize = Math.max(10, Math.floor((text.length > 2 ? 13 : 16) * dynamicScale * 0.9));
      ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1.5);
    }
  } else if (showCoro) {
    ctx.beginPath();
    ctx.arc(x, y, voicePastilleRadius, 0, Math.PI * 2);
    ctx.fillStyle = cStep.isAnacrusis ? 'rgba(42, 157, 143, 0.88)' : '#2a9d8f';
    ctx.fill();

    if (cStep.isAnacrusis) {
      ctx.setLineDash([4, 2.5]);
      ctx.strokeStyle = '#f4ecd8';
      ctx.lineWidth = 2.2;
    } else {
      ctx.strokeStyle = '#b3dcd8';
      ctx.lineWidth = 2.0;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    let text = cStep.syl || (cStep.note ? cStep.note : 'C');
    if (text.endsWith('-')) text = text.slice(0, -1);
    if (text && text !== '-') {
      const fontSize = Math.max(10, Math.floor((text.length > 2 ? 13 : 16) * dynamicScale * 0.9));
      ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1.5);
    }
  }
};
