/**
 * SatelliteToastBanner.tsx — Relais visuel des notifications Cordel (`app-toast`) sur l'Écran 2 (< 70 lignes).
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface ToastPayload {
  type: 'success' | 'error' | 'info';
  message: string;
}

export const SatelliteToastBanner: React.FC = () => {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onAppToast = (ev: Event) => {
      const detail = (ev as CustomEvent<ToastPayload>).detail;
      if (!detail?.message) return;
      setToast({
        type: detail.type || 'info',
        message: detail.message,
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3600);
    };

    window.addEventListener('app-toast', onAppToast);
    return () => {
      window.removeEventListener('app-toast', onAppToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const Icon = isError ? AlertTriangle : toast.type === 'success' ? CheckCircle2 : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-[100060] max-w-sm flex items-center gap-2.5 px-3.5 py-2.5 border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] font-cactus text-xs font-bold ${
        isError
          ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
          : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
      }`}
    >
      <Icon size={16} className={isError ? 'shrink-0 text-[var(--cordel-on-accent)]' : 'shrink-0 text-[var(--cordel-accent)]'} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Fermer"
        className="p-0.5 opacity-80 hover:opacity-100 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
};
