export const activeNativeOscillators = new Set<OscillatorNode>();

export function stopAllNativeOscillators() {
  activeNativeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (_) {}
  });
  activeNativeOscillators.clear();
}
