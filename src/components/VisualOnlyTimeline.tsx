import React, { useEffect, useRef } from 'react';
import { instrumentsConfig, getVisualStrokeSymbol, isDarkText } from '../data';
import { subscribeToTick, unsubscribeFromTick } from '../hooks/useAudioSync';

interface VisualOnlyTimelineProps {
  trackId: number;
  steps: number;
  activeSteps: (string | number)[];
  instrumentIdx: number;
  isPlaying: boolean;
  isLeftHanded: boolean;
}

export const VisualOnlyTimeline: React.FC<VisualOnlyTimelineProps> = React.memo(({
  trackId,
  steps,
  activeSteps,
  instrumentIdx,
  isPlaying,
  isLeftHanded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const inst = instrumentsConfig[instrumentIdx];

  useEffect(() => {
    if (!isPlaying) {
      if (activeElementRef.current) {
        activeElementRef.current.classList.remove('is-active');
        activeElementRef.current = null;
      }
      return;
    }

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      const { step, maxTicks, ratio } = detail;

      if (step < 0 || !containerRef.current) return;

      const currentRatio = ratio !== undefined ? ratio : (step / maxTicks);
      const targetStep = Math.floor(currentRatio * steps);

      if (activeElementRef.current) {
        if (Number(activeElementRef.current.getAttribute('data-step-index')) === targetStep) {
          return;
        }
        activeElementRef.current.classList.remove('is-active');
      }

      const nextEl = containerRef.current.querySelector(`[data-step-index="${targetStep}"]`) as HTMLElement;
      if (nextEl) {
        nextEl.classList.add('is-active');
        activeElementRef.current = nextEl;
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      if (activeElementRef.current) {
        activeElementRef.current.classList.remove('is-active');
        activeElementRef.current = null;
      }
    };
  }, [isPlaying, steps]);

  if (steps === 16) {
    const renderStep = (i: number) => {
      const stepVal = activeSteps[i];
      const isHit = stepVal !== 0 && stepVal !== '' && stepVal !== undefined;
      const strokeColor = isHit && inst?.colors ? (inst.colors[stepVal as string] || '#1a1a1a') : 'transparent';
      const visualVal = isHit ? getVisualStrokeSymbol(stepVal, isLeftHanded, inst?.id) : '';
      const isDark = isHit && isDarkText(inst?.id, stepVal as string);
      const textColor = isDark ? '#1a1a1a' : '#ffffff';

      return (
        <div
          key={i}
          data-step-index={i}
          className={`visual-step-led ${isHit ? 'has-hit' : ''}`}
          style={{
            backgroundColor: isHit ? strokeColor : undefined,
          }}
        >
          {isHit && (
            <span className="visual-step-symbol" style={{ color: textColor }}>
              {visualVal}
            </span>
          )}
        </div>
      );
    };

    return (
      <div 
        ref={containerRef}
        className="visual-timeline-container w-full"
      >
        {/* Ligne 1 : Temps 1 (0-3) & Temps 2 (4-7) */}
        <div className="flex items-center w-full gap-2 justify-between">
          <div className="grid grid-cols-4 gap-1 flex-1">
            {[0, 1, 2, 3].map(renderStep)}
          </div>
          <div className="w-1.5 shrink-0" />
          <div className="grid grid-cols-4 gap-1 flex-1">
            {[4, 5, 6, 7].map(renderStep)}
          </div>
        </div>
        {/* Ligne 2 : Temps 3 (8-11) & Temps 4 (12-15) */}
        <div className="flex items-center w-full gap-2 justify-between mt-1">
          <div className="grid grid-cols-4 gap-1 flex-1">
            {[8, 9, 10, 11].map(renderStep)}
          </div>
          <div className="w-1.5 shrink-0" />
          <div className="grid grid-cols-4 gap-1 flex-1">
            {[12, 13, 14, 15].map(renderStep)}
          </div>
        </div>
      </div>
    );
  }

  const cols = Math.ceil(steps / 2);

  return (
    <div 
      ref={containerRef}
      className="visual-timeline-grid"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: steps }).map((_, i) => {
        const stepVal = activeSteps[i];
        const isHit = stepVal !== 0 && stepVal !== '' && stepVal !== undefined;
        const strokeColor = isHit && inst?.colors ? (inst.colors[stepVal as string] || '#1a1a1a') : 'transparent';
        const visualVal = isHit ? getVisualStrokeSymbol(stepVal, isLeftHanded, inst?.id) : '';
        const isDark = isHit && isDarkText(inst?.id, stepVal as string);
        const textColor = isDark ? '#1a1a1a' : '#ffffff';

        return (
          <div
            key={i}
            data-step-index={i}
            className={`visual-step-led ${isHit ? 'has-hit' : ''}`}
            style={{
              backgroundColor: isHit ? strokeColor : undefined,
            }}
          >
            {isHit && (
              <span className="visual-step-symbol" style={{ color: textColor }}>
                {visualVal}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

VisualOnlyTimeline.displayName = 'VisualOnlyTimeline';
