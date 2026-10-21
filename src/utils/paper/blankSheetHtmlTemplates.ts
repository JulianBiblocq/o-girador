/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarits HTML purs pleine page pour fiches vierges Cordel A, B et C (< 140 lignes).
 */
import { BlankSheetOptions, GridMode } from '../../types/paperWorkshop.types';
import { generateMemoFooterHTML } from './paperLegendHelper';
import { resolvePupitreAbbr, resolvePupitreDisplayName } from './paperNomenclatureHelper';
import { calculateFeuilleASeriesCount, calculateFeuilleBSectionsCount, calculateFeuilleCSystemsCount } from './blankSheetSectionCalculator';
export { renderBlankSheetUniversal } from './blankSheetUniversalTemplate';

export const getGridStepsCount = (m: GridMode): number =>
  m === '2/4' ? 8 : (m === '3/4' || m === '12/8' ? 12 : (m === 'free_portrait' ? 24 : (m === 'free_landscape' ? 32 : 16)));

const renderStepCells = (count: number, isFour: boolean, h = '22px'): string =>
  Array.from({ length: count }, (_, i) => {
    const isQ = isFour && i % 4 === 0, isSh = isFour && (i < 4 || (i >= 8 && i < 12));
    const borderR = (i + 1) % 4 === 0 && i !== count - 1 ? '2px solid #1a1a1a' : '1px solid #777';
    return `<td style="width: calc(100% / ${count}); height: ${h}; border: 1px solid #777; border-right: ${borderR}; background: ${isSh ? '#f4f2ea' : '#fff'}; text-align: center; font-size: 8px; color: #aaa;">${isQ ? (i / 4) + 1 : ''}</td>`;
  }).join('');

const renderFreeRows = (count: number, steps: number, isFour: boolean, h = '22px'): string =>
  Array.from({ length: count }, () =>
    `<tr><td style="width: 75px; height: ${h}; border: 1.5px dashed #1a1a1a; padding: 2px 4px; font-size: 8px; background: #fafafa; color: #666; font-family: monospace;">[ ____ ]</td>${renderStepCells(steps, isFour, h)}</tr>`
  ).join('');

