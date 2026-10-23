/**
 * Gabarit HTML Fiche Millimétrée A4 Paysage : Grille 32x25 (14mm + 32x8mm) (< 125 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from './paperNomenclatureHelper';

export const renderBlankSheetGrid32x25 = (options: BlankSheetOptions, lang: 'fr' | 'pt'): string => {
  const isPrefill = options.grid32Mode === 'prefill';
  const selectedPupitres = (options.pupitres && options.pupitres.length > 0)
    ? options.pupitres
    : ['al', 'cx', 'gg', 'ab', 'mi'];

  // Construction des 25 lignes
  const rowsData: string[] = [];
  if (!isPrefill) {
    for (let r = 0; r < 25; r++) rowsData.push('');
  } else {
    let pIdx = 0;
    while (rowsData.length < 25) {
      if (pIdx < selectedPupitres.length) {
        rowsData.push(resolvePupitreAbbr(selectedPupitres[pIdx]));
        pIdx++;
      } else {
        rowsData.push(''); // Ligne vide séparatrice entre deux blocs
        pIdx = 0;
      }
    }
  }

  // Micro-en-tête (height: 3.8mm) : Titre à gauche (14mm) + Colonnes 1 à 32 (8mm)
  const headerCells = Array.from({ length: 32 }, (_, i) => {
    const num = i + 1;
    const isStep4 = num % 4 === 0 && num < 32;
    return `
      <th style="width: 8mm; min-width: 8mm; max-width: 8mm; height: 3.8mm; padding: 0; font-size: 5.5pt; font-family: monospace; font-weight: bold; color: #666; text-align: center; border: 0.25mm solid #7a7060; border-top: none; ${isStep4 ? 'position: relative;' : ''}">
        ${num}
      </th>
    `;
  }).join('');

  // 25 Lignes physiques (7.8mm de haut)
  const rowsHtml = rowsData.slice(0, 25).map((pupitreLabel) => {
    const stepCells = Array.from({ length: 32 }, (_, i) => {
      const isStep4 = (i + 1) % 4 === 0 && i < 31;
      return `
        <td style="width: 8mm; min-width: 8mm; max-width: 8mm; height: 7.8mm; padding: 0; border: 0.25mm solid #7a7060; background: #fff; position: relative;">
          ${isStep4 ? '<div style="position: absolute; right: -1.2px; top: -1.2px; width: 2.2px; height: 2.2px; background: #7a7060; border-radius: 50%; pointer-events: none;"></div>' : ''}
        </td>
      `;
    }).join('');

    return `
      <tr style="height: 7.8mm;">
        <td style="width: 14mm; min-width: 14mm; max-width: 14mm; height: 7.8mm; padding: 0 1mm; font-family: sans-serif; font-size: 7pt; font-weight: bold; text-align: center; vertical-align: middle; border: 0.25mm solid #7a7060; background: ${pupitreLabel ? '#f3eee2' : '#ffffff'}; color: #1a1a1a;">
          ${pupitreLabel}
        </td>
        ${stepCells}
      </tr>
    `;
  }).join('');

  const titlePlaceholder = lang === 'fr' ? 'TITRE :' : 'TÍTULO :';

  return `
    <div class="sheet-page-grid32" style="width: 270mm; max-width: 270mm; height: 198.8mm; max-height: 198.8mm; box-sizing: border-box; margin: 0 auto; background: #fff; page-break-after: avoid; break-inside: avoid;">
      <table style="width: 270mm; border-collapse: collapse; table-layout: fixed; margin: 0; padding: 0;">
        <thead>
          <tr style="height: 3.8mm;">
            <th style="width: 14mm; min-width: 14mm; max-width: 14mm; height: 3.8mm; padding: 0 1mm; font-size: 5.5pt; font-family: sans-serif; font-weight: bold; color: #444; text-align: left; border: 0.25mm solid #7a7060; border-top: none; vertical-align: middle; white-space: nowrap; overflow: hidden;">
              ${titlePlaceholder}
            </th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
};
