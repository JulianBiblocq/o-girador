/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarit HTML Feuille C : Conducteur de Séquence Pleine Page (< 110 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { generateMemoFooterHTML } from './paperLegendHelper';
import { calculateFeuilleCSystemsCount } from './blankSheetSectionCalculator';
import {
  formatGridModeSignLabel, renderHandwritingNoticeHTML, renderOpticalCircle,
} from './paperGridModeHelper';

export const renderBlankSheetC = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape';
  const sysCount = calculateFeuilleCSystemsCount(isLandscape);
  const mPerSys = isLandscape ? 6 : 4;
  const signLabel = formatGridModeSignLabel(options.gridMode, lang);

  const systems = Array.from({ length: sysCount }, (_, sysIdx) => {
    const boxes = Array.from({ length: mPerSys }, (__, mIdx) => {
      const measureNum = sysIdx * mPerSys + mIdx + 1;
      return `
        <div style="border: 1.5px solid #1a1a1a; flex: 1; height: 100%; padding: 4px 6px; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: bold; color: #555;">
            <span>M${measureNum}</span>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${options.hasDoubleSections ? '<span style="font-size: 7.5pt; color: #8b2a1a; font-weight: bold;">[Sec]</span>' : ''}
              ${renderOpticalCircle(false, '')}
            </div>
          </div>
          <div style="text-align: center; font-size: 10pt; font-weight: bold; color: #222; border-bottom: 1px dotted #aaa; padding: 4px 0; margin: 2px 0;">
            [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
          </div>
          <div style="font-size: 7.5pt; color: #555; display: flex; justify-content: space-between; align-items: center;">
            ${options.hasToadaLine ? '<span>Td:__________</span>' : '<span></span>'}
            <span style="font-weight: bold;">×____</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: flex; gap: 5px; flex: 1; min-height: 0;">
        ${boxes}
      </div>
    `;
  }).join('');

  return `
    <div class="sheet-page">
      <div style="flex-shrink: 0; border-bottom: 2px solid #1a1a1a; padding-bottom: 2px; margin-bottom: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2px;">
          <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px;">${lang === 'fr' ? 'FEUILLE C — CONDUCTEUR DE SÉQUENCE' : 'FOLHA C — CONDUTOR DE SEQUÊNCIA'}</h2>
          <div style="font-size: 9pt; font-weight: bold;">
            ${options.conductorTitle || (lang === 'fr' ? 'Morceau' : 'Toada') + ' : ___________________'} │ = [ ___ ] │ Sign : [ ${signLabel} ]
          </div>
        </div>
        ${renderHandwritingNoticeHTML(lang)}
      </div>

      <div class="blocks-container" style="flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; margin: 3px 0;">
        ${systems}
      </div>

      <div style="flex-shrink: 0; margin-top: auto;">
        ${generateMemoFooterHTML(options.pupitres as any, lang)}
      </div>
    </div>
  `;
};
