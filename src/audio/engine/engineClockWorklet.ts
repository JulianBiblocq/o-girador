/**
 * O Girador - AudioWorklet & Fallback Timer Initializer
 */

export interface WorkletClockHandle {
  clockNode: AudioWorkletNode | null;
  fallbackTimerId: number | null;
}

export function createEngineClock(
  audioContext: AudioContext,
  lookaheadInterval: number,
  onTick: () => void
): WorkletClockHandle {
  const handle: WorkletClockHandle = {
    clockNode: null,
    fallbackTimerId: null
  };

  const initFallback = () => {
    if (handle.clockNode !== null || handle.fallbackTimerId !== null) return;
    handle.fallbackTimerId = window.setInterval(onTick, lookaheadInterval);
  };

  const nativeCtx = (audioContext as any)._nativeContext || (audioContext as any).rawContext || audioContext;
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext !== false) : true;

  if (!isSecure || typeof nativeCtx.audioWorklet === 'undefined') {
    initFallback();
    return handle;
  }

  const startWorklet = () => {
    // @ts-ignore
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    nativeCtx.audioWorklet.addModule(`${cleanBase}clock.worklet.js`).then(() => {
      const node = new AudioWorkletNode(nativeCtx, 'clock-processor');
      node.port.onmessage = () => {
        if (handle.fallbackTimerId !== null) {
          window.clearInterval(handle.fallbackTimerId);
          handle.fallbackTimerId = null;
        }
        onTick();
      };
      node.connect(nativeCtx.destination);
      handle.clockNode = node;
    }).catch(() => initFallback());
  };

  if (nativeCtx.state === 'running') startWorklet();
  else {
    initFallback();
    nativeCtx.addEventListener('statechange', () => {
      if (nativeCtx.state === 'running' && !handle.clockNode) startWorklet();
    }, { once: true });
  }

  return handle;
}
