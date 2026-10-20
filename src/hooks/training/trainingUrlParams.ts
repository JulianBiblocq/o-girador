/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function cleanTrainingUrlParams(): void {
  if (typeof window === 'undefined') return;
  const cleanUrl = new URL(window.location.href);
  const keysToRemove = [
    'trainingId', 'presetId', 'loadPreset', 'stage', 'stageIndex',
    'tocarJunto', 'train', 'role', 'targetTrack', 'baseOnly'
  ];
  let changed = false;
  keysToRemove.forEach((key) => {
    if (cleanUrl.searchParams.has(key)) {
      cleanUrl.searchParams.delete(key);
      changed = true;
    }
  });
  if (changed) window.history.replaceState({}, document.title, cleanUrl.toString());
}
