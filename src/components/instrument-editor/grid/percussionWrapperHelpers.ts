/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { isDarkText } from '../../../data';
import { Pattern } from '../../../types';

export interface StepVisualProps {
  val: any;
  colorStyle: React.CSSProperties;
  splitLeftColor?: string;
  splitRightColor?: string;
  splitLeftText?: string;
  splitRightText?: string;
  totalShift: number | [number, number];
  shiftPx: number;
}

export function computeStepVisualProps(
  pattern: Pattern,
  instrument: { id: string; colors: Record<string, string>; [key: string]: any },
  swingOffsets: Record<number, number>,
  i: number
): StepVisualProps {
  const val = pattern?.activeSteps?.[i];
  let colorStyle: React.CSSProperties = {};
  let splitLeftColor: string | undefined = undefined;
  let splitRightColor: string | undefined = undefined;
  let splitLeftText: string | undefined = undefined;
  let splitRightText: string | undefined = undefined;

  if (Array.isArray(val)) {
    const s0 = String(val[0] ?? '0');
    const s1 = String(val[1] ?? '0');
    const lookup0 = s0 === 'f' && !instrument?.colors?.['f'] ? 'F' : s0 === 'v' && !instrument?.colors?.['v'] ? 'V' : s0;
    const lookup1 = s1 === 'f' && !instrument?.colors?.['f'] ? 'F' : s1 === 'v' && !instrument?.colors?.['v'] ? 'V' : s1;

    splitLeftColor = instrument?.colors?.[lookup0] || '#666';
    splitRightColor = instrument?.colors?.[lookup1] || '#666';
    splitLeftText = isDarkText(instrument?.id, lookup0) ? '#1a1a1a' : instrument?.colors?.text || '#f4ecd8';
    splitRightText = isDarkText(instrument?.id, lookup1) ? '#1a1a1a' : instrument?.colors?.text || '#f4ecd8';
  } else if (val !== 0 && val !== '') {
    const s = String(val);
    const lookup = s === 'f' && !instrument?.colors?.['f'] ? 'F' : s === 'v' && !instrument?.colors?.['v'] ? 'V' : s;
    const bgColor = instrument?.colors?.[lookup] || '#111';
    let txtColor = instrument?.colors?.text || '#f4ecd8';
    if (isDarkText(instrument?.id, lookup)) txtColor = '#1a1a1a';
    colorStyle = { backgroundColor: bgColor, color: txtColor };
  }

  const manualMicro = pattern?.microtimings?.[i] ?? 0;
  const swingOffset = swingOffsets[i] || 0;
  const totalShift: number | [number, number] = Array.isArray(manualMicro)
    ? [Math.max(-100, Math.min(100, manualMicro[0] + swingOffset)), Math.max(-100, Math.min(100, manualMicro[1] + swingOffset))]
    : Math.max(-100, Math.min(100, manualMicro + swingOffset));
  const effectiveShift = Array.isArray(totalShift) ? totalShift[0] : totalShift;
  const shiftPx = (effectiveShift / 100) * 8;

  return { val, colorStyle, splitLeftColor, splitRightColor, splitLeftText, splitRightText, totalShift, shiftPx };
}
