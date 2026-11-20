import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckSquare, Square, CopyPlus, Copy, Scissors, ClipboardPaste, Trash2, MoreHorizontal, ChevronUp } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { getPasteDisabledReason } from '../../../utils/patternPasteNormalizer';
import { StrokeDockActionsPopover } from './StrokeDockActionsPopover';

export interface StrokeDockSelectionBarProps {
  isFr: boolean;
  isMultiSelectActive: boolean;
  selectionCount: number;
  canPasteRange: boolean;
  isCompact: boolean;
  showDirectPaste: boolean;
  onToggleMultiSelect: () => void;
  onExitSelection: () => void;
  onDuplicateRange: () => void;
  onCopyRange: () => void;
  onCutRange: () => void;
  onPasteRange: () => void;
  onClearRange: () => void;
}

const BTN_BASE = 'min-h-[44px] px-2.5 py-1.5 rounded-sm border-2 font-cactus font-bold text-[11px] uppercase flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 select-none';
const BTN_ENABLED = 'border-[var(--cordel-ink-dark)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-paper-surface)] text-[var(--cordel-paper-ink)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] cursor-pointer';
const BTN_DISABLED = 'border-[var(--cordel-ink-dark)]/25 bg-[var(--cordel-parchment-panel)] text-[var(--cordel-text-muted)]/60 opacity-55 cursor-not-allowed';
const BTN_ACTIVE = 'border-[var(--cordel-ink-dark)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] cursor-pointer';
const BTN_DANGER = 'border-[var(--cordel-status-danger)] bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-status-danger)] text-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] cursor-pointer';

