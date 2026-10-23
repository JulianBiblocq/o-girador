
export function notifyToast(type: 'success' | 'error' | 'info', message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, message } }));
  }
}

export function cleanUrlParams(keys: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let modified = false;
    keys.forEach((k) => {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        modified = true;
      }
    });
    if (modified) {
      const s = url.searchParams.toString();
      window.history.replaceState({}, document.title, url.pathname + (s ? `?${s}` : '') + url.hash);
    }
  } catch (_) {}
}
