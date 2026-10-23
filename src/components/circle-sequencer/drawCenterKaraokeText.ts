
import { WordItem } from './circleSequencerTypes';

export const drawCenterKaraokeText = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  activeWord: WordItem | null,
  activeSyllableIndex: number,
  words: WordItem[],
  roleColor: string,
  dynamicScale: number
): void => {
  // 7. Rendu horizontal du mot entier au centre de la Roda
  if (activeWord) {
    const fontSize = Math.floor(
      Math.min(38, Math.max(20, 160 / Math.max(4, activeWord.fullWord.length))) * dynamicScale
    );
    ctx.font = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const sylWidths = activeWord.syllables.map(s => ctx.measureText(s.cleanText).width);
    const totalWordWidth = sylWidths.reduce((a, b) => a + b, 0);
    let curX = centerX - totalWordWidth / 2;
    const wordY = centerY - 6 * dynamicScale;

    let activeNote: string | undefined = undefined;

    for (let i = 0; i < activeWord.syllables.length; i++) {
      const syl = activeWord.syllables[i];
      const w = sylWidths[i];
      const isHitNow = i === activeSyllableIndex;

      if (isHitNow) {
        activeNote = syl.note;
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = roleColor;
        ctx.shadowBlur = 14 * dynamicScale;
        ctx.fillStyle = roleColor;
        ctx.fillText(syl.cleanText, curX, wordY);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      } else {
        ctx.globalAlpha = 0.40;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(syl.cleanText, curX, wordY);
      }

      curX += w;
    }

    ctx.globalAlpha = 1.0;

    if (activeNote) {
      ctx.font = `bold ${Math.floor(11 * dynamicScale)}px "Outfit", "Inter", sans-serif`;
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText(activeNote, centerX, centerY + 24 * dynamicScale);
    }
  }

  // 8. Ligne de contexte inférieure : affichage de la phrase complète de la mesure
  if (words.length > 0) {
    const contextY = centerY + 62 * dynamicScale;
    ctx.font = `bold ${Math.floor(10.5 * dynamicScale)}px "Outfit", "Inter", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const wordWidths = words.map(w => ctx.measureText(w.fullWord).width);
    const spacing = 8 * dynamicScale;
    const totalPhraseWidth = wordWidths.reduce((a, b) => a + b, 0) + (words.length - 1) * spacing;

    let lineX = centerX - totalPhraseWidth / 2;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wWidth = wordWidths[i];
      const isCurrentWord = w === activeWord;

      if (isCurrentWord) {
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = roleColor;
        ctx.fillText(w.fullWord, lineX + wWidth / 2, contextY);

        ctx.beginPath();
        ctx.arc(lineX + wWidth / 2, contextY + 11 * dynamicScale, 2.2 * dynamicScale, 0, Math.PI * 2);
        ctx.fillStyle = roleColor;
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(w.fullWord, lineX + wWidth / 2, contextY);
      }

      lineX += wWidth + spacing;
    }

    ctx.globalAlpha = 1.0;
  }
};
