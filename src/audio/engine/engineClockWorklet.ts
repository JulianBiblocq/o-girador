/**
 * O Girador - AudioWorklet & Fallback Timer Initializer
 */

export interface WorkletClockHandle {
  clockNode: AudioWorkletNode | null;
  fallbackTimerId: number | null;
  hasWorkletTicked: boolean;
}

export function createEngineClock(
  audioContext: AudioContext,
  lookaheadInterval: number,
  onTick: () => void
): WorkletClockHandle {
  const handle: WorkletClockHandle = {
    clockNode: null,
    fallbackTimerId: null,
    hasWorkletTicked: false
  };

  const initFallback = () => {
    if (handle.hasWorkletTicked || handle.clockNode !== null || handle.fallbackTimerId !== null) return;
    handle.fallbackTimerId = window.setInterval(onTick, lookaheadInterval);
  };

  const nativeCtx = (audioContext as any)._nativeContext || (audioContext as any).rawContext || audioContext;
  const isSecure = typeof window !== 'undefined' ? (window.isSecureContext !== false) : true;

  if (!isSecure || typeof nativeCtx.audioWorklet === 'undefined') {
    initFallback();
    return handle;
  }

  let isStartingWorklet = false;

  const startWorklet = () => {
    if (isStartingWorklet || handle.hasWorkletTicked || handle.clockNode) return;
    isStartingWorklet = true;

    // @ts-ignore
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    nativeCtx.audioWorklet.addModule(`${cleanBase}clock.worklet.js`).then(() => {
      // Nettoyage strict de tout écouteur ou nœud précédent
      if (handle.clockNode) {
        try {
          handle.clockNode.port.onmessage = null;
          handle.clockNode.disconnect();
        } catch (_) {}
        handle.clockNode = null;
      }

      const node = new AudioWorkletNode(nativeCtx, 'clock-processor');
      node.port.onmessage = () => {
        // Dès le premier tick, détruire immédiatement et définitivement le timer de repli
        if (handle.fallbackTimerId !== null) {
          window.clearInterval(handle.fallbackTimerId);
          handle.fallbackTimerId = null;
        }
        handle.hasWorkletTicked = true;
        onTick();
      };
      node.connect(nativeCtx.destination);
      handle.clockNode = node;
    }).catch(() => {
      initFallback();
    }).finally(() => {
      isStartingWorklet = false;
    });
  };

  if (nativeCtx.state === 'running') {
    startWorklet();
  } else {
    initFallback();
    nativeCtx.addEventListener('statechange', () => {
      if (nativeCtx.state === 'running' && !handle.clockNode && !handle.hasWorkletTicked) {
        startWorklet();
      }
    }, { once: true });
  }

  return handle;
}
