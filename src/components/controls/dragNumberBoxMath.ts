export function formatDragNumberBoxValue(
  val: number,
  label: string,
  displayFormatter?: (val: number) => string,
  min?: number,
  max?: number
): string {
  if (displayFormatter) return displayFormatter(val);
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('thres') || lowerLabel.includes('seuil') || lowerLabel.includes('limiar')) {
    return `${val} dB`;
  }
  if (
    lowerLabel.includes('low') || lowerLabel.includes('mid') || lowerLabel.includes('high') ||
    lowerLabel.includes('grave') || lowerLabel.includes('médium') || lowerLabel.includes('aigu')
  ) {
    return `${val > 0 ? '+' : ''}${val}`;
  }
  if (lowerLabel.includes('ratio')) {
    return `${val}:1`;
  }
  if (min === undefined && max === undefined) {
    return `${val}%`;
  }
  return `${val}`;
}

export function getDragNumberBoxFillStyles(
  val: number,
  actualMin: number,
  range: number,
  mode: 'unipolar' | 'bipolar'
): { left: string; width: string } {
  if (range <= 0) return { left: '0%', width: '0%' };

  if (mode === 'bipolar') {
    const posZero = Math.max(0, Math.min(100, ((0 - actualMin) / range) * 100));
    const posVal = Math.max(0, Math.min(100, ((val - actualMin) / range) * 100));
    if (val >= 0) {
      return {
        left: `${posZero}%`,
        width: `${posVal - posZero}%`,
      };
    } else {
      return {
        left: `${posVal}%`,
        width: `${posZero - posVal}%`,
      };
    }
  } else {
    const pct = Math.max(0, Math.min(100, ((val - actualMin) / range) * 100));
    return {
      left: '0%',
      width: `${pct}%`,
    };
  }
}

export function computeDragNumberStepValue(
  rawVal: number,
  actualMin: number,
  actualMax: number,
  step?: number
): number {
  let newVal = Math.max(actualMin, Math.min(actualMax, rawVal));
  if (step !== undefined) {
    newVal = Math.round(newVal / step) * step;
    const precision = (step.toString().split('.')[1] || '').length;
    newVal = parseFloat(newVal.toFixed(precision));
  } else {
    newVal = Math.round(newVal);
  }
  return newVal;
}
