
import { VoiceStepData } from './voiceStepExtraction';
import { drawSingleVoicePastille } from './drawSingleVoicePastille';

export const drawVoicePastilles = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tRad: number,
  stepAngles: number[],
  effectiveStepCount: number,
  currentStep: number,
  puxSteps: VoiceStepData[],
  coroSteps: VoiceStepData[],
  dynamicScale: number,
  isEco: boolean,
  themeWood: string,
  themeBorder: string,
  themeText: string,
  trackLabel: string
): void => {
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;
  const voicePastilleRadius = 22 * dynamicScale;

  for (let i = 0; i < effectiveStepCount; i++) {
    const stepAngle = stepAngles[i];
    const x = centerX + Math.cos(stepAngle) * tRad;
    const y = centerY + Math.sin(stepAngle) * tRad;

    const pStep = puxSteps[i];
    const cStep = coroSteps[i];
    const showPux = pStep.active && !pStep.isProlongation;
    const showCoro = cStep.active && !cStep.isProlongation;

    if (!showPux && !showCoro) continue;

    if (!isEco && i === currentStep) {
      ctx.beginPath();
      ctx.arc(x, y, voicePastilleRadius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = (pStep.isAnacrusis || cStep.isAnacrusis) ? '#f59e0b' : themeWood;
      ctx.lineWidth = (pStep.isAnacrusis || cStep.isAnacrusis) ? 3.0 : 2.5;
      ctx.stroke();
    }

    drawSingleVoicePastille(ctx, x, y, voicePastilleRadius, pStep, cStep, dynamicScale, themeBorder);
  }

  if (!isEco) {
    const x0 = centerX + Math.cos(stepAngles[0]) * tRad;
    const y0 = centerY + Math.sin(stepAngles[0]) * tRad;
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = themeText;
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    ctx.fillText(trackLabel, x0 + 20, y0 + 3);
    ctx.restore();
  }
};
