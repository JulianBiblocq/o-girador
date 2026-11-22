import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import {
  formatPanDirectionalCartouche,
  formatPanTitle,
  getLeftPanPrefix,
  getPanCartoucheClassName,
} from './controls/panKnobMath';
import { PanKnobSvg } from './controls/PanKnobSvg';
import { usePanKnobInteraction } from './controls/usePanKnobInteraction';
import { usePanSquadTicks } from './controls/usePanSquadTicks';

interface PanKnobProps {
  trackId?: number;
  value: number; // -100 to 100
  onChange: (val: number) => void;
  defaultValue?: number;
  label?: string;
  lang?: string;
  showLabels?: boolean;
  panKnobRef?: React.RefObject<SVGGElement | null>;
}

export const PanKnob: React.FC<PanKnobProps> = ({
  trackId,
  value,
  onChange,
  defaultValue = 0,
  label = 'Pan',
  lang,
  showLabels = true,
  panKnobRef,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const effectiveLang = lang || storeLang || 'pt';
  const memberTicks = usePanSquadTicks(trackId);
  const {
    containerRef,
    inputRef,
    arcPathRef,
    cartoucheRef,
    setRotationRef,
    setTickGroupRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetToDefault,
    handleInputChange,
  } = usePanKnobInteraction({ trackId, value, defaultValue, lang: effectiveLang, onChange, panKnobRef, memberTicks });

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetToDefault();
  };

  const initialAngle = value * 1.35;
  const panTitle = formatPanTitle(value, effectiveLang);

  return (
    <div
      data-pan-root="1"
      className="flex flex-col items-center gap-0.5 select-none shrink-0 touch-none"
      onDoubleClick={handleDoubleClick}
    >
      {label ? (
        <span className="text-[8.5px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/65 leading-none cursor-default">{label}</span>
      ) : null}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title={panTitle}
        className="relative w-10 h-10 flex items-center justify-center cursor-ns-resize touch-none select-none active:scale-95 transition-transform duration-75"
      >
        <PanKnobSvg
          setRotationRef={setRotationRef}
          setTickGroupRef={setTickGroupRef}
          arcPathRef={arcPathRef}
          memberTicks={memberTicks}
          initialAngle={initialAngle}
          inputRef={inputRef}
          value={value}
          label={label}
          onInputChange={handleInputChange}
        />
      </div>
      <span
        ref={cartoucheRef}
        data-pan-cartouche="1"
        data-testid="pan-knob-cartouche"
        title={panTitle}
        className={getPanCartoucheClassName(value)}
      >
        {formatPanDirectionalCartouche(value, effectiveLang)}
      </span>
      {showLabels && (
        <div className="flex justify-between w-full px-1 text-[8px] font-bold opacity-65 pointer-events-none leading-none">
          <span>{getLeftPanPrefix(effectiveLang)}</span>
          <span>D</span>
        </div>
      )}
    </div>
  );
};
