/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';

export function playGridStepPreview(
  trackId: number,
  pattern: Pattern,
  strokeVal: any,
  idx: number,
  subIndex?: 0 | 1
) {
  if (strokeVal === 0 || strokeVal === '0' || strokeVal === '' || strokeVal === undefined) return;
  try {
    if (audioEngine) {
      const rawVol = pattern?.volumes?.[idx];
      const rawDec = pattern?.decays?.[idx];
      const subIdx = subIndex ?? 0;
      const vol = (getSculptNumber(Array.isArray(rawVol) ? rawVol[subIdx] : rawVol, 100)) / 100;
      const dec = (getSculptNumber(Array.isArray(rawDec) ? rawDec[subIdx] : rawDec, 100)) / 100;
      audioEngine.playNote(trackId, String(strokeVal), Tone.now(), vol, dec);
    }
  } catch (_) {}
}