export const renderBlankSheetA = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape', steps = getGridStepsCount(options.gridMode), isFour = options.gridMode === '4/4';
  const hasVar = options.pupitres.includes('al') && options.includeVariationLine;
  const seriesCount = calculateFeuilleASeriesCount({ pupitresCount: options.pupitres.length, hasVariationLine: hasVar, freeLinesCount: options.freeLinesCount, isLandscape });
  const cellH = seriesCount >= 4 ? '19px' : '22px', pageH = isLandscape ? 'calc(210mm - 14mm)' : 'calc(297mm - 14mm)';

  const allRows = Array.from({ length: seriesCount }, (_, sIdx) => {
    const header = seriesCount > 1 ? `<tr><td colspan="${steps + 1}" style="background: #e2d9c2; font-size: 8px; font-weight: bold; padding: 2px 6px; border: 1px solid #1a1a1a; text-transform: uppercase;">${lang === 'fr' ? 'Motif' : 'Padrão'} ${sIdx + 1}</td></tr>` : '';
    const rows = options.pupitres.flatMap((p) => {
      const abbr = resolvePupitreAbbr(p), name = resolvePupitreDisplayName(p, lang);
      const main = `<tr><td style="width: 75px; height: ${cellH}; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 2px 4px; font-size: 9px; background: #eee;">${abbr} (${name})</td>${renderStepCells(steps, isFour, cellH)}</tr>`;
      const varRow = (p === 'al' && hasVar) ? `<tr><td style="width: 75px; height: ${cellH}; border: 1.5px solid #1a1a1a; padding: 2px 4px; font-size: 8px; background: #fdfdfd; color: #444; white-space: nowrap;">↳ Me/Rp</td>${renderStepCells(steps, isFour, cellH)}</tr>` : '';
      return [main, varRow].filter(Boolean);
    }).join('') + renderFreeRows(options.freeLinesCount || 0, steps, isFour, cellH);
    return header + rows;
  }).join('');

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; min-height: ${pageH}; display: flex; flex-direction: column; justify-content: space-between;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 3px; margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase;">${lang === 'fr' ? 'FEUILLE A — PATTERNS ISOLÉS (BASES)' : 'FOLHA A — PADRÕES ISOLADOS'}</h2>
        <div style="font-size: 9.5px; font-weight: bold;">${lang === 'fr' ? 'Rythme / Toada' : 'Ritmo / Toada'} : ___________________ | ♩ = _____ | Sign : ${options.gridMode}</div>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;"><table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">${allRows}</table></div>
      ${generateMemoFooterHTML(options.pupitres as any, lang)}
    </div>
  `;
};

export const renderBlankSheetB = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape', steps = getGridStepsCount(options.gridMode), isFour = options.gridMode === '4/4';
  const hasVar = options.pupitres.includes('al') && options.includeVariationLine;
  const systemsCount = calculateFeuilleBSectionsCount({ pupitresCount: options.pupitres.length, hasVariationLine: hasVar, freeLinesCount: options.freeLinesCount, isLandscape });
  const cellH = systemsCount >= 4 ? '19px' : '22px', boxMargin = systemsCount >= 4 ? '5px' : '8px', pageH = isLandscape ? 'calc(210mm - 14mm)' : 'calc(297mm - 14mm)';

  const systems = Array.from({ length: systemsCount }, (_, idx) => {
    const sysNum = idx + 1;
    const rows = options.pupitres.flatMap((p) => {
      const abbr = resolvePupitreAbbr(p);
      const main = `<tr><td style="width: 70px; height: ${cellH}; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 2px 3px; font-size: 8.5px; background: #f0f0f0;">${abbr}</td>${renderStepCells(steps, isFour, cellH)}</tr>`;
      const varRow = (p === 'al' && hasVar) ? `<tr><td style="width: 70px; height: ${cellH}; border: 1.5px solid #1a1a1a; padding: 2px 3px; font-size: 7.5px; background: #fff; color: #555; white-space: nowrap;">↳ Me/Rp</td>${renderStepCells(steps, isFour, cellH)}</tr>` : '';
      return [main, varRow].filter(Boolean);
    }).join('') + renderFreeRows(options.freeLinesCount || 0, steps, isFour, cellH);

    return `
      <div style="margin-bottom: ${boxMargin}; border: 1.5px solid #1a1a1a; padding: 3px 5px; background: #fff; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 9px; font-weight: bold;">
          <span>${lang === 'fr' ? 'SECTION' : 'SEÇÃO'} #${sysNum} : [ ________________________ ]</span>
          <span>♩ = [ ____ ] &nbsp;|&nbsp; <em>${lang === 'fr' ? '(Mot-clé "Base" = rappel motif étalon)' : '(Palavra "Base" = padrão)'}</em></span>
        </div>
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; min-height: ${pageH}; display: flex; flex-direction: column; justify-content: space-between;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 3px; margin-bottom: 5px;">
        <h2 style="margin: 0; font-size: 13.5px; text-transform: uppercase;">${lang === 'fr' ? 'FEUILLE B — SECTIONS MULTI-INSTRUMENTS' : 'FOLHA B — SEÇÕES MULTI-INSTRUMENTOS'}</h2>
        <span style="font-size: 9.5px; font-weight: bold;">Sign : ${options.gridMode}</span>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">${systems}</div>
      ${generateMemoFooterHTML(options.pupitres as any, lang)}
    </div>
  `;
};

export const renderBlankSheetC = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape', sysCount = calculateFeuilleCSystemsCount(isLandscape), mPerSys = 8;
  const pageH = isLandscape ? 'calc(210mm - 14mm)' : 'calc(297mm - 14mm)';

  const systems = Array.from({ length: sysCount }, (_, sysIdx) => {
    const boxes = Array.from({ length: mPerSys }, (__, mIdx) => {
      const measureNum = sysIdx * mPerSys + mIdx + 1;
      return `
        <div style="border: 1.5px solid #1a1a1a; flex: 1; min-height: ${isLandscape ? '34px' : '38px'}; padding: 2px; background: #fff; position: relative; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; font-size: 7.5px; font-weight: bold; color: #777;">
            <span>M${measureNum}</span>
            ${options.hasDoubleSections ? '<span style="font-size: 6.5px; color: #8b2a1a;">[Sec]</span>' : ''}
          </div>
          <div style="text-align: center; font-size: 8.5px; font-weight: bold; color: #333;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
          <div style="border-top: 1px dashed #ccc; font-size: 6.5px; color: #666; display: flex; justify-content: space-between;">
            ${options.hasToadaLine ? '<span>Td:___</span>' : '<span></span>'}<span>x1</span>
          </div>
        </div>
      `;
    }).join('');
    return `<div style="display: flex; gap: 3px; margin-bottom: 4px; flex: 1;">${boxes}</div>`;
  }).join('');

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; min-height: ${pageH}; display: flex; flex-direction: column; justify-content: space-between;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 3px; margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 13.5px; text-transform: uppercase;">${lang === 'fr' ? 'FEUILLE C — CONDUCTEUR DE SÉQUENCE' : 'FOLHA C — CONDUTOR DE SEQUÊNCIA'}</h2>
        <span style="font-size: 9.5px; font-weight: bold;">${options.conductorTitle || (lang === 'fr' ? 'Morceau' : 'Toada') + ' : ___________________'}</span>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">${systems}</div>
      ${generateMemoFooterHTML(options.pupitres as any, lang)}
    </div>
  `;
};
