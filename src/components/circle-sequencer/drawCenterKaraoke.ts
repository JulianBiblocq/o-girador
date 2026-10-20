/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup } from '../../types';
import { getPatternWords } from './karaokeHelpers';
import { drawCenterKaraokeText } from './drawCenterKaraokeText';
import { resolveActiveVoiceState } from './resolveActiveVoiceState';
import { WordItem } from './circleSequencerTypes';

export const drawCenterKaraoke = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  live: { step: number; measure: number; maxTicks: number; ratio: number; isPreRoll?: boolean },
  tracks: TrackGroup[],
  rawTracks: TrackGroup[],
  totalMeasures: number,
  isLoopRegionActive?: boolean,
  loopStartMeasure?: number | null,
  loopEndMeasure?: number | null,
  soloPlayId?: number | null,
  dynamicScale: number = 1,
  timeSig?: string,
  measureTimeSigs?: Record<number, string> | string[]
): void => {
  ctx.save();
  try {
    const { activePattern, activeRole, isAnacrusis, currentStep, totalSteps } = resolveActiveVoiceState(
      live,
      rawTracks,
      totalMeasures,
      isLoopRegionActive,
      loopStartMeasure,
      loopEndMeasure,
      soloPlayId,
      timeSig,
      measureTimeSigs
    );

    if (!activePattern || activeRole === 'none') return;
    const words = getPatternWords(activePattern, isAnacrusis, totalSteps);
    if (words.length === 0) return;

    const roleColor = activeRole === 'coro' ? '#1e40af' : '#c25e38';
    const roleLabel = isAnacrusis ? 'ANACROUSE ➔ T1' : (activeRole === 'coro' ? 'CORO' : 'PUXADOR');

    const diskRadius = 135 * dynamicScale;
    ctx.beginPath();
    ctx.arc(centerX, centerY, diskRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f4ecd8';
    ctx.fill();
    ctx.lineWidth = 3.5 * dynamicScale;
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, diskRadius - 8 * dynamicScale, 0, Math.PI * 2);
    ctx.lineWidth = 1 * dynamicScale;
    ctx.strokeStyle = '#8b2a1a';
    ctx.stroke();

    const badgeW = (roleLabel.length > 10 ? 150 : 110) * dynamicScale;
    const badgeH = 22 * dynamicScale;
    const badgeX = centerX - badgeW / 2;
    const badgeY = centerY - 92 * dynamicScale;

    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 6 * dynamicScale);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fillStyle = roleColor;
    ctx.fill();
    ctx.lineWidth = 1.5 * dynamicScale;
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();

    ctx.font = `900 ${Math.floor(10 * dynamicScale)}px "Outfit", "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleLabel, centerX, badgeY + badgeH / 2 + 0.5);

    let activeWord: WordItem | null = null;
    let activeSyllableIndex = -1;

    for (const word of words) {
      const sylIdx = word.syllables.findIndex(syl => syl.step === currentStep);
      if (sylIdx !== -1) {
        activeWord = word;
        activeSyllableIndex = sylIdx;
        break;
      }
    }

    if (!activeWord) {
      for (let i = words.length - 1; i >= 0; i--) {
        if (words[i].startStep <= currentStep) {
          activeWord = words[i];
          for (let s = words[i].syllables.length - 1; s >= 0; s--) {
            if (words[i].syllables[s].step <= currentStep) {
              activeSyllableIndex = s;
              break;
            }
          }
          break;
        }
      }
    }

    if (!activeWord && words.length > 0) {
      activeWord = words[0];
      activeSyllableIndex = -1;
    }

    drawCenterKaraokeText(ctx, centerX, centerY, activeWord, activeSyllableIndex, words, roleColor, dynamicScale);
  } finally {
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
};
