/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarit HTML Feuille D : 100% Vierge Universelle (Blocs collés & Double marge) (< 120 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import {
  formatGridModeSignLabel, renderOpticalCircle, renderHandwritingNoticeHTML,
  renderTopOptionsBar, renderStepCells,
} from './paperGridModeHelper';
import { getPrefillEntries, renderPrefilledStepCells } from './blankSheetPrefillHelper';

export const renderBlankSheetUniversal = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape';
  const cols = isLandscape ? 32 : 24;
  const blocksCount = isLandscape ? 3 : 4;
  const signLabel = formatGridModeSignLabel(options.gridMode, lang);
  const prefillEntries = getPrefillEntries(options.prefillFamily);

  const headerTitle = lang === 'fr' ? 'FEUILLE D — 100 % VIERGE UNIVERSELLE' : 'FOLHA D — 100 % LIVRE UNIVERSAL';
  const lblTitle = lang === 'fr' ? 'Titre' : 'Título';
  const lblSeq = lang === 'fr' ? 'Séquence / Conducteur' : 'Sequência / Condutor';
  const lblToada = lang === 'fr' ? 'Toada / Chant' : 'Toada / Canto';

  const blocks = Array.from({ length: blocksCount }, (_, bIdx) => {
    const prefill = prefillEntries[bIdx];
    const prefillRows = prefill ? Object.entries(prefill.patterns).slice(0, 2).map(([inst, steps]) => `
      <tr>
        <td style="width: 34px; font-weight: bold; font-size: 10pt; border: 1.5px solid #1a1a1a; padding: 2px; background: #eee; text-align: center;">${inst.toUpperCase()}</td>
        <td style="width: 54px; border: 1.5px solid #1a1a1a; padding: 2px 3px; font-size: 8pt; background: #fafafa; color: #444;">Base</td>
        ${renderPrefilledStepCells(steps as any, cols, options.gridMode)}
        <td style="width: 30px; font-family: monospace; font-size: 9pt; border: 1.5px solid #1a1a1a; text-align: center; background: #fafafa;">×1</td>
      </tr>
    `).join('') : '';

    const blankCount = prefill ? 2 : 4;
    const blankRows = Array.from({ length: blankCount }, (_, rIdx) => `
      <tr>
        <td style="width: 34px; font-weight: bold; font-size: 11pt; border: 1.5px solid #1a1a1a; padding: 2px; background: #f0f0f0; text-align: center; vertical-align: middle;">
          <span style="border-bottom: 1px dotted #888; display: inline-block; width: 26px; height: 14px;"></span>
        </td>
        <td style="width: 54px; border: 1.5px solid #1a1a1a; padding: 2px 3px; font-size: 8pt; background: #fafafa; color: #555; vertical-align: middle;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 7.5pt; font-family: monospace;">${prefill ? `↳ Var ${rIdx + 1}` : ''}</span>
            ${renderOpticalCircle(false, '')}
          </div>
        </td>
        ${renderStepCells(cols, options.gridMode)}
        <td style="width: 30px; font-family: monospace; font-size: 9pt; border: 1.5px solid #1a1a1a; text-align: center; background: #fafafa; color: #555; vertical-align: middle;">×__</td>
      </tr>
    `).join('');

    const titleStr = prefill ? prefill.name.toUpperCase() : `___________________________________`;

    return `
      <div style="border: 1.5px solid #1a1a1a; background: #fff; flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="height: 22px; background: #e2d9c2; font-size: 8.5pt; font-weight: bold; padding: 0 8px; border-bottom: 1.5px solid #1a1a1a; display: flex; align-items: center; justify-content: space-between;">
          <span>${lang === 'fr' ? 'Nom Pattern / Section' : 'Nome Padrão / Seção'} #${bIdx + 1} : ${titleStr}</span>
          <div style="display: flex; gap: 10px; align-items: center;">
            ${renderOpticalCircle(false, 'Pattern Cloud')}
            ${renderOpticalCircle(false, 'Section Cloud')}
          </div>
        </div>
        <table style="width: 100%; height: 100%; border-collapse: collapse;">
          <thead>
            <tr style="height: 14px; background: #f7f7f7; border-bottom: 1px solid #1a1a1a; font-size: 7pt; color: #666;">
              <th style="width: 34px; border-right: 1px solid #ccc; text-align: center;">INST</th>
              <th style="width: 54px; border-right: 1px solid #ccc; text-align: center;">BASE / VAR</th>
              <th colspan="${cols}" style="text-align: center; letter-spacing: 0.5px;">GRILLE LIBRE (${cols} CARREAUX)</th>
              <th style="width: 30px; border-left: 1px solid #ccc; text-align: center;">REP</th>
            </tr>
          </thead>
          <tbody>${prefillRows}${blankRows}</tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <div class="sheet-page">
      <div style="flex-shrink: 0; border-bottom: 2px solid #1a1a1a; padding-bottom: 2px; margin-bottom: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2px;">
          <div>
            <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; letter-spacing: 0.5px;">${headerTitle}</h2>
            <span style="font-size: 7.5pt; color: #555; font-style: italic;">
              ${lang === 'fr' ? 'Tout écrire à la main : nom, liaisons (Mc+Me), variations (↳Rp), barres et multip.' : 'Escreva tudo à mão: instrumentos, ligações (Mc+Me), variações (↳Rp), barras e multip.'}
            </span>
          </div>
          <div style="font-size: 9pt; font-weight: bold;">
            ${lblTitle} : ${options.prefillFamily ? options.prefillFamily.toUpperCase() : '____________________________________'} │ Sign : [ ${signLabel} ]
          </div>
        </div>
        ${renderHandwritingNoticeHTML(lang)}
        ${renderTopOptionsBar(options, lang)}
      </div>

      <div class="blocks-container" style="flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; margin: 2px 0;">
        ${blocks}
      </div>

      <div style="flex-shrink: 0; margin-top: auto;">
        <div style="border: 1.5px solid #1a1a1a; padding: 4px 8px; background: #fff; margin-bottom: 4px; font-size: 8.5pt; display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="text-transform: uppercase; font-size: 8pt; width: 130px; flex-shrink: 0;">${lblSeq} :</strong>
            <span style="border-bottom: 1px solid #1a1a1a; flex: 1; height: 12px;"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="text-transform: uppercase; font-size: 8pt; width: 130px; flex-shrink: 0;">${lblToada} :</strong>
            <span style="border-bottom: 1px solid #1a1a1a; flex: 1; height: 12px;"></span>
          </div>
        </div>
        <div style="border: 1px dashed #777; padding: 3px 6px; font-family: monospace; font-size: 7.5pt; color: #555; background: #fafafa; display: flex; justify-content: space-between;">
          <span><strong>${lang === 'fr' ? 'LIAISONS' : 'LIGAÇÕES'} :</strong> Al, Mc+Me, Cx+Tr, Ab+Mi</span>
          <span><strong>${lang === 'fr' ? 'VARIATION :' : 'VARIAÇÃO :'}</strong> ↳Rp, ↳Me/Rp</span>
          <span><strong>${lang === 'fr' ? 'ARRÊT :' : 'FIM :'}</strong> ||</span>
          <span><strong>${lang === 'fr' ? 'COUP SCINDÉ :' : 'TOQUE DUPLO :'}</strong> D/E</span>
        </div>
      </div>
    </div>
  `;
};
