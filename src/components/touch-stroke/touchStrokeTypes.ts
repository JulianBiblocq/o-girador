/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TouchSelectorState {
  patternId: number;
  stepIdx: number;
  instId: string;
  x: number;
  y: number;
  currentVal: string | number | [string, string];
  onSelect: (val: string | [string, string], merge?: boolean) => void;
  isStickyDefault?: boolean;
  trackId: number;
  isSplit?: boolean;
}

export interface TouchStrokeSelectorProps {
  selector: TouchSelectorState;
  hoveredStroke: string | null;
  setHoveredStroke: (val: string | null) => void;
  onClose: () => void;
}
