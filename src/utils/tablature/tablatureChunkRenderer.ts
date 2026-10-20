import { TrackGroup, SongSection } from '../../types';
import { instrumentsConfig } from '../../data';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { formatStepsRow } from './tablatureStepFormatter';

const getInstrumentLabel = (instId: string, isFirstBlock: boolean, track?: TrackGroup) => {
  const customLabel = track?.customName || useNomenclatureStore.getState().getInstrumentLabel(track || instId);
  if (isFirstBlock || customLabel.length <= 4) return customLabel;
  return customLabel.substring(0, 3);
};

export function renderTablatureChunk(
  currentChunk: number[],
  filteredTracks: TrackGroup[],
  songSections: SongSection[],
  measureTimeSigs?: { [m: number]: string },
  measureBpms?: { [m: number]: number },
  isHtml: boolean = false
): string {
  if (currentChunk.length === 0) return '';
  const startM = currentChunk[0];
  const endM = currentChunk[currentChunk.length - 1];
  const sectionStart = songSections.find(s => s.startMeasure === startM);

  const leftBar = "| ";
  const rightBar = " |";
  const lang = useSequencerStore.getState().lang || 'fr';

  let header = "";
  if (sectionStart) header = `[ ${sectionStart.name} ]`;
  else if (currentChunk.length === 1) header = lang === 'fr' ? `--- Mesure ${startM + 1} ---` : `--- Compasso ${startM + 1} ---`;
  else header = lang === 'fr' ? `--- Mesures ${startM + 1} à ${endM + 1} ---` : `--- Compassos ${startM + 1} a ${endM + 1} ---`;

  let chunkOutput = header + "\n";
  const isFirstBlock = startM === 0;
  const initialSig = measureTimeSigs?.[startM] || '4/4';
  const prefixLen = 15 + 1 + 4 + 1;

  let bpmLine = "".padStart(prefixLen + leftBar.length, " ");
  currentChunk.forEach((m, idx) => {
    const prevBpm = m === 0 ? null : measureBpms?.[m - 1] || 120;
    const currBpm = measureBpms?.[m] || 120;
    let bpmStr = "";
    if (m === 0 || currBpm !== prevBpm) {
      if (prevBpm !== null && currBpm > prevBpm) bpmStr = `${currBpm}BPM↑`;
      else if (prevBpm !== null && currBpm < prevBpm) bpmStr = `${currBpm}BPM↓`;
      else bpmStr = `${currBpm}BPM`;
    }
    bpmLine += bpmStr.padEnd(31, " ");
    if (idx < currentChunk.length - 1) {
      const nextM = currentChunk[idx + 1];
      const currSig = measureTimeSigs?.[m] || '4/4';
      const nextSig = measureTimeSigs?.[nextM] || '4/4';
      bpmLine += currSig !== nextSig ? " ".repeat(` | ${nextSig} | `.length) : "   ";
    }
  });

  if (bpmLine.trim().length > 0) chunkOutput += bpmLine + "\n";

  filteredTracks.forEach(track => {
    let trackStr = "";
    let hasDataInChunk = false;
    let hasVariationsInChunk = false;

    currentChunk.forEach((m, idx) => {
      const activePattern = track.patterns.find(p => p.measureAssignments[m]);
      if (activePattern) {
        hasDataInChunk = true;
        if ((activePattern.measureAllowVariations?.[m] ?? true) && activePattern.variations && activePattern.variations.length > 0) {
          hasVariationsInChunk = true;
        }
        let measureHtml = formatStepsRow(activePattern.activeSteps, activePattern.steps, isHtml);
        const visualLen = activePattern.steps * 2 - 1;
        measureHtml += " ".repeat(Math.max(0, 31 - visualLen));
        trackStr += measureHtml;
      } else {
        trackStr += "".padEnd(31, ' ');
      }

      if (idx < currentChunk.length - 1) {
        const nextM = currentChunk[idx + 1];
        const currSig = measureTimeSigs?.[m] || '4/4';
        const nextSig = measureTimeSigs?.[nextM] || '4/4';
        trackStr += currSig !== nextSig ? ` | ${nextSig} | ` : " | ";
      }
    });

    if (hasDataInChunk) {
      const conf = instrumentsConfig[track.instrumentIdx];
      const instLabel = getInstrumentLabel(conf.id, isFirstBlock, track);
      const varMarker = hasVariationsInChunk ? (isHtml ? ' 🎲' : ' (*v)') : '';
      const safeInstLabel = (instLabel + varMarker).substring(0, 15).padEnd(15, ' ');
      const safeSig = initialSig.padStart(4, ' ');
      chunkOutput += `${safeInstLabel} ${safeSig} ${leftBar}${trackStr}${rightBar}\n`;
    }
  });

  chunkOutput += '\n';
  return isHtml ? `<div class="tab-chunk">${chunkOutput}</div>` : chunkOutput;
}
