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

import { safeSuspendAudioContext } from '../../audio/audioContextSuspendManager';

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
  try { safeSuspendAudioContext(); } catch (_) {}
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

  frameDoc.open();
  frameDoc.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    @page { size: landscape; margin: 4mm; }
    body { background: white; color: black; margin: 0; padding: 10px; font-family: monospace; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .tab-title { font-family: serif; font-size: 18px; text-align: center; margin-bottom: 5px; }
    .tab-subtitle { font-family: sans-serif; font-size: 12px; text-align: center; margin-bottom: 16px; font-style: italic; }
    .tab-pre { white-space: pre; font-family: monospace; font-size: ${fontSize || 12}px !important; line-height: 1.3; }
    .tab-chunk { page-break-inside: avoid; break-inside: avoid; margin-bottom: 0.5em; }
    .tab-footer { text-align: right; font-family: sans-serif; font-size: 10px; margin-top: 20px; color: #555; }
    .tab-letras { margin-top: 25px; font-family: sans-serif; font-size: 12px; white-space: pre-wrap; }
    .tab-letras h3 { margin-bottom: 8px; font-size: 14px; }
  </style></head><body>${innerContent}</body></html>`);
  frameDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[printTablature] Print error:', err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1000);
    }
  }, 250);
};
