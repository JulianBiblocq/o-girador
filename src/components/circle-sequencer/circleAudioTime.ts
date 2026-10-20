/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { audioEngine } from '../../hooks/useAudioSync';
import { getTone } from '../../ToneLoader';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export const getAudioTime = (): number => {
  if (audioEngine && typeof audioEngine.getCurrentTime === 'function') {
    return audioEngine.getCurrentTime();
  }
  const toneInst = safeGetTone();
  if (toneInst && toneInst.context) {
    return (toneInst.context.rawContext as AudioContext).currentTime;
  }
  return 0;
};
