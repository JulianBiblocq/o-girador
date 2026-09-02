import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    const errorMsg = String(error?.message || error || '').toLowerCase();
    const isChunkLoadError =
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('failed to load module script') ||
      errorMsg.includes('mime type of "text/html"') ||
      errorMsg.includes('text/html') ||
      errorMsg.includes('loading chunk') ||
      error?.name === 'ChunkLoadError';

    if (isChunkLoadError && typeof window !== 'undefined') {
      const lastReload = parseInt(sessionStorage.getItem('chunk_eb_reload') || '0', 10);
      const now = Date.now();
      if (now - lastReload > 15_000) {
        sessionStorage.setItem('chunk_eb_reload', String(now));
        console.warn('[ErrorBoundary] Stale chunk error caught. Triggering auto-recovery reload...');
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            for (const reg of regs) reg.unregister();
            window.location.reload();
          }).catch(() => window.location.reload());
        } else {
          window.location.reload();
        }
      }
    }
  }

  private handleForceUpdate = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          if (key.includes('workbox') || key.includes('o-girador')) {
            await caches.delete(key);
          }
        }
      }
    } catch {
      // Ignorer
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
      }
    } catch {
      // Ignorer
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = String(this.state.error?.message || this.state.error || '').toLowerCase();
      const isChunkLoadError =
        errorMsg.includes('dynamically imported module') ||
        errorMsg.includes('failed to load module script') ||
        errorMsg.includes('mime type of "text/html"') ||
        errorMsg.includes('text/html') ||
        errorMsg.includes('loading chunk') ||
        this.state.error?.name === 'ChunkLoadError';

      if (isChunkLoadError) {
        return (
          <div className="p-4 border-2 border-[#b33939] bg-[#f4ecd8] text-[#1a1a1a] m-4 rounded shadow-[3px_3px_0_#1a1a1a] z-50 font-cactus text-sm flex flex-col items-center justify-center gap-3">
            <span className="text-2xl">📦</span>
            <div className="text-center">
              <h3 className="font-bold text-base text-[#b33939] mb-1">Mise à jour requise / Atualização necessária</h3>
              <p className="font-mono text-xs opacity-80">
                Une nouvelle version de l'application a été déployée sur le serveur.
              </p>
            </div>
            <button
              onClick={this.handleForceUpdate}
              className="px-4 py-2 bg-[#b33939] text-[#f4ecd8] font-bold text-xs uppercase tracking-wider rounded border border-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] hover:brightness-110 active:translate-y-0.5 cursor-pointer transition-all"
            >
              🔄 Recharger pour mettre à jour / Recarregar
            </button>
          </div>
        );
      }

      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(() => this.setState({ hasError: false, error: null }));
      }
      return this.props.fallback || (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded text-red-400 font-cactus text-sm">
          Une erreur est survenue dans cette partie de l'interface.
          <button 
            className="block mt-2 underline cursor-pointer"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}