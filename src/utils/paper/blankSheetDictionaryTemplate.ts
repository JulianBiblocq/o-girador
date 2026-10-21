/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarit HTML Fiche Dictionnaire A4 imprimable par famille (< 135 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { getDictionaryEntries, DictionaryFamily } from './paperRhythmDictionary';
import { generateMemoFooterHTML } from './paperLegendHelper';
import {
  formatGridModeSignLabel, renderOpticalCircle,
  renderHandwritingNoticeHTML, renderStepCells,
} from './paperGridModeHelper';

export const renderBlankSheetDictionary = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const familyKey = (options.sectionName || 'bases_paradas') as DictionaryFamily;
  const entries = getDictionaryEntries(familyKey).slice(0, 3);
  const signLabel = formatGridModeSignLabel(options.gridMode, lang);

  const familyLabels: Record<string, string> = {
    bases_paradas: lang === 'fr' ? 'Bases & Paradas' : 'Bases e Paradas',
    luanda: 'Luanda',
    igarassu: 'Igarassu',
    ijexa: 'Ijexá',
    aruanda: 'Aruanda',
    cloud: lang === 'fr' ? 'Cloud & Actif' : 'Nuvem & Ativo',
  };
  const famTitle = familyLabels[familyKey] || familyKey.toUpperCase();

  const blocks = entries.map((item) => {
    const mainRows = Object.entries(item.patterns).map(([pup, steps]) => {
      const stepRow = Array.from({ length: 16 }, (_, i) => {
        const val = steps[i] === 0 || !steps[i] ? '' : String(steps[i]);
        const isBeatEnd = (i + 1) % 4 === 0 && i !== 15;
        return `<td style="width: calc(100% / 16); height: 18px; border: 1px solid #777; border-right: ${isBeatEnd ? '2px solid #1a1a1a' : '1px solid #777'}; text-align: center; font-weight: bold; font-size: 8.5pt; background: #fff;">${val}</td>`;
      }).join('');
      return `<tr><td style="width: 70px; font-weight: bold; font-size: 10pt; border: 1.5px solid #1a1a1a; padding: 2px 4px; background: #eee;">${pup.toUpperCase()}</td>${stepRow}</tr>`;
    }).join('');

    const varRows = (item.variations || []).map((v) => {
      const stepRow = Array.from({ length: 16 }, (_, i) => {
        const val = v.steps[i] === 0 || !v.steps[i] ? '' : String(v.steps[i]);
        const isBeatEnd = (i + 1) % 4 === 0 && i !== 15;
        return `<td style="width: calc(100% / 16); height: 18px; border: 1px solid #777; border-right: ${isBeatEnd ? '2px solid #1a1a1a' : '1px solid #777'}; text-align: center; font-weight: bold; font-size: 8.5pt; background: #fafafa;">${val}</td>`;
      }).join('');
      return `<tr><td style="width: 70px; font-size: 8.5pt; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 2px 4px; background: #fdfdfd; color: #444;">↳ Var ${v.varIndex}</td>${stepRow}</tr>`;
    }).join('');

    const nextVarIdx = (item.variations?.length || 0) + 1;
    const blankRows = [nextVarIdx, nextVarIdx + 1].map((vNum) => `
      <tr>
        <td style="width: 70px; border: 1.5px dashed #1a1a1a; padding: 2px 4px; font-size: 8pt; background: #fff; color: #666;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>↳ Var ${vNum}</span>
            ${renderOpticalCircle(false, '')}
          </div>
        </td>
        ${renderStepCells(16, options.gridMode, '18px')}
      </tr>
    `).join('');

    return `
      <div style="border: 1.5px solid #1a1a1a; background: #fff; flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="height: 22px; background: #e2d9c2; font-size: 8.5pt; font-weight: bold; padding: 0 8px; border-bottom: 1.5px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between;">
          <span>${item.name.toUpperCase()} — Formule : "${item.name.toUpperCase()} + Var (1) alfaia"</span>
          <div style="display: flex; gap: 8px;">
            ${renderOpticalCircle(false, 'Cloud')}
          </div>
        </div>
        <table style="width: 100%; height: 100%; border-collapse: collapse;">
          ${mainRows}
          ${varRows}
          ${blankRows}
        </table>
      </div>
    `;
  }).join('');

  return `
    <div class="sheet-page">
      <div style="flex-shrink: 0; border-bottom: 2px solid #1a1a1a; padding-bottom: 2px; margin-bottom: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2px;">
          <div>
            <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px;">FICHE DICTIONNAIRE — ${famTitle}</h2>
            <span style="font-size: 7.5pt; color: #555; font-style: italic;">
              ${lang === 'fr' ? 'Bases, variations numérotées et lignes d\'enrichissement manuscrit' : 'Bases, variações numeradas e linhas livres'}
            </span>
          </div>
          <div style="font-size: 9pt; font-weight: bold;">
            Sign : [ ${signLabel} ]
          </div>
        </div>
        ${renderHandwritingNoticeHTML(lang)}
      </div>

      <div class="blocks-container" style="flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; margin: 2px 0;">
        ${blocks}
      </div>

      <div style="flex-shrink: 0; margin-top: auto;">
        ${generateMemoFooterHTML(options.pupitres as any, lang)}
      </div>
    </div>
  `;
};
