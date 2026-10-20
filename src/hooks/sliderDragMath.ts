export interface SliderMathOptions {
  direction?: 'horizontal' | 'vertical';
  min?: number;
  max?: number;
  step?: number;
  invertVertical?: boolean;
}

export function calculateSliderValueFromCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect | null,
  options: SliderMathOptions
): number {
  const {
    direction = 'horizontal',
    min = 0,
    max = 100,
    step = 1,
    invertVertical = true,
  } = options;

  if (!rect) return min;

  let ratio = 0;
  if (direction === 'horizontal') {
    const relativeX = clientX - rect.left;
    ratio = rect.width > 0 ? relativeX / rect.width : 0;
  } else {
    const relativeY = clientY - rect.top;
    ratio = rect.height > 0 ? relativeY / rect.height : 0;
    if (invertVertical) {
      ratio = 1 - ratio;
    }
  }

  ratio = Math.min(1, Math.max(0, ratio));

  let val = min + ratio * (max - min);

  // Snap to step
  if (step > 0) {
    const steps = Math.round((val - min) / step);
    val = min + steps * step;
  }

  return Math.min(max, Math.max(min, val));
}
