/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarits HTML purs pour les 3 fiches vierges Cordel (< 145 lignes).
 */
import { BlankSheetOptions, GridMode } from '../../types/paperWorkshop.types';
import { generateMemoFooterHTML } from './paperLegendHelper';
import { resolvePupitreAbbr, resolvePupitreDisplayName } from './paperNomenclatureHelper';
export { renderBlankSheetUniversal } from './blankSheetUniversalTemplate';

export const getGridStepsCount = (mode: GridMode): number => {
  if (mode === '2/4') return 8;
  if (mode === '3/4' || mode === '12/8') return 12;
  if (mode === 'free_portrait') return 24;
  if (mode === 'free_landscape') return 32;
  return 16;
};

const renderStepCells = (count: number, isFourFour: boolean): string => {
  return Array.from({ length: count }, (_, i) => {
    const isQuarter = isFourFour && i % 4 === 0;
    const isShaded = isFourFour && (i < 4 || (i >= 8 && i < 12));
    const bg = isShaded ? '#f4f2ea' : '#ffffff';
    const borderRight = (i + 1) % 4 === 0 && i !== count - 1 ? '2px solid #1a1a1a' : '1px solid #777';
    return `<td style="width: calc(100% / ${count}); height: 26px; border: 1px solid #777; border-right: ${borderRight}; background: ${bg}; text-align: center; font-size: 8px; color: #aaa;">${isQuarter ? (i / 4) + 1 : ''}</td>`;
  }).join('');
};

const renderFreeRows = (count: number, steps: number, isFour: boolean): string => {
  return Array.from({ length: count }, () =>
    `<tr><td style="width: 75px; border: 1.5px dashed #1a1a1a; padding: 4px; font-size: 9px; background: #fafafa; color: #666; font-family: monospace;">[ ____ ]</td>${renderStepCells(steps, isFour)}</tr>`
  ).join('');
};

export const renderBlankSheetA = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const steps = getGridStepsCount(options.gridMode);
  const isFour = options.gridMode === '4/4';
  const rows = options.pupitres.flatMap((p) => {
    const abbr = resolvePupitreAbbr(p);
    const name = resolvePupitreDisplayName(p, lang);
    const main = `<tr><td style="width: 75px; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 4px; font-size: 10px; background: #eee;">${abbr} (${name})</td>${renderStepCells(steps, isFour)}</tr>`;
    const varRow = (p === 'al' && options.includeVariationLine)
      ? `<tr><td style="width: 75px; border: 1.5px solid #1a1a1a; padding: 3px; font-size: 9px; background: #fdfdfd; color: #444;">↳ Me/Rp</td>${renderStepCells(steps, isFour)}</tr>`
      : '';
    return [main, varRow].filter(Boolean);
  }).join('') + renderFreeRows(options.freeLinesCount || 0, steps, isFour);

  return `
    <div style="font-family: sans-serif; color: #1a1a1a;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 6px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 16px; text-transform: uppercase;">${lang === 'fr' ? 'FEUILLE A — PATTERNS ISOLÉS (BASES)' : 'FOLHA A — PADRÕES ISOLADOS (BASES)'}</h2>
        <div style="font-size: 11px; font-weight: bold;">${lang === 'fr' ? 'Rythme / Toada' : 'Ritmo / Toada'} : ___________________ | ♩ = _____</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">${rows}</table>
      ${generateMemoFooterHTML(options.pupitres as any, lang)}
    </div>
  `;
};

export const renderBlankSheetB = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const steps = getGridStepsCount(options.gridMode);
  const isFour = options.gridMode === '4/4';
  const systems = [1, 2, 3].map((sysNum) => {
    const rows = options.pupitres.flatMap((p) => {
      const abbr = resolvePupitreAbbr(p);
      const main = `<tr><td style="width: 70px; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 3px; font-size: 9px; background: #f0f0f0;">${abbr}</td>${renderStepCells(steps, isFour)}</tr>`;
      const varRow = (p === 'al' && options.includeVariationLine)
        ? `<tr><td style="width: 70px; border: 1.5px solid #1a1a1a; padding: 2px; font-size: 8px; background: #fff; color: #555;">↳ Me/Rp</td>${renderStepCells(steps, isFour)}</tr>`
        : '';
      return [main, varRow].filter(Boolean);
    }).join('') + renderFreeRows(options.freeLinesCount || 0, steps, isFour);

    return `
      <div style="margin-bottom: 12px; border: 1.5px solid #1a1a1a; padding: 6px; background: #fff;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 10px; font-weight: bold;">
          <span>${lang === 'fr' ? 'SECTION' : 'SEÇÃO'} #${sysNum} : [ ________________________ ]</span>
          <span>♩ = [ ____ ] &nbsp;|&nbsp; <em>${lang === 'fr' ? '(Mot-clé "Base" = rappel motif étalon)' : '(Palavra "Base" = padrão)'}</em></span>
        </div>
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: sans-serif; color: #1a1a1a;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; margin-bottom: 8px;">
        <h2 style="margin: 0; font-size: 15px; text-transform: uppercase;">${lang === 'fr' ? 'FEUILLE B — SECTIONS MULTI-INSTRUMENTS' : 'FOLHA B — SEÇÕES MULTI-INSTRUMENTOS'}</h2>
        <span style="font-size: 10px; font-weight: bold;">Sign : ${options.gridMode}</span>
      </div>
      ${systems}
      ${generateMemoFooterHTML(options.pupitres as any, lang)}
    </div>
  `;
};

export const renderBlankSheetC = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const mCount = options.conductorMeasures || 32;
  const cols = mCount === 24 ? 6 : (mCount === 48 ? 8 : 8);
  const boxes = Array.from({ length: mCount }, (_, i) => `
    <div style="border: 1.5px solid #1a1a1a; min-height: 52px; padding: 3px; background: #fff; position: relative; box-sizing: border-box;">
      <span style="position: absolute; top: 2px; left: 3px; font-size: 8px; color: #888; font-weight: bold;">M${i + 1}</span>
      ${options.hasDoubleSections ? '<div style="font-size: 7px; color: #8b2a1a; font-weight: bold; margin-top: 2px; text-align: right;">[ Sec. Macro ]</div>' : ''}
      <div style="margin-top: 10px; text-align: center; font-size: 9px; font-weight: bold; color: #333;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
      <div style="position: absolute; bottom: 2px; left: 3px; right: 3px; border-top: 1px dashed #ccc; font-size: 7px; color: #666; display: flex; justify-content: space-between;">
        ${options.hasToadaLine ? '<span>Td:_______</span>' : '<span></span>'}<span>x1</span>
      </div>
    </div>
  `).join('');

  return `
    <div style="font-family: sans-serif; color: #1a1a1a;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 15px; text-transform: uppercase;">${lang === 'fr' ? 'FEUILLE C — CONDUCTEUR DE SÉQUENCE' : 'FOLHA C — CONDUTOR DE SEQUÊNCIA'}</h2>
        <span style="font-size: 10px; font-weight: bold;">${options.conductorTitle || (lang === 'fr' ? 'Morceau' : 'Toada') + ' : ___________________'}</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 4px; margin-bottom: 12px;">${boxes}</div>
      ${generateMemoFooterHTML(options.pupitres as any, lang)}
    </div>
  `;
};
