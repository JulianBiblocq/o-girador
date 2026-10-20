/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DRUM_RADIUS, RIM_RADIUS, INNER_SKIN_RADIUS } from './circleSequencerConstants';
import { ThemeColors } from './circleSequencerTypes';

export const drawAlfaiaRims = (
  bgCtx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  theme: ThemeColors
): void => {
  // 1. Ropes (Cordas)
  const numCords = 16;
  bgCtx.lineWidth = 7;
  bgCtx.strokeStyle = theme.themeBorder;
  bgCtx.lineCap = 'round';
  bgCtx.lineJoin = 'round';

  for (let i = 0; i < numCords; i++) {
    const a1 = (i * Math.PI * 2) / numCords;
    const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
    bgCtx.beginPath();
    bgCtx.moveTo(centerX + Math.cos(a1) * (RIM_RADIUS - 5), centerY + Math.sin(a1) * (RIM_RADIUS - 5));
    bgCtx.lineTo(centerX + Math.cos(a2) * DRUM_RADIUS, centerY + Math.sin(a2) * DRUM_RADIUS);
    const a3 = ((i + 1) * Math.PI * 2) / numCords;
    bgCtx.lineTo(centerX + Math.cos(a3) * (RIM_RADIUS - 5), centerY + Math.sin(a3) * (RIM_RADIUS - 5));
    bgCtx.stroke();
  }

  // 2. Wooden Rim (Aro)
  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, RIM_RADIUS, 0, Math.PI * 2);
  bgCtx.lineWidth = 36;
  bgCtx.strokeStyle = '#2c1e16';
  bgCtx.stroke();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, RIM_RADIUS - 18, 0, Math.PI * 2);
  bgCtx.lineWidth = 4;
  bgCtx.strokeStyle = theme.themeBorder;
  bgCtx.stroke();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, RIM_RADIUS + 18, 0, Math.PI * 2);
  bgCtx.lineWidth = 4;
  bgCtx.strokeStyle = theme.themeBorder;
  bgCtx.stroke();

  // 3. Animal Skin (Couro)
  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, INNER_SKIN_RADIUS, 0, Math.PI * 2);
  bgCtx.fillStyle = theme.themeBg;
  bgCtx.save();
  bgCtx.globalAlpha = 0.85;
  bgCtx.fill();
  bgCtx.restore();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, INNER_SKIN_RADIUS, 0, Math.PI * 2);
  bgCtx.lineWidth = 5;
  bgCtx.strokeStyle = theme.themeBorder;
  bgCtx.stroke();

  bgCtx.beginPath();
  bgCtx.arc(centerX, centerY, INNER_SKIN_RADIUS - 15, 0, Math.PI * 2);
  bgCtx.lineWidth = 1.5;
  bgCtx.strokeStyle = theme.themeBorder;
  bgCtx.setLineDash([8, 8]);
  bgCtx.stroke();
  bgCtx.setLineDash([]);
};
