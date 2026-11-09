import { safeSuspendAudioContext } from '../../../audio/audioContextSuspendManager';

export function printRodaSheetA4(songTitle: string, density: 8 | 12): void {
  try {
    safeSuspendAudioContext();
  } catch (_) {}

  const root = document.getElementById('roda-sheet-print-root');
  if (!root) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (!frameDoc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    return;
  }

  const cols = density === 12 ? 3 : 2;
  const maxSvgH = density === 12 ? '54mm' : '58mm';

  frameDoc.open();
  frameDoc.write(`<!DOCTYPE html><html><head><title>${songTitle} - Planche de Rodas A4</title><style>
    @page { size: A4 portrait; margin: 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #ffffff !important; color: #1a1a1a !important; margin: 0; padding: 0; font-family: sans-serif; }
    .roda-a4-page {
      width: 100%;
      background: #ffffff !important;
      border: 1.5px solid #1a1a1a;
      padding: 3.5mm;
      margin-bottom: 4mm;
      page-break-after: always;
      break-after: page;
    }
    .roda-a4-page:last-child { page-break-after: auto; break-after: auto; margin-bottom: 0; }
    .border-b-2 { border-bottom: 1.5px solid #1a1a1a; padding-bottom: 2mm; margin-bottom: 2.5mm; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .items-baseline { align-items: baseline; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .inline-flex { display: inline-flex; }
    .inline-block { display: inline-block; }
    .gap-1 { gap: 3px; }
    .gap-1\\.5 { gap: 5px; }
    .gap-2 { gap: 7px; }
    .gap-x-2\\.5 { column-gap: 9px; }
    .gap-y-1 { row-gap: 3px; }
    .w-2\\.5 { width: 9px; height: 9px; border-radius: 999px; }
    .font-black, .font-bold { font-weight: 800; }
    .uppercase { text-transform: uppercase; }
    .text-base { font-size: 13pt; }
    .text-\\[11px\\] { font-size: 8.5pt; }
    .text-\\[10px\\], .text-\\[9px\\] { font-size: 7.5pt; }
    .grid {
      display: grid !important;
      grid-template-columns: repeat(${cols}, minmax(0, 1fr)) !important;
      gap: 2.5mm !important;
    }
    .grid > div {
      background: #ffffff !important;
      border: 1.2px solid #1a1a1a !important;
      padding: 1mm !important;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    svg { width: 100%; height: auto; max-height: ${maxSvgH}; display: block; background: #ffffff !important; }
    .mt-2 { margin-top: 2mm; padding-top: 1mm; border-top: 1px solid #d6d3d1; }
  </style></head><body>${root.innerHTML}</body></html>`);
  frameDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[printRodaSheetA4] Print error:', err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1000);
    }
  }, 250);
}

