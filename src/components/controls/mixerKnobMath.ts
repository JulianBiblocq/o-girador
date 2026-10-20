export function getKnobAngle(val: number, min: number, max: number): number {
  const ratio = (val - min) / (max - min);
  return -135 + ratio * 270;
}

export function formatKnobValue(val: number, unit = '', decimals?: number): string {
  if (unit === 'Hz') {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1).replace('.0', '')}k`;
    }
    return `${Math.round(val)}`;
  }
  if (unit === 'dB') {
    if (decimals !== undefined && decimals > 0) {
      const fixed = Math.abs(val).toFixed(decimals);
      if (val > 0) return `+${fixed} dB`;
      if (val < 0) return `-${fixed} dB`;
      return `0.0 dB`;
    }
    const rounded = Math.round(val);
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  }
  return `${Math.round(val)}${unit}`;
}

export function quantizeKnobValue(
  rawVal: number,
  min: number,
  max: number,
  step = 1,
  defaultValue = 0,
  unit = ''
): number {
  let val = Math.min(max, Math.max(min, rawVal));
  if (step) {
    val = Math.round(val / step) * step;
  }
  const snapThreshold = step ? step * 0.75 : 0.8;
  const targetZero = defaultValue !== undefined ? defaultValue : 0;
  if (unit === 'dB' && Math.abs(val - targetZero) < snapThreshold) {
    val = targetZero;
  }
  return val;
}
