/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Orchestrateur d'impression des fiches vierges Cordel et Légende Complète A4 (< 145 lignes).
 */
import { BlankSheetOptions } from '../../types/paperWorkshop.types';
import { renderBlankSheetA, renderBlankSheetB, renderBlankSheetC, renderBlankSheetUniversal, renderBlankSheetDictionary } from './blankSheetHtmlTemplates';
import { renderLegendStrokesHTML } from './paperLegendStrokesHtml';
import { renderLegendConductorHTML } from './paperLegendConductorHtml';
import { printViaInvisibleIframe } from '../print/printIframeHelper';

export const exportBlankSheetToPdf = (options: BlankSheetOptions, lang: 'fr' | 'pt'): void => {
  let content = '';
  const isLandscape = options.gridMode === 'free_landscape';
  const orientation = isLandscape ? 'landscape' : 'portrait';
  const maxWidth = isLandscape ? '281mm' : '194mm';

  if (options.sheetType === 'isolated') content = renderBlankSheetA(options, lang);
  else if (options.sheetType === 'sections') content = renderBlankSheetB(options, lang);
  else if (options.sheetType === 'sequence') content = renderBlankSheetC(options, lang);
  else if ((options.sheetType as any) === 'dictionary') content = renderBlankSheetDictionary(options, lang);
  else content = renderBlankSheetUniversal(options, lang);

  const pageHeight = isLandscape ? 'calc(210mm - 16mm)' : 'calc(297mm - 16mm)';
  const title = lang === 'fr' ? `Atelier Papier - Fiche ${options.sheetType.toUpperCase()}` : `Oficina Papel - Folha ${options.sheetType.toUpperCase()}`;
  const fullHtml = `
    <!DOCTYPE html><html><head><title>${title}</title><style>
      @page { size: A4 ${orientation}; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html, body { margin: 0; padding: 0; background: #fff; color: #1a1a1a; font-family: sans-serif; }
      .page-wrapper { width: 100%; max-width: ${maxWidth}; margin: 0 auto; padding: 4px; }
      .sheet-page {
        width: 100%;
        max-width: ${maxWidth};
        height: ${pageHeight};
        max-height: ${pageHeight};
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        page-break-after: avoid;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; }
        .no-print { display: none !important; }
        .page-wrapper { padding: 0 !important; margin: 0 !important; }
        .sheet-page { page-break-after: avoid !important; break-inside: avoid !important; }
      }
    </style></head><body>
      <div class="page-wrapper">
        ${content}
      </div>
    </body></html>
  `;
  printViaInvisibleIframe(fullHtml, title);
};

export const printCompletePaperLegend = (lang: 'fr' | 'pt'): void => {
  const isFr = lang === 'fr';
  const title = isFr ? 'O Girador — Mémo de Référence Complet & Légende A4' : 'O Girador — Guia Completo & Legenda A4';
  const strokesHtml = renderLegendStrokesHTML(lang);
  const conductorHtml = renderLegendConductorHTML(lang);

  const fullHtml = `
    <!DOCTYPE html><html><head><title>${title}</title><style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; padding: 8px; background: #fff; color: #1a1a1a; font-family: sans-serif; }
      @media print { body { padding: 0; } .no-print { display: none !important; } }
    </style></head><body>
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
  `;
  printViaInvisibleIframe(fullHtml, title);
};
