/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarit HTML Feuille A : Patterns Isolés (Bases) Pleine Page (< 130 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { generateMemoFooterHTML } from './paperLegendHelper';
import { resolvePupitreAbbr } from './paperNomenclatureHelper';
import { calculateFeuilleASeriesCount } from './blankSheetSectionCalculator';
import {
  formatGridModeSignLabel, getGridStepsCount, renderOpticalCircle,
  renderHandwritingNoticeHTML, renderTopOptionsBar, renderStepCells,
} from './paperGridModeHelper';
import { getPrefillEntries, renderHybridBlankRows, renderPrefilledStepCells } from './blankSheetPrefillHelper';

export const renderBlankSheetA = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape';
  const steps = getGridStepsCount(options.gridMode);
  const hasVar = options.pupitres.includes('al') && options.includeVariationLine;
  const seriesCount = calculateFeuilleASeriesCount({ pupitresCount: options.pupitres.length, hasVariationLine: hasVar, freeLinesCount: options.freeLinesCount, isLandscape });
  const signLabel = formatGridModeSignLabel(options.gridMode, lang);
  const prefillEntries = getPrefillEntries(options.prefillFamily);

  const motifBlocks = Array.from({ length: seriesCount }, (_, sIdx) => {
    const prefill = prefillEntries[sIdx];
    const rows = options.pupitres.flatMap((p) => {
      const abbr = resolvePupitreAbbr(p);
      const prefillSteps = prefill?.patterns[p];
      const stepCells = prefillSteps ? renderPrefilledStepCells(prefillSteps, steps, options.gridMode) : renderStepCells(steps, options.gridMode);
      const main = `<tr><td style="width: 82px; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 2px 4px; font-size: 11pt; background: #f0f0f0;">${abbr}</td>${stepCells}</tr>`;
      const varRow = (p === 'al' && hasVar)
        ? `<tr><td style="width: 82px; border: 1.5px solid #1a1a1a; padding: 2px 4px; font-size: 9pt; font-weight: bold; background: #fbfbfb; color: #333; white-space: nowrap;">↳ Me/Rp</td>${renderStepCells(steps, options.gridMode)}</tr>`
        : '';
      return [main, varRow].filter(Boolean);
    }).join('') + renderHybridBlankRows(prefill?.variations?.length ? prefill.variations.length + 1 : 1, steps, options.gridMode);

    const titleText = prefill ? prefill.name.toUpperCase() : `____________________________________`;

    return `
      <div style="border: 1.5px solid #1a1a1a; background: #fff; flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="height: 25px; background: #e2d9c2; font-size: 9pt; font-weight: bold; padding: 0 8px; border-bottom: 1.5px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between;">
          <span>${lang === 'fr' ? 'MOTIF' : 'PADRÃO'} #${sIdx + 1} — ${lang === 'fr' ? 'Nom' : 'Nome'} : ${titleText}</span>
          <div style="display: flex; gap: 10px; align-items: center;">
            ${renderOpticalCircle(false, 'Pattern Cloud')}
            ${renderOpticalCircle(false, '+ Variations')}
          </div>
        </div>
        <table style="width: 100%; height: 100%; border-collapse: collapse;">${rows}</table>
      </div>
    `;
  }).join('');

  return `
    <div class="sheet-page">
      <div style="flex-shrink: 0; border-bottom: 2px solid #1a1a1a; padding-bottom: 2px; margin-bottom: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2px;">
          <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px;">${lang === 'fr' ? 'FEUILLE A — PATTERNS ISOLÉS (BASES)' : 'FOLHA A — PADRÕES ISOLADOS'}</h2>
          <div style="font-size: 9pt; font-weight: bold;">
            ${lang === 'fr' ? 'Rythme / Toada' : 'Ritmo / Toada'} : ${options.prefillFamily ? options.prefillFamily.toUpperCase() : '___________________'} │ = [ ___ ] │ Sign : [ ${signLabel} ]
          </div>
        </div>
        ${renderHandwritingNoticeHTML(lang)}
        ${renderTopOptionsBar(options, lang)}
      </div>

      <div class="blocks-container" style="flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; margin: 2px 0;">
        ${motifBlocks}
      </div>

      <div style="flex-shrink: 0; margin-top: auto;">
        ${generateMemoFooterHTML(options.pupitres as any, lang)}
      </div>
    </div>
  `;
};
