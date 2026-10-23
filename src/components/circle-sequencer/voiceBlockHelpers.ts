
import { isVoiceHoldSyllable } from '../../utils/musicTheory';
import { VoiceStepData } from './voiceStepExtraction';

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
  let curBlock: VoiceBlock | null = null;

  for (let i = 0; i < effectiveStepCount; i++) {
    if (steps[i].active) {
      if (steps[i].isProlongation && curBlock) {
        curBlock.endIndex = i;
      } else {
        if (curBlock) blocks.push(curBlock);
        curBlock = { startIndex: i, endIndex: i, isAnacrusis: steps[i].isAnacrusis };
      }
    } else {
      if (curBlock) {
        blocks.push(curBlock);
        curBlock = null;
      }
    }
  }
  if (curBlock) blocks.push(curBlock);

  // Raccord de boucle 15 -> 0
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
      isVoiceHoldSyllable(step0.syl) &&
      (step0.note !== '' && stepLast.note !== '' ? step0.note === stepLast.note : true)
    ) {
      blocks[blocks.length - 1].endIndex = effectiveStepCount - 1 + blocks[0].endIndex + 1;
      blocks.shift();
    }
  }

  return blocks;
}
