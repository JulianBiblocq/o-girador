import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { getStrokePairs } from '../../utils/instrumentStrokes';
import { Sliders } from 'lucide-react';
import { useWindow } from '../../contexts/WindowContext';
import { StrokeWritingDockPairButton } from './dock/StrokeWritingDockPairButton';
import { StrokeWritingDockSpecialTools } from './dock/StrokeWritingDockSpecialTools';
import { StrokeDockSelectionBar } from './dock/StrokeDockSelectionBar';

const NO_ALTERNATION_INSTRUMENTS = new Set(['marcante', 'meiao', 'repique', 'alfaia', 'gongue', 'apito', 'puxador', 'coro', 'toada']);

export interface StrokeWritingDockProps {
  trackId: number;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    name?: string;
    [key: string]: any;
  };
  lang: string;
  isLeftHanded: boolean;
  activeTool: string;
  onSelectTool: (tool: string) => void;
  isAlternating?: boolean;
  onToggleAlternating?: () => void;
  onOpenBottomSheet?: () => void;
  showInspectorButton?: boolean;
  isMultiSelectActive?: boolean;
  selectionCount?: number;
  canPasteRange?: boolean;
  onToggleMultiSelect?: () => void;
  onExitMultiSelect?: () => void;
  onDuplicateRange?: () => void;
  onCopyRange?: () => void;
  onCutRange?: () => void;
  onPasteRange?: () => void;
  onClearRange?: () => void;
}

export const StrokeWritingDock: React.FC<StrokeWritingDockProps> = React.memo(({
  trackId, instrument, lang, isLeftHanded, activeTool, onSelectTool,
  isAlternating = false, onToggleAlternating, onOpenBottomSheet, showInspectorButton = true,
  isMultiSelectActive = false, selectionCount = 0, canPasteRange = false,
  onToggleMultiSelect, onExitMultiSelect,
  onDuplicateRange, onCopyRange, onCutRange, onPasteRange, onClearRange,
}) => {
  const hostWin = useWindow();
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockWidth, setDockWidth] = useState<number>(() => Math.min(hostWin?.innerWidth || 1024, 1280));

  useEffect(() => {
    const el = dockRef.current;
    const RO = (hostWin as (Window & typeof globalThis) | undefined)?.ResizeObserver || (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);
    if (!el || !RO) return;
    const observer = new RO((entries) => {
      const nextW = Math.round(entries[0]?.contentRect.width || 0);
      if (nextW > 0) setDockWidth((prev) => (prev === nextW ? prev : nextW));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hostWin]);

  const isFr = lang === 'fr';
  const pairs = useMemo(() => getStrokePairs(instrument.id, instrument.type, lang, isLeftHanded), [instrument.id, instrument.type, lang, isLeftHanded]);
  const isEraserActive = activeTool === '0' || activeTool === '';
  const isScissorsActive = activeTool === 'scissors';
  const isSelectionModeActive = isMultiSelectActive || selectionCount > 1;
  const supportsAlternation = !NO_ALTERNATION_INSTRUMENTS.has(instrument.id) && !NO_ALTERNATION_INSTRUMENTS.has(instrument.type);

  const handlePickBrushTool = useCallback((tool: string) => {
    if (isMultiSelectActive || selectionCount > 0) onExitMultiSelect?.();
    onSelectTool(tool);
  }, [isMultiSelectActive, selectionCount, onExitMultiSelect, onSelectTool]);

  const inspectorReserve = showInspectorButton && onOpenBottomSheet && dockWidth < 1024 ? (dockWidth >= 640 ? 120 : 62) : 0;
  const toolsNaturalWidth = pairs.length * 112 + (supportsAlternation ? 108 : 0) + 224 + inspectorReserve;
  const freeWidth = dockWidth - toolsNaturalWidth;
  const isCompact = freeWidth < 650 || dockWidth < 1060;
  const showDirectPaste = Boolean(canPasteRange && (freeWidth >= 400 || dockWidth >= 880));

  const hasSelectionSupport = Boolean(
    onToggleMultiSelect && onExitMultiSelect && onDuplicateRange && onCopyRange && onCutRange && onPasteRange && onClearRange
  );

  return (
    <div
      ref={dockRef}
      data-stroke-dock="true"
      className="@container w-full bg-[var(--cordel-parchment-surface)] border-t-[3px] border-[var(--cordel-ink-dark)] px-2.5 sm:px-3 py-2 shrink-0 flex items-center justify-between gap-2 shadow-[0_-2px_6px_var(--cordel-shadow-color)] z-30 select-none"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pl-1 pr-1.5 py-1 min-w-0 scrollbar-none">
          {pairs.map((pair) => (
            <StrokeWritingDockPairButton
              key={pair.id} trackId={trackId} pair={pair} instrument={instrument} activeTool={activeTool}
              isScissorsActive={isScissorsActive} isEraserActive={isEraserActive || isSelectionModeActive}
              isFr={isFr} onSelectTool={handlePickBrushTool}
            />
          ))}

          <StrokeWritingDockSpecialTools
            supportsAlternation={supportsAlternation} isAlternating={isAlternating} onToggleAlternating={onToggleAlternating}
            isEraserActive={isEraserActive} isScissorsActive={isScissorsActive}
            isMultiSelectActive={isSelectionModeActive} isFr={isFr} onSelectTool={handlePickBrushTool}
          />
        </div>

        {hasSelectionSupport && (
          <StrokeDockSelectionBar
            isFr={isFr} isMultiSelectActive={isMultiSelectActive} selectionCount={selectionCount}
            canPasteRange={canPasteRange} isCompact={isCompact} showDirectPaste={showDirectPaste}
            onToggleMultiSelect={onToggleMultiSelect!} onExitSelection={onExitMultiSelect!}
            onDuplicateRange={onDuplicateRange!} onCopyRange={onCopyRange!}
            onCutRange={onCutRange!} onPasteRange={onPasteRange!} onClearRange={onClearRange!}
          />
        )}
      </div>

      {showInspectorButton && onOpenBottomSheet && (
        <button
          type="button" onClick={onOpenBottomSheet}
          className="xilo-wood-stamp flex lg:hidden items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] cordel-border-sm font-cactus font-bold text-xs uppercase tracking-wide shrink-0 shadow-[2px_2px_0px_var(--cordel-ink-dark)] hover:bg-[var(--cordel-accent)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform cursor-pointer"
          title={isFr ? "Ouvrir l'inspecteur de frappe et accordage" : 'Abrir inspetor de toque e afinação'}
        >
          <Sliders size={14} />
          <span className="hidden sm:inline">{isFr ? 'Inspecteur' : 'Inspetor'}</span>
          {!isEraserActive && !isScissorsActive && !isSelectionModeActive && (
            <span className="px-1 py-0.2 bg-[var(--cordel-paper-surface)] text-[var(--cordel-wood)] rounded-xs font-mono font-bold text-[10px]">{activeTool}</span>
          )}
        </button>
      )}
    </div>
  );
});

StrokeWritingDock.displayName = 'StrokeWritingDock';
