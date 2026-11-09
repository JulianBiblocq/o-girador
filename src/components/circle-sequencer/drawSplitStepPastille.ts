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
  isCurrentStep: boolean,
  isEco: boolean,
  themeWood: string,
  _themeBorder: string,
  dynamicScale: number
): void => {
  if (!isEco && isCurrentStep) {
    ctx.beginPath();
    ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2);
    ctx.strokeStyle = themeWood;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  const sprite = getOrCreateXiloStampSprite(leftFillColor, leftTxtColor, leftText, radiusSize, dynamicScale, false);
  if (sprite) {
    const half = sprite.logicalSize * 0.5;
    ctx.drawImage(sprite.canvas, x - half, y - half, sprite.logicalSize, sprite.logicalSize);
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
  ctx.fillStyle = leftFillColor;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1a1a1a';
  ctx.stroke();
};
