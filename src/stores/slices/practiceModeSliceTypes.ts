/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PracticeModeSlice {
  isPracticeMode: boolean;
  setIsPracticeMode: (val: boolean) => void;
  togglePracticeMode: () => void;
}
