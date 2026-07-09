import React, { useEffect, useRef, useContext } from 'react';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useAudio } from '../contexts/AudioContext';
import { audioEngine, subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';

const TimelinePlayheadComponent: React.FC<{ isActive?: boolean }> = ({ isActive = true }) => {
  const uiContext = useContext(TimelineUIContext);
  const audio = useAudio();
  const playheadRef = useRef<HTMLDivElement>(null);
  
  const bpm = useSequencerStore(state => state.bpm);
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);

  const anchorRef = useRef({ 
    exactX: 0,
    time: 0, // AudioContext time
    speed: 0, // Pixels per second
  });
  
  const layoutCache = useRef({ 
    vw: 0, 
    lastScrollX: 0 
  });

  const lastExactXRef = useRef<number>(-1);

  // Throttling adaptatif et monitoring du framerate (Zero Render Thrashing)
  const lastFrameTimeRef = useRef<number>(0);
  const frameDeltasRef = useRef<Float32Array>(new Float32Array(10));
  const bufferIndexRef = useRef<number>(0);
  const bufferCountRef = useRef<number>(0);
  const bufferSumRef = useRef<number>(0);
  const forcedEcoModeRef = useRef<boolean>(false);
  const stableStartTimestampRef = useRef<number | null>(null);
  const lastVisualUpdateRef = useRef<number>(0);

  const MEASURE_W = uiContext ? uiContext.MEASURE_W : 0;
  const HEADER_W = uiContext ? uiContext.HEADER_W : 0;

  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const measureTimeSigsRef = useRef(measureTimeSigs);
  useEffect(() => {
    measureTimeSigsRef.current = measureTimeSigs;
  }, [measureTimeSigs]);

  const measureWRef = useRef(MEASURE_W);
  useEffect(() => {
    measureWRef.current = MEASURE_W;
  }, [MEASURE_W]);

  // Réinitialiser la position de la tête de lecture quand on arrête ou met en pause
  useEffect(() => {
    if (!audio.isPlaying) {
      anchorRef.current = { exactX: 0, time: 0, speed: 0 };
      lastExactXRef.current = -1;
      const el = playheadRef.current;
      if (el) {
        el.style.transition = 'none';
        el.style.transform = `translate3d(${HEADER_W}px, 0, 0)`;
        el.style.display = 'none';
      }
      const scrollEl = document.getElementById('timeline-scroll-container');
      if (scrollEl) {
        scrollEl.scrollLeft = 0;
      }
      layoutCache.current.lastScrollX = 0;
    }
  }, [audio.isPlaying, HEADER_W]);

  useEffect(() => {
    if (!isActive) return;

    const scrollEl = document.getElementById('timeline-scroll-container');
    if (!scrollEl) return;

    layoutCache.current.vw = scrollEl.clientWidth - HEADER_W;
    layoutCache.current.lastScrollX = scrollEl.scrollLeft;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        layoutCache.current.vw = entries[0].contentRect.width - HEADER_W;
      }
    });
    resizeObserver.observe(scrollEl);

    // Écouteur de scroll passif pour mettre à jour lastScrollX en cache (0 layout thrashing)
    const handleScroll = () => {
      layoutCache.current.lastScrollX = scrollEl.scrollLeft;
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, time = 0 } = detail;
      const el = playheadRef.current;
      
      if (!el) return;

      // --- 1. GESTION DE L'ARRÊT ---
      if (step < 0) {
        anchorRef.current = { exactX: 0, time: 0, speed: 0 };
        lastExactXRef.current = -1;
        el.style.transition = 'none';
        el.style.display = 'none';
        if (scrollEl) scrollEl.scrollLeft = 0;
        layoutCache.current.lastScrollX = 0;
        return;
      }

      if (el.style.display !== 'block') {
        el.style.display = 'block';
      }

      const currentMEASURE_W = measureWRef.current;

      // Position mathématique absolue
      const exactX = measure * currentMEASURE_W + ratio * currentMEASURE_W;
      
      // Calculer la vitesse en pixels par seconde de l'AudioContext
      const timeSigOfMeasure = measureTimeSigsRef.current[measure] || '4/4';
      const beats = parseInt(timeSigOfMeasure.split('/')[0], 10) || 4;
      const speed = (currentMEASURE_W / beats) * (bpmRef.current / 60);

      anchorRef.current = {
        exactX,
        time,
        speed
      };

      // Détection de rupture (Loop, Seek ou saut au début de la boucle) pour le scroll immédiat
      const dx = exactX - lastExactXRef.current;
      const isRupture = lastExactXRef.current === -1 || dx < 0 || Math.abs(dx) > currentMEASURE_W * 0.5;

      if (isRupture) {
        lastExactXRef.current = exactX;
        if (layoutCache.current.vw > 0 && scrollEl) {
           const targetScroll = Math.max(0, exactX - layoutCache.current.vw * 0.1);
           scrollEl.scrollLeft = targetScroll;
           layoutCache.current.lastScrollX = targetScroll;
        }
      } else {
        lastExactXRef.current = exactX;
      }
    };

    subscribeToTick(handleTick);

    return () => {
      unsubscribeFromTick(handleTick);
      resizeObserver.disconnect();
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [HEADER_W, isActive]);

  // Boucle requestAnimationFrame continue pour une mise à jour ultra fluide et découplée
  useEffect(() => {
    if (!audio.isPlaying || !isActive) {
      // Si le mode éco a été forcé par le playhead, on le désactive à l'arrêt
      if (forcedEcoModeRef.current) {
        (window as any).oGiradorVisualEcoMode = false;
        forcedEcoModeRef.current = false;
        window.dispatchEvent(new Event('visual-eco-mode-changed'));
        document.body.classList.remove('visual-eco-mode');
      }
      return;
    }

    // Réinitialisation des statistiques du monitoring pour la nouvelle session de lecture
    lastFrameTimeRef.current = 0;
    bufferIndexRef.current = 0;
    bufferCountRef.current = 0;
    bufferSumRef.current = 0;
    frameDeltasRef.current.fill(0);
    stableStartTimestampRef.current = null;
    lastVisualUpdateRef.current = 0;

    let rafId: number;
    const scrollEl = document.getElementById('timeline-scroll-container');

    const updatePlayheadPosition = () => {
      if ((window as any).oGiradorDetailEditorOpen) {
        rafId = requestAnimationFrame(updatePlayheadPosition);
        return;
      }
      const now = performance.now();

      // 1. Calcul du framerate glissant en O(1)
      if (lastFrameTimeRef.current > 0) {
        const delta = now - lastFrameTimeRef.current;
        
        const buffer = frameDeltasRef.current;
        const size = buffer.length;
        const index = bufferIndexRef.current;
        const prevVal = buffer[index];
        
        buffer[index] = delta;
        
        if (bufferCountRef.current < size) {
          bufferCountRef.current++;
          bufferSumRef.current += delta;
        } else {
          bufferSumRef.current = bufferSumRef.current - prevVal + delta;
        }
        bufferIndexRef.current = (index + 1) % size;
        
        const avgDelta = bufferSumRef.current / bufferCountRef.current;

        // 2. Gestion adaptative des seuils
        if (avgDelta > 25) {
          // Chute sous ~40 FPS -> Forcer l'activation du mode éco visuel
          stableStartTimestampRef.current = null; // Réinitialise le chrono de stabilité
          if (!(window as any).oGiradorVisualEcoMode) {
            (window as any).oGiradorVisualEcoMode = true;
            forcedEcoModeRef.current = true;
            window.dispatchEvent(new Event('visual-eco-mode-changed'));
            document.body.classList.add('visual-eco-mode');
          }
        } else if (avgDelta < 17.5) {
          // Retour vers 60 FPS -> Démarrer ou surveiller le chrono de stabilité
          if (forcedEcoModeRef.current) {
            if (stableStartTimestampRef.current === null) {
              stableStartTimestampRef.current = now;
            } else if (now - stableStartTimestampRef.current > 2000) {
              // Stable pendant plus de 2000 ms -> Désactiver le mode éco visuel forcé
              (window as any).oGiradorVisualEcoMode = false;
              forcedEcoModeRef.current = false;
              stableStartTimestampRef.current = null;
              window.dispatchEvent(new Event('visual-eco-mode-changed'));
              document.body.classList.remove('visual-eco-mode');
            }
          }
        } else {
          // Jitter intermédiaire : réinitialiser le chrono de stabilité pour éviter les faux positifs de récupération
          stableStartTimestampRef.current = null;
        }
      }
      lastFrameTimeRef.current = now;

      const isEco = useSequencerStore.getState().isEcoMode || (window as any).oGiradorVisualEcoMode;
      const isManualEco = isEco && !forcedEcoModeRef.current;
      const anchor = anchorRef.current;
      
      // 3. Logique de Throttling visuel (DOM et auto-scroll) à ~30 FPS
      let shouldSkipVisualUpdate = false;
      if (isEco) {
        if (now - lastVisualUpdateRef.current < 33) {
          shouldSkipVisualUpdate = true;
        } else {
          lastVisualUpdateRef.current = now;
        }
      }

      if (!shouldSkipVisualUpdate && audioEngine && anchor.time > 0 && anchor.speed > 0) {
        const ctxTime = audioEngine.getCurrentTime();
        const elapsedCtx = Math.max(0, ctxTime - anchor.time);

        // Extrapoler la position de la tête de lecture à partir du dernier tick
        if (elapsedCtx < 2.0) {
          const currentX = anchor.exactX + elapsedCtx * anchor.speed;
          
          if (playheadRef.current) {
            playheadRef.current.style.transform = `translate3d(${HEADER_W + currentX}px, 0, 0)`;
          }

          // --- AUTO-SCROLL (Pagination douce) ---
          const { vw, lastScrollX } = layoutCache.current;
          if (vw > 0 && scrollEl) {
            const currentScroll = lastScrollX; // Zéro lecture synchrone de scrollEl.scrollLeft !
            const playheadScreenX = currentX - currentScroll;

            // Tourne la page uniquement quand on arrive à 95% de l'écran visible
            if (playheadScreenX > vw * 0.95) {
              const nextScroll = currentScroll + (vw * 0.90);
              scrollEl.scrollLeft = nextScroll;
              layoutCache.current.lastScrollX = nextScroll;
            }
          }
        }
      }

      // 4. Comportement de la boucle RAF selon le mode éco
      // Si mode éco manuel -> brider le RAF avec setTimeout
      // Si mode éco forcé par CPU -> ne pas brider le RAF pour mesurer précisément la récupération
      if (isManualEco) {
        setTimeout(() => {
          rafId = requestAnimationFrame(updatePlayheadPosition);
        }, 33);
      } else {
        rafId = requestAnimationFrame(updatePlayheadPosition);
      }
    };

    rafId = requestAnimationFrame(updatePlayheadPosition);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [audio.isPlaying, HEADER_W, isActive]);

  if (!uiContext) return null;

  return (
    <div
      ref={playheadRef}
      className="absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
      style={{
        left: 0,
        display: 'none',
        willChange: 'transform',
      }}
    />
  );
};

export const TimelinePlayhead = React.memo(TimelinePlayheadComponent);
