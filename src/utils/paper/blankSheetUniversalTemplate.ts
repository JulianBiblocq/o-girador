/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gabarit HTML Feuille D : 100% Vierge Universelle Pleine Page (< 100 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { calculateFeuilleDRowsCount } from './blankSheetSectionCalculator';

export const renderBlankSheetUniversal = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isLandscape = options.gridMode === 'free_landscape';
  const cols = isLandscape ? 32 : 24;
  const rowCount = calculateFeuilleDRowsCount(isLandscape);
  const cellHeight = isLandscape ? '19px' : '20px';

  const renderCells = () =>
    Array.from({ length: cols }, (_, i) => {
      const isFourth = (i + 1) % 4 === 0 && i !== cols - 1;
      const borderRight = isFourth ? '1.5px solid #555' : '1px solid #bbb';
      return `<td style="width: calc(100% / ${cols}); height: ${cellHeight}; border: 1px solid #bbb; border-right: ${borderRight}; background: #ffffff; text-align: center; font-size: 7px; color: #ccc;">${i % 4 === 0 ? '•' : ''}</td>`;
    }).join('');

  const rows = Array.from({ length: rowCount }, () => `
    <tr>
      <td style="width: 76px; height: ${cellHeight}; border: 1.5px solid #1a1a1a; padding: 2px 4px; font-family: monospace; font-size: 8px; background: #fafafa; color: #888; text-align: left; vertical-align: middle;">
        <span style="border-bottom: 1px dotted #aaa; display: inline-block; width: 100%; height: 12px;"></span>
      </td>
      ${renderCells()}
      <td style="width: 30px; height: ${cellHeight}; border: 1.5px solid #1a1a1a; padding: 2px; font-family: monospace; font-size: 8px; background: #fafafa; color: #888; text-align: center; vertical-align: middle;">
        ×__
      </td>
    </tr>
  `).join('');

  const headerTitle = lang === 'fr' ? 'FEUILLE D — 100 % VIERGE UNIVERSELLE' : 'FOLHA D — 100 % LIVRE UNIVERSAL';
  const lblTitle = lang === 'fr' ? 'Titre' : 'Título', lblSeq = lang === 'fr' ? 'Séquence / Conducteur' : 'Sequência / Condutor', lblToada = lang === 'fr' ? 'Toada / Chant' : 'Toada / Canto';
  const signLabel = isLandscape ? (lang === 'fr' ? '32 pas (Paysage)' : '32 passos (Paisagem)') : (lang === 'fr' ? '24 pas (Portrait)' : '24 passos (Retrato)');
  const pageH = isLandscape ? 'calc(210mm - 14mm)' : 'calc(297mm - 14mm)';

  return `
    <div style="font-family: sans-serif; color: #1a1a1a; width: 100%; max-width: ${isLandscape ? '281mm' : '194mm'}; min-height: ${pageH}; margin: 0 auto; display: flex; flex-direction: column; justify-content: space-between;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 3px; margin-bottom: 4px;">
        <div>
          <h2 style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${headerTitle}</h2>
          <span style="font-size: 8px; color: #555; font-style: italic;">
            ${lang === 'fr' ? 'Tout écrire à la main : nom, liaisons (Mc+Me), variations (↳Rp), barres et multip.' : 'Escreva tudo à mão: instrumentos, ligações (Mc+Me), variações (↳Rp), barras e multip.'}
          </span>
        </div>
        <div style="font-size: 9.5px; font-weight: bold; display: flex; gap: 10px;">
          <span>${lblTitle} : _________________________</span>
          <span>♩ = [ ____ ]</span>
          <span>Sign : [ ${signLabel} ]</span>
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
          <thead>
            <tr>
              <th style="font-size: 7.5px; text-transform: uppercase; color: #666; text-align: left; padding: 2px 4px; border: none;">Inst / Var</th>
              <th colspan="${cols}" style="font-size: 7px; color: #888; text-align: center; font-weight: normal; border: none; letter-spacing: 1px;">
                ${lang === 'fr' ? '← GRILLE LIBRE (Repères tous les 4 carreaux • Barres de temps libres) →' : '← GRELHA LIVRE (Marcas a cada 4 casas • Barras de tempo livres) →'}
              </th>
              <th style="font-size: 7.5px; text-transform: uppercase; color: #666; text-align: center; padding: 2px; border: none;">Rep.</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="border: 1.5px solid #1a1a1a; padding: 4px 6px; background: #fff; margin-bottom: 4px; font-size: 9px; display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="text-transform: uppercase; font-size: 8px; width: 120px; flex-shrink: 0;">${lblSeq} :</strong>
            <span style="border-bottom: 1px solid #1a1a1a; flex: 1; height: 12px;"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="text-transform: uppercase; font-size: 8px; width: 120px; flex-shrink: 0;">${lblToada} :</strong>
            <span style="border-bottom: 1px solid #1a1a1a; flex: 1; height: 12px;"></span>
          </div>
        </div>
      </div>

      <div style="border: 1px dashed #777; padding: 3px 6px; font-family: monospace; font-size: 7.5px; color: #555; background: #fafafa; display: flex; justify-content: space-between;">
        <span><strong>${lang === 'fr' ? 'LIAISONS' : 'LIGAÇÕES'} :</strong> Al, Mc+Me, Cx+Tr, Ab+Mi</span>
        <span><strong>${lang === 'fr' ? 'VARIATION :' : 'VARIAÇÃO :'}</strong> ↳Rp, ↳Me/Rp ${lang === 'fr' ? '(vide = copie maître)' : '(vazio = cópia)'}</span>
        <span><strong>${lang === 'fr' ? 'ARRÊT :' : 'FIM :'}</strong> ||</span>
        <span><strong>${lang === 'fr' ? 'COUP SCINDÉ :' : 'TOQUE DUPLO :'}</strong> D/E</span>
      </div>
    </div>
  `;
};
