
/**
 * Rendu Canvas 2D de la traînée de gouache vocale (style brosse Cordel)
 * avec filaments latéraux et pointe biseautée d'estompe de souffle.
 */
export const drawGouacheRibbon = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  thetaStart: number,
  thetaEnd: number,
  thetaFilamentEnd: number,
  color: string,
  dScale: number
): void => {
  if (thetaEnd <= thetaStart) return;

  const mainWidth = 9 * dScale;
  const filWidth = 1.5 * dScale;
  const filOffset = 4 * dScale;

  // 1. Micro-filaments latéraux (effet brosse sèche Cordel)
  if (thetaFilamentEnd > thetaStart) {
    ctx.save();
    ctx.lineWidth = filWidth;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45;

    // Filament intérieur (rayon - 4px)
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, radius - filOffset), thetaStart, thetaFilamentEnd, false);
    ctx.stroke();

    // Filament extérieur (rayon + 4px)
    ctx.beginPath();
    ctx.arc(cx, cy, radius + filOffset, thetaStart, thetaFilamentEnd, false);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Arc principal épais avec biseau d'estompe sur les derniers 15%
  const totalAngle = thetaEnd - thetaStart;
  const taperAngleSpan = totalAngle * 0.15;
  const taperStartAngle = thetaEnd - taperAngleSpan;

  // 2a. Corps principal (85% initiaux)
  ctx.save();
  ctx.lineWidth = mainWidth;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1.0;

  if (taperStartAngle > thetaStart) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, thetaStart, taperStartAngle, false);
    ctx.stroke();
  }

  // 2b. Biseau d'estompe (derniers 15% : amincissement progressif et fondu alpha vers 0)
  const steps = 8;
  const subSpan = taperAngleSpan / steps;
  for (let s = 0; s < steps; s++) {
    const a0 = taperStartAngle + s * subSpan;
    const a1 = a0 + subSpan;
    const progress = (s + 0.5) / steps;
    const factor = Math.max(0, 1 - progress);

    ctx.lineWidth = Math.max(0.5, mainWidth * factor);
    ctx.globalAlpha = factor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, a0, a1, false);
    ctx.stroke();
  }

  ctx.restore();
};
