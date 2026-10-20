export function readMeterDb(meterNode: any): number {
  if (!meterNode || typeof meterNode.getValue !== 'function') return -80;
  try {
    const data = meterNode.getValue();
    if (data instanceof Float32Array) {
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
      return peak > 0.00001 ? 20 * Math.log10(peak) : -80;
    }
    if (Array.isArray(data) && data[0] instanceof Float32Array) {
      let peak = 0;
      for (let c = 0; c < data.length; c++) {
        const channelData = data[c];
        for (let i = 0; i < channelData.length; i++) {
          const abs = Math.abs(channelData[i]);
          if (abs > peak) peak = abs;
        }
      }
      return peak > 0.00001 ? 20 * Math.log10(peak) : -80;
    }
    if (typeof data === 'number') {
      return data;
    }
  } catch (e) {
    console.error('Error reading track meter value:', e);
  }
  return -80;
}

export function computeNextMeterScale(lastScale: number, db: number): number {
  const clampedDb = Math.max(-80, Math.min(6, db));
  const percentage = Math.max(0, Math.min(100, ((clampedDb + 80) / 86) * 100));
  const targetScale = percentage / 100;
  if (targetScale > lastScale) {
    return targetScale; // instant attack
  }
  // Slower, smoother decay
  return lastScale * 0.97 + targetScale * 0.03;
}
