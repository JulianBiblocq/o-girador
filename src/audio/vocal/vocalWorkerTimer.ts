/**
 * O Girador - Background-Immune High-Precision Worker Timer
 */

let timerWorker: Worker | null = null;
let nextTimerId = 1;
const pendingCallbacks = new Map<number, () => void>();

function getTimerWorker(): Worker {
  if (typeof window === 'undefined') return null as any;
  if (!timerWorker) {
    const code = `
      let activeTimers = new Map();
      self.onmessage = (e) => {
        const { type, id, delay } = e.data;
        if (type === 'setTimeout') {
          const timerId = setTimeout(() => {
            postMessage({ type: 'timeout', id });
            activeTimers.delete(id);
          }, delay);
          activeTimers.set(id, timerId);
        } else if (type === 'clearTimeout') {
          const timerId = activeTimers.get(id);
          if (timerId !== undefined) {
            clearTimeout(timerId);
            activeTimers.delete(id);
          }
        } else if (type === 'setInterval') {
          const timerId = setInterval(() => {
            postMessage({ type: 'interval', id });
          }, delay);
          activeTimers.set(id, timerId);
        } else if (type === 'clearInterval') {
          const timerId = activeTimers.get(id);
          if (timerId !== undefined) {
            clearInterval(timerId);
            activeTimers.delete(id);
          }
        }
      };
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    timerWorker = new Worker(url);
    URL.revokeObjectURL(url);

    timerWorker.onmessage = (e) => {
      const { type, id } = e.data;
      const callback = pendingCallbacks.get(id);
      if (callback) {
        callback();
        if (type === 'timeout') {
          pendingCallbacks.delete(id);
        }
      }
    };
  }
  return timerWorker;
}

export function workerSetTimeout(callback: () => void, delay: number): number {
  const id = nextTimerId++;
  pendingCallbacks.set(id, callback);
  getTimerWorker().postMessage({ type: 'setTimeout', id, delay });
  return id;
}

export function workerClearTimeout(id: number): void {
  pendingCallbacks.delete(id);
  const worker = getTimerWorker();
  if (worker) {
    worker.postMessage({ type: 'clearTimeout', id });
  }
}
