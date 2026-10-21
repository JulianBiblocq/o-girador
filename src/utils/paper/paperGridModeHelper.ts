/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Helper partagé de calibrage de grille, signatures lisibles et repères optiques (< 140 lignes).
 */
import { GridMode, BlankSheetOptions } from '../../types/paperWorkshop.types';

export const formatGridModeSignLabel = (mode: GridMode, lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';
  switch (mode) {
    case '4/4': return isFr ? '4/4 (16 pas)' : '4/4 (16 passos)';
    case '2/4': return isFr ? '2/4 (8 pas)' : '2/4 (8 passos)';
    case '3/4': return isFr ? '3/4 (12 pas)' : '3/4 (12 passos)';
    case '12/8': return isFr ? '12/8 (12 pas)' : '12/8 (12 passos)';
    case 'free_portrait': return isFr ? '24 pas (Portrait)' : '24 passos (Retrato)';
    case 'free_landscape': return isFr ? '32 pas (Paysage)' : '32 passos (Paisagem)';
    default: return String(mode);
  }
};

export const getGridStepsCount = (m: GridMode): number =>
  m === '2/4' ? 8 : (m === '3/4' || m === '12/8' ? 12 : (m === 'free_portrait' ? 24 : (m === 'free_landscape' ? 32 : 16)));

export const renderOpticalCircle = (checked: boolean, label: string): string => `
  <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 8pt; font-weight: bold; white-space: nowrap;">
    <span style="display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid #1a1a1a; background: ${checked ? '#1a1a1a' : '#fff'}; box-sizing: border-box; vertical-align: middle;"></span>
    ${label ? `<span>${label}</span>` : ''}
  </span>
`;

export const renderHandwritingNoticeHTML = (lang: 'fr' | 'pt'): string => {
  const isFr = lang === 'fr';
  const text = isFr
    ? 'ÉCRITURE : Titres & Noms en MAJUSCULES BÂTONS (ex: LUANDA) │ Grille : SCRIPT détaché (MAJUSCULE = Fort • minuscule = faible) │ Noircir ● les ronds activés'
    : 'ESCRITA: Títulos e Nomes em MAIÚSCULAS BASTÃO (ex: LUANDA) │ Grelha: SCRIPT destacado (MAIÚSCULA = Forte • minúscula = fraco) │ Preencher ● os círculos ativados';
  return `
    <div style="font-size: 7.5pt; font-weight: bold; color: #444; background: #faf6eb; border: 1px dashed #1a1a1a; padding: 2px 6px; margin-bottom: 4px; text-align: center; letter-spacing: 0.2px;">
      ${text}
    </div>
  `;
};

export const renderTopOptionsBar = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => `
  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-bottom: 3px;">
    ${renderOpticalCircle(Boolean(options.linkAlfaias), 'Link Alfaias (Al)')}
    ${renderOpticalCircle(Boolean(options.busCaixas), 'Bus Caixas (Cx+Tr)')}
    ${renderOpticalCircle(Boolean(options.busSementes), 'Bus Sementes (Ab+Mi)')}
  </div>
`;

export const renderStepCells = (count: number, gridMode: GridMode, cellH = '100%'): string => {
  const isTernary = gridMode === '12/8';
  const beatStep = isTernary ? 3 : 4;
  return Array.from({ length: count }, (_, i) => {
    const isQuarter = (i % beatStep === 0);
    const quarterNum = isQuarter ? Math.floor(i / beatStep) + 1 : '';
    const isBeatEnd = (i + 1) % beatStep === 0 && i !== count - 1;
    const borderR = isBeatEnd ? '2px solid #1a1a1a' : '1px solid #777';
    const isShaded = Math.floor(i / beatStep) % 2 === 0;
    return `<td style="width: calc(100% / ${count}); height: ${cellH}; border: 1px solid #777; border-right: ${borderR}; background: ${isShaded ? '#f7f5ed' : '#ffffff'}; text-align: center; font-size: 8pt; color: #888; font-family: sans-serif; vertical-align: middle;">${quarterNum}</td>`;
  }).join('');
};