export const StrokeDockSelectionBar: React.FC<StrokeDockSelectionBarProps> = React.memo(({
  isFr, isMultiSelectActive, selectionCount, canPasteRange, isCompact, showDirectPaste,
  onToggleMultiSelect, onExitSelection, onDuplicateRange, onCopyRange, onCutRange, onPasteRange, onClearRange,
}) => {
  const isSelectionModeActive = isMultiSelectActive || selectionCount > 1;
  const hasSteps = selectionCount > 0;
  const hasRangeClipboard = useSequencerStore((s) => Boolean(s.stepRangeClipboard?.steps?.length));
  const sourceRangeInst = useSequencerStore((s) => s.stepRangeClipboard?.sourceInstId || '');
  const actionsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isSelectionModeActive || !isCompact) setAnchorRect(null);
  }, [isSelectionModeActive, isCompact]);

  const handleClosePopover = useCallback(() => setAnchorRect(null), []);
  const handleToggleActions = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    setAnchorRect((prev) => (prev ? null : el.getBoundingClientRect()));
  }, []);

  if (!isSelectionModeActive) {
    return (
      <div className="flex items-center pl-2 border-l-2 border-[var(--cordel-ink-dark)]/20 shrink-0">
        <button
          type="button" data-testid="dock-toggle-multiselect-btn" data-tour-id="editor-range-select-btn" onClick={onToggleMultiSelect}
          className={`${BTN_BASE} ${BTN_ENABLED}`}
          title={isFr ? 'Sélection de plage de pas [Shift / Ctrl + Clic]' : 'Seleção de trecho de passos [Shift / Ctrl + Clique]'}
        >
          <Square size={15} className="shrink-0 text-[var(--cordel-wood)]" />
          <span className="hidden @[440px]:inline">{isFr ? 'Sélect.' : 'Selec.'}</span>
        </button>
      </div>
    );
  }

  const pasteTitle = canPasteRange
    ? (isFr ? 'Coller [Ctrl+V]' : 'Colar [Ctrl+V]')
    : (getPasteDisabledReason(hasRangeClipboard, canPasteRange, isFr ? 'fr' : 'pt', sourceRangeInst) || (isFr ? 'Coller [Ctrl+V]' : 'Colar [Ctrl+V]'));

  const inlineActions = [
    { id: 'copy', label: isFr ? 'Copier' : 'Copiar', title: isFr ? 'Copier [Ctrl+C]' : 'Copiar [Ctrl+C]', icon: Copy, ok: hasSteps, cls: BTN_ENABLED, run: onCopyRange },
    { id: 'cut', label: isFr ? 'Couper' : 'Cortar', title: isFr ? 'Couper [Ctrl+X]' : 'Cortar [Ctrl+X]', icon: Scissors, ok: hasSteps, cls: BTN_ENABLED, run: onCutRange },
    { id: 'paste', label: isFr ? 'Coller' : 'Colar', title: pasteTitle, icon: ClipboardPaste, ok: canPasteRange, cls: BTN_ENABLED, run: onPasteRange },
    { id: 'clear', label: isFr ? 'Vider' : 'Limpar', title: isFr ? 'Vider [Suppr]' : 'Limpar [Del]', icon: Trash2, ok: hasSteps, cls: BTN_DANGER, run: onClearRange },
  ];

  return (
    <div data-testid="stroke-dock-selection-bar" className="flex items-center gap-1.5 pl-2 border-l-2 border-[var(--cordel-wood)] shrink-0">
      <button
        type="button" data-testid="dock-toggle-multiselect-btn" data-tour-id="editor-range-select-btn" onClick={onExitSelection}
        className={`${BTN_BASE} ${BTN_ACTIVE}`}
        title={isFr ? 'Quitter le mode sélection [Échap]' : 'Sair do modo seleção [Esc]'}
      >
        <CheckSquare size={15} className="shrink-0" />
        {isCompact ? (
          <span><span className="hidden @[540px]:inline">{isFr ? 'Sélect. ' : 'Selec. '}</span>({selectionCount})</span>
        ) : (
          <span className="flex flex-col items-start leading-tight normal-case">
            <span className="text-[11px] font-cactus font-bold uppercase">{isFr ? 'Sélection' : 'Seleção'} ({selectionCount})</span>
            <span className="text-[9px] font-mono text-[var(--cordel-on-accent)]/85">{isFr ? 'Glisser / Tap' : 'Arrastar / Toque'}</span>
          </span>
        )}
      </button>

      <button
        type="button" disabled={!hasSteps} onClick={onDuplicateRange}
        className={`${BTN_BASE} ${hasSteps ? BTN_ACTIVE : BTN_DISABLED}`}
        title={isFr ? 'Dupliquer la plage à la suite [Ctrl+D]' : 'Duplicar trecho em seguida [Ctrl+D]'}
      >
        <CopyPlus size={14} className="shrink-0" />
        <span className="hidden @[540px]:inline">{isFr ? '+ Dupliquer' : '+ Duplicar'}</span>
      </button>

      {!isCompact ? (
        inlineActions.map(({ id, label, title, icon: Icon, ok, cls, run }) => (
          <button key={id} type="button" disabled={!ok} onClick={run} className={`${BTN_BASE} ${ok ? cls : BTN_DISABLED}`} title={title}>
            <Icon size={13} className="shrink-0" />
            <span>{label}</span>
          </button>
        ))
      ) : (
        <>
          {showDirectPaste && (
            <button type="button" disabled={!canPasteRange} onClick={onPasteRange} className={`${BTN_BASE} ${canPasteRange ? BTN_ENABLED : BTN_DISABLED}`} title={pasteTitle}>
              <ClipboardPaste size={13} className="shrink-0" />
              <span>{isFr ? 'Coller' : 'Colar'}</span>
            </button>
          )}
          <button
            ref={actionsBtnRef} type="button" data-testid="dock-selection-actions-trigger"
            aria-haspopup="menu" aria-expanded={Boolean(anchorRect)} onClick={handleToggleActions}
            className={`${BTN_BASE} ${anchorRect ? BTN_ACTIVE : BTN_ENABLED}`}
            title={isFr ? 'Plus d’actions de sélection (Copier, Couper, Coller, Vider)' : 'Mais ações de seleção (Copiar, Cortar, Colar, Limpar)'}
          >
            <MoreHorizontal size={14} className="shrink-0" />
            <span className="hidden @[540px]:inline">{isFr ? 'Actions' : 'Ações'}</span>
            <ChevronUp size={13} className={`shrink-0 transition-transform ${anchorRect ? 'rotate-180' : ''}`} />
          </button>
          {anchorRect && (
            <StrokeDockActionsPopover
              isFr={isFr} hasSteps={hasSteps} canPasteRange={canPasteRange} pasteTitle={pasteTitle}
              anchorRect={anchorRect} triggerRef={actionsBtnRef}
              onCopyRange={onCopyRange} onCutRange={onCutRange}
              onPasteRange={onPasteRange} onClearRange={onClearRange}
              onClose={handleClosePopover}
            />
          )}
        </>
      )}
    </div>
  );
});

StrokeDockSelectionBar.displayName = 'StrokeDockSelectionBar';
