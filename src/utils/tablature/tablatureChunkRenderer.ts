import { TrackGroup, SongSection } from '../../types';
import { instrumentsConfig } from '../../data';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { formatStepsRow } from './tablatureStepFormatter';

export function getMeasureStepsFromSig(sig: string = '4/4'): number {
  if (sig === '2/4') return 8;
  if (sig === '3/4' || sig === '6/8') return 12;
  if (sig === '5/4') return 20;
  if (sig === '7/8') return 14;
  if (sig === '9/8') return 18;
  if (sig === '12/8') return 24;
  return 16;
}

export function getMeasureCharWidth(
  measureIdx: number,
  measureTimeSigs?: { [m: number]: string }
): number {
  const sig = measureTimeSigs?.[measureIdx] || '4/4';
  const steps = getMeasureStepsFromSig(sig);
  return Math.max(15, steps * 2 - 1);
}

const getInstrumentLabel = (instId: string, isFirstBlock: boolean, track?: TrackGroup) => {
  const customLabel = track?.customName || useNomenclatureStore.getState().getInstrumentLabel(track || instId);
  if (isFirstBlock || customLabel.length <= 4) return customLabel;
  return customLabel.substring(0, 3);
};

function buildBeatRuler(steps: number, width: number): string {
  const chars: string[] = [];
  for (let s = 0; s < steps; s++) {
    chars.push(s % 4 === 0 ? String(Math.floor(s / 4) + 1) : '.');
  }
  return chars.join(' ').padEnd(width, ' ');
}

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
  const leftBar = '|| ';
  const rightBar = ' ||';
  const lang = useSequencerStore.getState().lang || 'fr';
  const isFirstBlock = startM === 0;
  const initialSig = measureTimeSigs?.[startM] || '4/4';
  const prefixLen = 12 + 1 + 3 + 1;

  let headerLine = ''.padStart(prefixLen + leftBar.length, ' ');
  let rulerLine = `${(lang === 'fr' ? 'TEMPS' : 'TEMPOS').padEnd(12, ' ')} ${' '.repeat(3)} ${leftBar}`;

  currentChunk.forEach((m, idx) => {
    const colWidth = getMeasureCharWidth(m, measureTimeSigs);
    const currSig = measureTimeSigs?.[m] || '4/4';
    const steps = getMeasureStepsFromSig(currSig);
    const secStart = songSections.find((s) => s.startMeasure === m);
    const prevBpm = m === 0 ? null : measureBpms?.[m - 1] ?? 120;
    const currBpm = measureBpms?.[m] ?? 120;

    let bpmTag = '';
    if (m === 0 || currBpm !== prevBpm) {
      const arrow = prevBpm !== null ? (currBpm > prevBpm ? '↑' : currBpm < prevBpm ? '↓' : '') : '';
      bpmTag = ` ${currBpm}BPM${arrow}`;
    }
    const secTag = secStart ? ` ${secStart.name}` : '';
    const rawHeader = `[M.${m + 1}${secTag}${bpmTag}]`;
    headerLine += rawHeader.substring(0, colWidth).padEnd(colWidth, ' ');
    rulerLine += buildBeatRuler(steps, colWidth);

    if (idx < currentChunk.length - 1) {
      const nextM = currentChunk[idx + 1];
      const nextSig = measureTimeSigs?.[nextM] || '4/4';
      const sep = currSig !== nextSig ? ` || ${nextSig} || ` : ' || ';
      headerLine += ' '.repeat(sep.length);
      rulerLine += sep;
    }
  });

  let chunkOutput = `${headerLine}\n${rulerLine}${rightBar}\n`;

  filteredTracks.forEach((track) => {
    let trackStr = '';
    let hasDataInChunk = false;
    let hasVariationsInChunk = false;

    currentChunk.forEach((m, idx) => {
      const colWidth = getMeasureCharWidth(m, measureTimeSigs);
      const currSig = measureTimeSigs?.[m] || '4/4';
      const effectiveSteps = getMeasureStepsFromSig(currSig);
      const activePattern = track.patterns.find((p) => p.measureAssignments[m]);

      if (activePattern) {
        hasDataInChunk = true;
        if ((activePattern.measureAllowVariations?.[m] ?? true) && activePattern.variations && activePattern.variations.length > 0) {
          hasVariationsInChunk = true;
        }
        const stepsToRender = Math.min(activePattern.steps, effectiveSteps);
        let measureHtml = formatStepsRow(activePattern.activeSteps, stepsToRender, isHtml);
        const visualLen = stepsToRender * 2 - 1;
        measureHtml += ' '.repeat(Math.max(0, colWidth - visualLen));
        trackStr += measureHtml;
      } else {
        trackStr += ''.padEnd(colWidth, ' ');
      }

      if (idx < currentChunk.length - 1) {
        const nextM = currentChunk[idx + 1];
        const nextSig = measureTimeSigs?.[nextM] || '4/4';
        trackStr += currSig !== nextSig ? ` || ${nextSig} || ` : ' || ';
      }
    });

    if (hasDataInChunk) {
      const conf = instrumentsConfig[track.instrumentIdx];
      const instLabel = getInstrumentLabel(conf.id, isFirstBlock, track);
      const varMarker = hasVariationsInChunk ? (isHtml ? ' ' : ' (*v)') : '';
      const safeInstLabel = (instLabel + varMarker).substring(0, 12).padEnd(12, ' ');
      const safeSig = initialSig.padStart(3, ' ');
      chunkOutput += `${safeInstLabel} ${safeSig} ${leftBar}${trackStr}${rightBar}\n`;
    }
  });

  chunkOutput += '\n';
  return isHtml ? `<div class="tab-chunk">${chunkOutput}</div>` : chunkOutput;
}
