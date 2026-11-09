import { getOrCreateXiloStampSprite } from './xiloStampSpriteCache';

export const drawSplitStepPastille = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusSize: number,
  _isSplit: boolean,
  _isRightHalfOnly: boolean,
  leftFillColor: string,
  _rightFillColor: string,
  leftText: string,
  _rightText: string,
  leftTxtColor: string,
  _rightTxtColor: string,
  _isCurrentStep: boolean,
  isEco: boolean,
  _themeWood: string,
  _themeBorder: string,
  dynamicScale: number,
  hitIntensity: number = 0,
  isVariationAccent: boolean = false
): void => {
  const sprite = getOrCreateXiloStampSprite(leftFillColor, leftTxtColor, leftText, radiusSize, dynamicScale, isVariationAccent);
  if (sprite) {
    const clampedHit = !isEco && hitIntensity > 0.01 ? Math.min(1, hitIntensity) : 0;
    const pulseScale = 1 + 0.18 * clampedHit;

    // Halo facetté épousant exactement la silhouette taillée à la gouge du tampon (0 cercle rouge)
    if (clampedHit > 0) {
      const prevAlpha = ctx.globalAlpha;
      const haloSize = sprite.logicalSize * pulseScale * 1.13;
      const haloHalf = haloSize * 0.5;
      ctx.globalAlpha = prevAlpha * (0.35 * clampedHit);
      ctx.drawImage(sprite.canvas, x - haloHalf, y - haloHalf, haloSize, haloSize);
      ctx.globalAlpha = prevAlpha;
    }

    const drawSize = sprite.logicalSize * pulseScale;
    const half = drawSize * 0.5;
    ctx.drawImage(sprite.canvas, x - half, y - half, drawSize, drawSize);
  }
};
