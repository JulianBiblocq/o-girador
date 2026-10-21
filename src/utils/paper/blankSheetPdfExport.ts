/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Orchestrateur d'impression des fiches vierges Cordel et Légende Complète A4 (< 145 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { renderBlankSheetA, renderBlankSheetB, renderBlankSheetC, renderBlankSheetUniversal } from './blankSheetHtmlTemplates';
import { renderLegendStrokesHTML } from './paperLegendStrokesHtml';
import { renderLegendConductorHTML } from './paperLegendConductorHtml';

export const exportBlankSheetToPdf = (options: BlankSheetOptions, lang: 'fr' | 'pt'): void => {
  let content = '';
  const isLandscape = options.gridMode === 'free_landscape';
  const orientation = isLandscape ? 'landscape' : 'portrait';
  const maxWidth = isLandscape ? '281mm' : '194mm';

  if (options.sheetType === 'isolated') content = renderBlankSheetA(options, lang);
  else if (options.sheetType === 'sections') content = renderBlankSheetB(options, lang);
  else if (options.sheetType === 'sequence') content = renderBlankSheetC(options, lang);
  else content = renderBlankSheetUniversal(options, lang);

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert(lang === 'fr' ? "Autorisez les pop-ups pour imprimer la fiche vierge." : "Autorize pop-ups para imprimir.");
    return;
  }

  const title = lang === 'fr' ? `Atelier Papier - Fiche ${options.sheetType.toUpperCase()}` : `Oficina Papel - Folha ${options.sheetType.toUpperCase()}`;
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title><style>
      @page { size: A4 ${orientation}; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 6px; background: #fff; color: #1a1a1a; font-family: sans-serif; }
      .page-wrapper { width: 100%; max-width: ${maxWidth}; margin: 0 auto; }
      @media print { body { padding: 0; } .no-print { display: none !important; } }
    </style></head><body>
      <div class="no-print" style="margin-bottom: 10px; padding: 6px 12px; background: #fdf6e2; border: 1px solid #d99b26; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <span><strong>O Girador</strong> — ${lang === 'fr' ? 'Aperçu avant impression A4' : 'Visualização A4'} (${orientation})</span>
        <button onclick="window.print()" style="padding: 4px 12px; background: #8b2a1a; color: #fff; border: none; font-weight: bold; cursor: pointer;">
          ${lang === 'fr' ? 'Lancer l\'impression' : 'Imprimir'}
        </button>
      </div>
      <div class="page-wrapper">
        ${content}
      </div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); }, 250);
};

export const printCompletePaperLegend = (lang: 'fr' | 'pt'): void => {
  const isFr = lang === 'fr';
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert(isFr ? "Autorisez les pop-ups pour imprimer la légende complète." : "Autorize pop-ups para a legenda.");
    return;
  }

  const title = isFr ? 'O Girador — Mémo de Référence Complet & Légende A4' : 'O Girador — Guia Completo & Legenda A4';
  const strokesHtml = renderLegendStrokesHTML(lang);
  const conductorHtml = renderLegendConductorHTML(lang);

  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title><style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 8px; background: #fff; color: #1a1a1a; font-family: sans-serif; }
      @media print { body { padding: 0; } .no-print { display: none !important; } }
    </style></head><body>
      <div class="no-print" style="margin-bottom: 10px; padding: 6px 12px; background: #fdf6e2; border: 1.5px solid #8b2a1a; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <span><strong>O Girador</strong> — ${isFr ? 'Légende Complète A4 (Mémo de Référence)' : 'Guia de Referência Completo A4'}</span>
        <button onclick="window.print()" style="padding: 4px 12px; background: #8b2a1a; color: #fff; border: none; font-weight: bold; cursor: pointer;">
          ${isFr ? 'Imprimer la Légende' : 'Imprimir Legenda'}
        </button>
      </div>
      <div style="border: 2px solid #1a1a1a; padding: 10px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8b2a1a; padding-bottom: 4px; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; color: #8b2a1a; letter-spacing: 0.5px;">
              O GIRADOR — ${isFr ? 'MÉMO DE RÉFÉRENCE COMPLET & LÉGENDE' : 'GUIA DE REFERÊNCIA & LEGENDA'}
            </div>
            <div style="font-size: 8.5px; color: #555; font-style: italic;">
              ${isFr ? 'Notation manuscrite pour fiches vierges Cordel et décodage photo' : 'Notação manuscrita para folhas livres Cordel'}
            </div>
          </div>
          <div style="font-size: 9px; font-weight: bold; border: 1.5px solid #1a1a1a; padding: 2px 6px; background: #f4ecd8;">
            A4 PORTRAIT
          </div>
        </div>
        ${strokesHtml}
        <div style="margin-top: 8px;">
          ${conductorHtml}
        </div>
        <div style="margin-top: 8px; text-align: center; font-size: 7.5px; color: #777; border-top: 1px solid #ccc; padding-top: 3px;">
          O Girador • Écosystème Maracatu & Musiques Traditionnelles • 100% Hors-Ligne & Conforme Cordel
        </div>
      </div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); }, 250);
};
