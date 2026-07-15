import { useEffect, useRef } from 'react';
import { usePerformanceStore } from '../stores/usePerformanceStore';

/**
 * Hook de surveillance de la télémétrie matérielle et des performances en temps réel (FPS).
 * 
 * Justification CPU (Reflow/Paint) et Thread Audio :
 * 1. Zero Render Thrashing : Le calcul des FPS s'effectue dans une boucle requestAnimationFrame isolée.
 *    L'accumulation se fait dans un useRef (mémoire brute synchrone) sans jamais modifier d'état React.
 * 2. Throttle de rendu : L'état global Zustand n'est mis à jour qu'à intervalles réguliers de 1000ms (1 Hz),
 *    évitant ainsi la surcharge du Main Thread et prévenant les saccades à l'écran (Zero Layout Thrashing).
 * 3. Isolation Audio : Cette boucle s'exécute sur le Main Thread et n'interfère pas avec l'AudioContext / Audio Worklets
 *    de Tone.js, évitant ainsi le blocage ou la désynchronisation de l'horloge audio (Anti-jitter).
 */
export function usePerformanceMonitor() {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Récupération statique des informations matérielles (avec fallbacks pour Safari/iOS)
    const ram = (navigator as any).deviceMemory; // Retourne undefined si indisponible (Safari/iOS)
    const cores = navigator.hardwareConcurrency; // Supporté sur la majorité des navigateurs modernes, peut retourner undefined dans certains bacs à sable
    
    const store = usePerformanceStore.getState();
    store.setHardwareInfo(ram, cores);

    const lowFpsCountRef = { current: 0 };
    const highFpsCountRef = { current: 0 };
    lastTimeRef.current = performance.now();
    frameCountRef.current = 0;

    const loop = (now: number) => {
      frameCountRef.current += 1;
      const elapsed = now - lastTimeRef.current;

      // Throttle de mise à jour à 1000ms (1 seconde)
      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        
        const store = usePerformanceStore.getState();
        store.setFps(fps);

        if (fps < 45) {
          lowFpsCountRef.current += 1;
          highFpsCountRef.current = 0;
          if (lowFpsCountRef.current >= 3 && !store.isCPUSurcharged) {
            store.setCPUSurcharged(true);
            console.warn("⚠️ CPU overload detected, enabling Dynamic CPU Throttling (FPS < 45 for 3s)");
          }
        } else if (fps >= 54) {
          highFpsCountRef.current += 1;
          lowFpsCountRef.current = 0;
          if (highFpsCountRef.current >= 5 && store.isCPUSurcharged) {
            store.setCPUSurcharged(false);
            console.log("ℹ️ CPU load normalized, disabling Dynamic CPU Throttling (FPS >= 54 for 5s)");
          }
        } else {
          lowFpsCountRef.current = 0;
          highFpsCountRef.current = 0;
        }

        // Réinitialisation des accumulateurs
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    // 3. Nettoyage de la boucle au démontage pour éviter les fuites mémoire
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
}
