/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Orchestrateur d'impression des fiches vierges Cordel (< 140 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { renderBlankSheetA, renderBlankSheetB, renderBlankSheetC } from './blankSheetHtmlTemplates';

export const exportBlankSheetToPdf = (options: BlankSheetOptions, lang: 'fr' | 'pt'): void => {
  let content = '';
  const isLandscape = options.gridMode === 'free_landscape';
  const orientation = isLandscape ? 'landscape' : 'portrait';

  if (options.sheetType === 'isolated') {
    content = renderBlankSheetA(options, lang);
  } else if (options.sheetType === 'sections') {
    content = renderBlankSheetB(options, lang);
  } else {
    content = renderBlankSheetC(options, lang);
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert(
      lang === 'fr'
        ? "Veuillez autoriser les fenêtres pop-up pour imprimer la fiche vierge."
        : "Por favor, autorize pop-ups para imprimir a folha em branco."
    );
    return;
  }

  const title = lang === 'fr' ? `Atelier Papier - Fiche ${options.sheetType.toUpperCase()}` : `Oficina Papel - Folha ${options.sheetType.toUpperCase()}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 10px;
            background: #ffffff;
            color: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          table {
            border-spacing: 0;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 12px; padding: 8px 12px; background: #fdf6e2; border: 1px solid #d99b26; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <span><strong>O Girador</strong> — ${lang === 'fr' ? 'Aperçu avant impression A4' : 'Visualização prévia A4'} (${orientation})</span>
          <button onclick="window.print()" style="padding: 4px 12px; background: #8b2a1a; color: #fff; border: none; font-weight: bold; cursor: pointer;">
            🖨️ ${lang === 'fr' ? 'Lancer l\'impression' : 'Imprimir'}
          </button>
        </div>
        ${content}
      </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
};
