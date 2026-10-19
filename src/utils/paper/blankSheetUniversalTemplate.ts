/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarit HTML Feuille D : 100% Vierge Universelle (Tout à la main) (< 110 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';

export const renderBlankSheetUniversal = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape';
  const cols = isLandscape ? 32 : 24;
  const rowCount = isLandscape ? 12 : 15;

  const renderCells = () =>
    Array.from({ length: cols }, (_, i) => {
      const isFourth = (i + 1) % 4 === 0 && i !== cols - 1;
      const borderRight = isFourth ? '1.5px solid #555' : '1px solid #bbb';
      return `<td style="width: calc(100% / ${cols}); height: 26px; border: 1px solid #bbb; border-right: ${borderRight}; background: #ffffff; text-align: center; font-size: 7px; color: #ccc;">${i % 4 === 0 ? '•' : ''}</td>`;
    }).join('');

  const rows = Array.from({ length: rowCount }, (_, rIdx) => `
    <tr>
      <td style="width: 78px; height: 26px; border: 1.5px solid #1a1a1a; padding: 2px 4px; font-family: monospace; font-size: 9px; background: #fafafa; color: #888; text-align: left; vertical-align: middle;">
        <span style="border-bottom: 1px dotted #aaa; display: inline-block; width: 100%; height: 16px;"></span>
      </td>
      ${renderCells()}
      <td style="width: 32px; height: 26px; border: 1.5px solid #1a1a1a; padding: 2px; font-family: monospace; font-size: 8px; background: #fafafa; color: #888; text-align: center; vertical-align: middle;">
        ×__
      </td>
    </tr>
  `).join('');

  const headerTitle = lang === 'fr' ? 'FEUILLE D — 100 % VIERGE UNIVERSELLE' : 'FOLHA D — 100 % LIVRE UNIVERSAL';
  const lblTitle = lang === 'fr' ? 'Titre' : 'Título';
  const lblSeq = lang === 'fr' ? 'Séquence / Conducteur' : 'Sequência / Condutor';
  const lblToada = lang === 'fr' ? 'Toada / Chant' : 'Toada / Canto';

  return `
    <div style="font-family: sans-serif; color: #1a1a1a;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-bottom: 8px;">
        <div>
          <h2 style="margin: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">${headerTitle}</h2>
          <span style="font-size: 9px; color: #555; font-style: italic;">
            ${lang === 'fr' ? 'Tout écrire à la main : nom, liaisons (Mc+Me), variations (↳Rp), barres et multip.' : 'Escreva tudo à mão: instrumentos, ligações (Mc+Me), variações (↳Rp), barras e multip.'}
          </span>
        </div>
        <div style="font-size: 11px; font-weight: bold; display: flex; gap: 14px;">
          <span>${lblTitle} : _________________________</span>
          <span>♩ = [ ____ ]</span>
          <span>Sign : [ ____ ]</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
          <tr>
            <th style="font-size: 8px; text-transform: uppercase; color: #666; text-align: left; padding: 2px 4px; border: none;">
              ${lang === 'fr' ? 'Inst / Var' : 'Inst / Var'}
            </th>
            <th colspan="${cols}" style="font-size: 7.5px; color: #888; text-align: center; font-weight: normal; border: none; letter-spacing: 1px;">
              ${lang === 'fr' ? '← GRILLE LIBRE (Repères tous les 4 carreaux • Barres de temps libres) →' : '← GRELHA LIVRE (Marcas a cada 4 casas • Barras de tempo livres) →'}
            </th>
            <th style="font-size: 8px; text-transform: uppercase; color: #666; text-align: center; padding: 2px; border: none;">
              Rep.
            </th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="border: 1.5px solid #1a1a1a; padding: 6px 10px; background: #fff; margin-bottom: 8px; font-size: 10px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="text-transform: uppercase; font-size: 9px; width: 140px; flex-shrink: 0;">${lblSeq} :</strong>
          <span style="border-bottom: 1px solid #1a1a1a; flex: 1; height: 16px;"></span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="text-transform: uppercase; font-size: 9px; width: 140px; flex-shrink: 0;">${lblToada} :</strong>
          <span style="border-bottom: 1px solid #1a1a1a; flex: 1; height: 16px;"></span>
        </div>
      </div>

      <div style="border: 1px dashed #777; padding: 4px 8px; font-family: monospace; font-size: 7.5px; color: #555; background: #fafafa; display: flex; justify-content: space-between;">
        <span><strong>LIAISONS :</strong> Al, Mc+Me, Cx+Tr, Ab+Mi, { Al</span>
        <span><strong>VARIATION :</strong> ↳Rp, ↳Me/Rp, ↳30% (cases vides = copie maître)</span>
        <span><strong>ARRÊT :</strong> || (coupure)  •  <strong>BASE :</strong> rappel motif</span>
        <span><strong>COUP SCINDÉ :</strong> D/E</span>
      </div>
    </div>
  `;
};
