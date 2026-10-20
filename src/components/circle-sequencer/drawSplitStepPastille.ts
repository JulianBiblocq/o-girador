/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const drawSplitStepPastille = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusSize: number,
  isSplit: boolean,
  isRightHalfOnly: boolean,
  leftFillColor: string,
  rightFillColor: string,
  leftText: string,
  rightText: string,
  leftTxtColor: string,
  rightTxtColor: string,
  isCurrentStep: boolean,
  isEco: boolean,
  themeWood: string,
  themeBorder: string,
  dynamicScale: number
): void => {
  if (!isEco && isCurrentStep) {
    ctx.beginPath();
    ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2);
    ctx.strokeStyle = themeWood;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  if (isSplit) {
    ctx.beginPath();
    ctx.arc(x, y, radiusSize, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fillStyle = leftFillColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
    ctx.closePath();
    ctx.fillStyle = rightFillColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y - radiusSize);
    ctx.lineTo(x, y + radiusSize);
    ctx.strokeStyle = themeBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = themeBorder;
    ctx.stroke();

    if (leftText) {
      const leftFontSize = Math.max(8, Math.floor((leftText.length > 1 ? 11 : 14) * dynamicScale * 0.9));
      ctx.font = `900 ${leftFontSize}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = leftTxtColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(leftText, x - radiusSize * 0.4, y + 2);
    }
    if (rightText) {
      const rightFontSize = Math.max(8, Math.floor((rightText.length > 1 ? 11 : 14) * dynamicScale * 0.9));
      ctx.font = `900 ${rightFontSize}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = rightTxtColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rightText, x + radiusSize * 0.4, y + 2);
    }
  } else if (isRightHalfOnly) {
    ctx.beginPath();
    ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
    ctx.closePath();
    ctx.fillStyle = rightFillColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radiusSize, Math.PI * 1.5, Math.PI * 0.5, false);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = themeBorder;
    ctx.stroke();

    if (rightText) {
      const rightFontSize = Math.max(8, Math.floor((rightText.length > 1 ? 11 : 14) * dynamicScale * 0.9));
      ctx.font = `900 ${rightFontSize}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = rightTxtColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rightText, x + radiusSize * 0.4, y + 2);
    }
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
    ctx.fillStyle = leftFillColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = themeBorder;
    ctx.stroke();

    if (leftText) {
      const fontSize = Math.max(10, Math.floor((leftText.length > 1 ? 15 : 19) * dynamicScale * 0.9));
      ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = leftTxtColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(leftText, x, y + 2);
    }
  }
};
