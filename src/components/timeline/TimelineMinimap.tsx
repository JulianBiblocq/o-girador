/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useCallback, useContext } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig } from '../../data';
import { TimelineUIContext } from '../../contexts/TimelineUIContext';

interface TimelineMinimapProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  pendingScrollLeftRef: React.MutableRefObject<number | null>;
  totalMeasures: number;

  measureWidth: number;
  onMeasureWidthChange: (width: number) => void;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
}

const TimelineMinimapComponent: React.FC<TimelineMinimapProps> = ({
  scrollRef,
  pendingScrollLeftRef,
  totalMeasures,

  measureWidth,
  onMeasureWidthChange,
  onZoomStart,
  onZoomEnd,
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) {
    throw new Error('TimelineMinimap must be used within a TimelineUIContext.Provider');
  }

  const { lang, HEADER_W, MEASURE_W } = uiContext;
  const tracks = useSequencerStore(useShallow(state => state.tracks.map(t => ({
    id: t.id,
    instrumentIdx: t.instrumentIdx,
    patterns: t.patterns.map(p => ({
      id: p.id,
      measureAssignments: p.measureAssignments
    }))
  }))));

  const minimapContainerRef = useRef<HTMLDivElement>(null);
  const minimapSliderRef = useRef<HTMLDivElement>(null);
  const isMinimapDragging = useRef<boolean>(false);
  const minimapPointerId = useRef<number | null>(null);
  const dragAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (dragAbortControllerRef.current) {
        dragAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Mini-Map Viewport synchronisation
  const updateMinimapViewport = useCallback(() => {
    if (!scrollRef.current || !minimapSliderRef.current || !minimapContainerRef.current) return;
    const scrollEl = scrollRef.current;
    const sliderEl = minimapSliderRef.current;
    const containerEl = minimapContainerRef.current;
    
    const totalContentWidth = totalMeasures * MEASURE_W;
    const viewportWidth = scrollEl.clientWidth - HEADER_W;
    const minimapWidth = containerEl.clientWidth;
    
    if (totalContentWidth <= 0 || minimapWidth <= 0) return;
    
    const ratio = minimapWidth / totalContentWidth;
    const sliderWidth = Math.max(16, Math.min(minimapWidth, viewportWidth * ratio));
    const sliderLeft = scrollEl.scrollLeft * ratio;
    
    sliderEl.style.width = `${sliderWidth}px`;
    sliderEl.style.left = `${sliderLeft}px`;
  }, [totalMeasures, MEASURE_W, HEADER_W, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      updateMinimapViewport();
    };
    el.addEventListener('scroll', handleScroll);
    updateMinimapViewport();
    
    window.addEventListener('resize', updateMinimapViewport);
    
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMinimapViewport);
    };
  }, [scrollRef.current, updateMinimapViewport]);

  // Handle updates to measureWidth/totalMeasures to redraw minimap slider correctly
  useEffect(() => {
    updateMinimapViewport();
  }, [measureWidth, totalMeasures, updateMinimapViewport]);

  // Mini-Map Navigation / Dragging logic
  const handleMinimapDrag = useCallback((clientX: number) => {
    if (!scrollRef.current || !minimapContainerRef.current || !minimapSliderRef.current) return;
    const scrollEl = scrollRef.current;
    const containerEl = minimapContainerRef.current;
    const sliderEl = minimapSliderRef.current;
    
    const rect = containerEl.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const minimapWidth = rect.width;
    
    const totalContentWidth = totalMeasures * MEASURE_W;
    if (totalContentWidth <= 0) return;
    const ratio = minimapWidth / totalContentWidth;
    if (ratio <= 0) return;
    
    const sliderWidth = parseFloat(sliderEl.style.width) || 50;
    
    let newLeft = clickX - sliderWidth / 2;
    if (newLeft < 0) newLeft = 0;
    if (newLeft > minimapWidth - sliderWidth) newLeft = minimapWidth - sliderWidth;
    
    scrollEl.scrollLeft = newLeft / ratio;
    sliderEl.style.left = `${newLeft}px`;
  }, [totalMeasures, MEASURE_W, scrollRef]);

  const handleMinimapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isMinimapDragging.current = true;
    minimapPointerId.current = e.pointerId;
    const containerEl = minimapContainerRef.current;
    if (containerEl) {
      containerEl.setPointerCapture(e.pointerId);
    }
    handleMinimapDrag(e.clientX);
    e.preventDefault();
  };

  const handleMinimapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMinimapDragging.current && e.pointerId === minimapPointerId.current) {
      handleMinimapDrag(e.clientX);
    }
  };

  const handleMinimapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMinimapDragging.current && e.pointerId === minimapPointerId.current) {
      isMinimapDragging.current = false;
      minimapPointerId.current = null;
      const containerEl = minimapContainerRef.current;
      if (containerEl) {
        containerEl.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleMinimapZoomRightPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button !== 0) return;
    e.stopPropagation(); // Prevent minimap panning
    
    if (!minimapContainerRef.current || !minimapSliderRef.current || !scrollRef.current) return;
    const initialX = e.clientX;
    const initialS = minimapSliderRef.current.clientWidth;
    const initialL = minimapSliderRef.current.offsetLeft;
    const M = minimapContainerRef.current.clientWidth;
    const V = scrollRef.current.clientWidth;
    
    let rafId: number | null = null;
    let latestClientX = initialX;

    onZoomStart?.();

    const performZoom = (clientX: number, isFinal: boolean = false) => {
      const deltaX = clientX - initialX;
      const targetS = Math.max(16, initialS + deltaX);
      
      const newW = ((M * V) / targetS - HEADER_W) / totalMeasures;
      const clampedW = Math.max(120, Math.min(960, newW));
      
      React.startTransition(() => {
        const newC = HEADER_W + totalMeasures * clampedW;
        const newScrollLeft = (initialL / M) * newC;
        pendingScrollLeftRef.current = newScrollLeft;
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = newScrollLeft;
        }
        onMeasureWidthChange(clampedW);
        if (isFinal) {
          onZoomEnd?.();
        }
      });

      // 3. Mettre à jour le slider de la minimap
      if (minimapSliderRef.current) {
        minimapSliderRef.current.style.width = `${targetS}px`;
        minimapSliderRef.current.style.left = `${initialL}px`;
      }
    };

    const onPointerMove = (moveEv: PointerEvent) => {
      latestClientX = moveEv.clientX;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          performZoom(latestClientX, false);
        });
      }
    };
    
    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      performZoom(latestClientX, true); // Apply final value
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      document.body.style.cursor = 'default';
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', onPointerMove, { signal });
    window.addEventListener('pointerup', onPointerUp, { signal });
    document.body.style.cursor = 'ew-resize';
  };

  const handleMinimapZoomLeftPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (e.button !== 0) return;
    e.stopPropagation();
    
    if (!minimapContainerRef.current || !minimapSliderRef.current || !scrollRef.current) return;
    const initialX = e.clientX;
    const initialS = minimapSliderRef.current.clientWidth;
    const initialL = minimapSliderRef.current.offsetLeft;
    const M = minimapContainerRef.current.clientWidth;
    const V = scrollRef.current.clientWidth;
    
    let rafId: number | null = null;
    let latestClientX = initialX;

    onZoomStart?.();

    const performZoom = (clientX: number, isFinal: boolean = false) => {
      const deltaX = clientX - initialX;
      const targetS = Math.max(16, initialS - deltaX);
      const targetL = Math.max(0, Math.min(M - targetS, initialL + deltaX));
      
      const newW = ((M * V) / targetS - HEADER_W) / totalMeasures;
      const clampedW = Math.max(120, Math.min(960, newW));
      
      React.startTransition(() => {
        const newC = HEADER_W + totalMeasures * clampedW;
        const newScrollLeft = (targetL / M) * newC;
        pendingScrollLeftRef.current = newScrollLeft;
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = newScrollLeft;
        }
        onMeasureWidthChange(clampedW);
        if (isFinal) {
          onZoomEnd?.();
        }
      });

      // 3. Mettre à jour le slider de la minimap
      if (minimapSliderRef.current) {
        minimapSliderRef.current.style.width = `${targetS}px`;
        minimapSliderRef.current.style.left = `${targetL}px`;
      }
    };

    const onPointerMove = (moveEv: PointerEvent) => {
      latestClientX = moveEv.clientX;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          performZoom(latestClientX, false);
        });
      }
    };
    
    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      performZoom(latestClientX, true); // Apply final value
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      document.body.style.cursor = 'default';
    };
    
    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    
    window.addEventListener('pointermove', onPointerMove, { signal });
    window.addEventListener('pointerup', onPointerUp, { signal });
    document.body.style.cursor = 'ew-resize';
  };

  return (
    <div className="border-b border-[var(--cordel-border)]/20 bg-[var(--cordel-bg)] px-4 py-2 shrink-0 select-none">
      <div className="flex justify-between items-center text-[9px] font-bold text-[var(--cordel-text)]/70 uppercase mb-1 tracking-wider">
        <span>🗺️ {lang === 'fr' ? "Vue d'ensemble (Mini-Map)" : 'Visão Geral (Mini-Map)'}</span>
        <span className="text-[8px] text-[var(--cordel-text)]/40 normal-case">{lang === 'fr' ? 'Glissez ou cliquez pour naviguer rapidement' : 'Clique ou arraste para navegar rapidamente'}</span>
      </div>
      <div 
        ref={minimapContainerRef}
        className="h-10 w-full relative bg-black/40 rounded border border-[var(--cordel-border)]/15 overflow-hidden cursor-pointer"
        onPointerDown={handleMinimapPointerDown}
        onPointerMove={handleMinimapPointerMove}
        onPointerUp={handleMinimapPointerUp}
        onPointerCancel={handleMinimapPointerUp}
      >
        {/* Miniature Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: totalMeasures }).map((_, mIdx) => {
            if (mIdx === 0 || mIdx === totalMeasures) return null;
            const isSection = mIdx % 4 === 0;
            return (
              <div 
                key={mIdx}
                className={`absolute top-0 bottom-0 w-[1px] ${
                  isSection ? 'bg-blue-500/25' : 'bg-[var(--cordel-border)]/5'
                }`}
                style={{ left: `${(mIdx / totalMeasures) * 100}%` }}
              />
            );
          })}
        </div>

        {/* Miniature Track Preview */}
        <div className="absolute inset-0 flex flex-col justify-around py-0.5 pointer-events-none">
          {tracks.map((track) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            if (!inst) return null;
            return (
              <div key={track.id} className="h-1 w-full relative">
                {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  const activePattern = track.patterns.find(p => p.measureAssignments[mIdx]);
                  if (!activePattern) return null;
                  const bg = inst.colors['D'] || inst.colors['E'] || '#3b82f6';
                  return (
                    <div 
                      key={mIdx}
                      className="absolute top-0 bottom-0 rounded-xs opacity-50"
                      style={{
                        left: `${(mIdx / totalMeasures) * 100}%`,
                        width: `${(1 / totalMeasures) * 100}%`,
                        backgroundColor: bg
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Viewport Translucent Slider */}
        <div 
          ref={minimapSliderRef}
          className="absolute top-0 bottom-0 bg-blue-500/10 dark:bg-blue-400/10 border-y-2 border-blue-500 dark:border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.25)] cursor-grab active:cursor-grabbing z-10"
          style={{ width: '100px', left: '0px' }}
        >
          {/* Left Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2.5 bg-blue-500 dark:bg-blue-400 cursor-ew-resize opacity-80 hover:opacity-100"
            onPointerDown={handleMinimapZoomLeftPointerDown}
          />
          {/* Right Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2.5 bg-blue-500 dark:bg-blue-400 cursor-ew-resize opacity-80 hover:opacity-100"
            onPointerDown={handleMinimapZoomRightPointerDown}
          />
        </div>
      </div>
    </div>
  );
};

export const TimelineMinimap = React.memo(TimelineMinimapComponent);
