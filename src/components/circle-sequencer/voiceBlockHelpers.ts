
import { isVoiceHoldSyllable } from '../../utils/musicTheory';
import type { VoiceStepData } from './voiceStepExtraction';

export interface VoiceBlock {
  startIndex: number;
  endIndex: number;
  isAnacrusis: boolean;
}

export function buildVoiceBlocks(
  steps: VoiceStepData[],
  effectiveStepCount: number
): VoiceBlock[] {
  const blocks: VoiceBlock[] = [];
  const visited = new Set<number>();

  for (let i = 0; i < effectiveStepCount; i++) {
    if (visited.has(i)) continue;
    if (steps[i].active) {
      const isAnac = Boolean(steps[i].isAnacrusis);
      let endIdx = i;
      let nextIdx = i + 1;
      while (
        nextIdx < effectiveStepCount &&
        steps[nextIdx].active &&
        steps[nextIdx].isProlongation &&
        isAnac === Boolean(steps[nextIdx].isAnacrusis)
      ) {
        endIdx = nextIdx;
        visited.add(nextIdx);
        nextIdx++;
      }
      blocks.push({ startIndex: i, endIndex: endIdx, isAnacrusis: isAnac });
    }
  }

  // Raccord de boucle 15 -> 0 uniquement si le pas 0 est une prolongation explicite du pas 15
  if (
    blocks.length > 1 &&
    blocks[0].startIndex === 0 &&
    blocks[blocks.length - 1].endIndex === effectiveStepCount - 1
  ) {
    const step0 = steps[0];
    const stepLast = steps[effectiveStepCount - 1];
    if (
      step0.active &&
      stepLast.active &&
      step0.isProlongation &&
      isVoiceHoldSyllable(step0.syl) &&
      (step0.note !== '' && stepLast.note !== '' ? step0.note === stepLast.note : true)
    ) {
      blocks[blocks.length - 1].endIndex = effectiveStepCount - 1 + blocks[0].endIndex + 1;
      blocks.shift();
    }
  }

  return blocks;
}
