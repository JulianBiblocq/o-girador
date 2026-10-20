import { TrackGroup, SongSection, PresetMetadata } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { generateTablatureCore } from './tablatureCore';
import { generateAnnexTablature } from './tablatureAnnex';

export const exportTablatureFile = (
  tracks: TrackGroup[] | string,
  annexTrackIds: Set<number>,
  totalMeasures?: number,
  songSections?: SongSection[],
  metadata?: PresetMetadata,
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  letras?: string
) => {
  const lang = useSequencerStore.getState().lang || 'fr';
  const defaultTitle = lang === 'fr' ? "Partition O Girador" : "Partitura O Girador";
  const title = metadata?.toada?.trim() || defaultTitle;
  let finalTxt = "";

  if (typeof tracks === 'string') {
    finalTxt = tracks;
  } else {
    const outputTxt = generateTablatureCore(tracks, totalMeasures || 0, songSections || [], measureTimeSigs, measureBpms, false);
    const annexTxt = generateAnnexTablature(tracks, annexTrackIds, false);
    finalTxt = `${lang === 'fr' ? 'TITRE' : 'TÍTULO'}: ${title}\n`;
    if (metadata?.compositor) finalTxt += `${lang === 'fr' ? 'COMPOSITEUR' : 'COMPOSITOR'}: ${metadata.compositor}\n`;
    if (metadata?.ritmo) finalTxt += `${lang === 'fr' ? 'RYTHME' : 'RITMO'}: ${metadata.ritmo}\n`;
    finalTxt += `\n${outputTxt}`;
    if (annexTxt) finalTxt += annexTxt;
    if (letras && letras.trim() !== '') {
      finalTxt += lang === 'fr' ? `\n--- VOIX / PAROLES ---\n${letras}\n` : `\n--- VOZES / LETRAS ---\n${letras}\n`;
    }
    finalTxt += lang === 'fr' ? `\n(Généré avec O Girador)\n` : `\n(Gerado com O Girador)\n`;
  }

  const blob = new Blob([finalTxt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printTablature = (
  tracks: TrackGroup[] | string,
  annexTrackIds: Set<number>,
  totalMeasures?: number,
  songSections?: SongSection[],
  metadata?: PresetMetadata,
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  letras?: string,
  fontSize?: number
) => {
  const lang = useSequencerStore.getState().lang || 'fr';
  const defaultTitle = lang === 'fr' ? "Partition O Girador" : "Partitura O Girador";
  const title = metadata?.toada?.trim() || defaultTitle;
  const composer = metadata?.compositor ? `${lang === 'fr' ? 'Compositeur' : 'Compositor'} : ${metadata.compositor}` : "";
  let innerContent = "";

  if (typeof tracks === 'string') {
    innerContent = `<div class="tab-title">${title}</div>${composer ? `<div class="tab-subtitle">${composer}</div>` : ''}<div class="tab-pre">${tracks}</div>`;
  } else {
    const outputHtml = generateTablatureCore(tracks, totalMeasures || 0, songSections || [], measureTimeSigs, measureBpms, true);
    const annexHtml = generateAnnexTablature(tracks, annexTrackIds, true);
    innerContent = `<div class="tab-title">${title}</div>${composer ? `<div class="tab-subtitle">${composer}</div>` : ''}<div class="tab-pre">${outputHtml}</div>`;
    if (letras && letras.trim() !== '') {
      innerContent += `<div class="tab-letras"><h3>${lang === 'fr' ? 'Voix / Paroles' : 'Vozes / Letras'}</h3><div>${letras}</div></div>`;
    }
    if (annexHtml) innerContent += `<div class="tab-pre">${annexHtml}</div>`;
  }

  innerContent += `<div class="tab-footer">${lang === 'fr' ? 'Généré avec O Girador' : 'Gerado com O Girador'}</div>`;
  const printContainer = document.createElement('div');
  printContainer.id = 'print-tablature-area';
  const styleBlock = document.createElement('style');
  styleBlock.textContent = `
    @media print {
      @page { size: landscape; margin: 0; }
      body { background: white; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      #print-tablature-area { position: absolute; top: 0; left: 0; right: 0; background: white; z-index: 999999; }
      table.print-table { width: 100%; border-collapse: collapse; border: none; }
      table.print-table th, table.print-table td { border: none; padding: 0; }
      .print-header-space { height: 5mm; }
      .tab-title { font-family: 'Cactus', serif; font-size: 18px; text-align: center; margin-bottom: 5px; }
      .tab-subtitle { font-family: sans-serif; font-size: 12px; text-align: center; margin-bottom: 20px; font-style: italic; }
      .tab-pre { white-space: pre; font-family: monospace; font-size: ${fontSize || 13}px !important; line-height: 1.3; }
      .tab-chunk { page-break-inside: avoid; break-inside: avoid; margin-bottom: 0.5em; }
      .tab-footer { text-align: right; font-family: sans-serif; font-size: 10px; margin-top: 30px; color: #555; }
      .tab-letras { margin-top: 40px; font-family: sans-serif; font-size: 12px; white-space: pre-wrap; }
      .tab-letras h3 { margin-bottom: 10px; font-size: 14px; }
    }
  `;
  document.head.appendChild(styleBlock);
  printContainer.innerHTML = `<table class="print-table"><thead><tr><td><div class="print-header-space"></div></td></tr></thead><tbody><tr><td>${innerContent}</td></tr></tbody><tfoot><tr><td><div class="print-footer-space"></div></td></tr></tfoot></table>`;
  document.body.appendChild(printContainer);
  window.print();
  document.body.removeChild(printContainer);
  document.head.removeChild(styleBlock);
};
