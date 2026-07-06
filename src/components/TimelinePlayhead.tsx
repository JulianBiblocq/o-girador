import React, { useEffect, useRef, useContext } from 'react';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useAudio } from '../contexts/AudioContext';
import { audioEngine } from '../hooks/useAudioSync';
import { useSequencerStore } from '../stores/useSequencerStore';

const TimelinePlayheadComponent: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
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
    if (!visible) return;

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

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks, time = 0 } = customEvent.detail;
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

    window.addEventListener('o-girador-tick', handleTick);

    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
      resizeObserver.disconnect();
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [HEADER_W, visible]);

  // Boucle requestAnimationFrame continue pour une mise à jour ultra fluide et découplée
  useEffect(() => {
    if (!audio.isPlaying || !visible) return;

    let rafId: number;
    const scrollEl = document.getElementById('timeline-scroll-container');

    const updatePlayheadPosition = () => {
      const isEco = (window as any).oGiradorEcoMode;
      const anchor = anchorRef.current;
      
      if (audioEngine && anchor.time > 0 && anchor.speed > 0) {
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

      // Throttling en mode éco : brider à ~30 FPS pour préserver le processeur
      if (isEco) {
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
  }, [audio.isPlaying, HEADER_W, visible]);

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
