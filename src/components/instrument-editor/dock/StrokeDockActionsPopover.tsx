import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Scissors, ClipboardPaste, Trash2 } from 'lucide-react';
import { useWindow } from '../../../contexts/WindowContext';

export interface StrokeDockActionsPopoverProps {
  isFr: boolean;
  hasSteps: boolean;
  canPasteRange: boolean;
  anchorRect: DOMRect;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onCopyRange: () => void;
  onCutRange: () => void;
  onPasteRange: () => void;
  onClearRange: () => void;
  onClose: () => void;
}

export const StrokeDockActionsPopover: React.FC<StrokeDockActionsPopoverProps> = React.memo(({
  isFr, hasSteps, canPasteRange, anchorRect, triggerRef,
  onCopyRange, onCutRange, onPasteRange, onClearRange, onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const contextWin = useWindow();
  const ownerDoc = triggerRef.current?.ownerDocument || contextWin?.document || document;
  const hostWin = ownerDoc.defaultView || contextWin || window;
  const portalBody = ownerDoc.body;
  const inheritedTheme = triggerRef.current?.closest('[data-theme]')?.getAttribute('data-theme') || undefined;

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    ownerDoc.addEventListener('pointerdown', handlePointerDown, true);
    ownerDoc.addEventListener('keydown', handleKeyDown, true);
    hostWin.addEventListener('resize', onClose);
    return () => {
      ownerDoc.removeEventListener('pointerdown', handlePointerDown, true);
      ownerDoc.removeEventListener('keydown', handleKeyDown, true);
      hostWin.removeEventListener('resize', onClose);
    };
  }, [ownerDoc, hostWin, triggerRef, onClose]);

  if (!portalBody) return null;

  const menuWidth = 212;
  const vpW = hostWin.innerWidth || 1024;
  const vpH = hostWin.innerHeight || 768;
  const bottom = Math.max(8, vpH - anchorRect.top + 8);
  const left = Math.max(8, Math.min(anchorRect.right - menuWidth, vpW - menuWidth - 8));

  const items = [
    { id: 'copy', label: isFr ? 'Copier' : 'Copiar', shortcut: 'Ctrl+C', icon: Copy, enabled: hasSteps, danger: false, run: onCopyRange },
    { id: 'cut', label: isFr ? 'Couper' : 'Cortar', shortcut: 'Ctrl+X', icon: Scissors, enabled: hasSteps, danger: false, run: onCutRange },
    { id: 'paste', label: isFr ? 'Coller' : 'Colar', shortcut: 'Ctrl+V', icon: ClipboardPaste, enabled: canPasteRange, danger: false, run: onPasteRange },
    { id: 'clear', label: isFr ? 'Vider' : 'Limpar', shortcut: isFr ? 'Suppr' : 'Del', icon: Trash2, enabled: hasSteps, danger: true, run: onClearRange },
  ];

  return createPortal(
    <div
      ref={popoverRef}
      role="menu"
      data-theme={inheritedTheme}
      data-stroke-dock="true"
      data-testid="stroke-dock-actions-popover"
      aria-label={isFr ? 'Actions de sélection' : 'Ações de seleção'}
      style={{ left: `${left}px`, bottom: `${bottom}px`, width: `${menuWidth}px` }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="fixed z-[500] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] rounded-sm p-1.5 flex flex-col gap-0.5 select-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const enabledCls = item.danger
          ? 'text-[var(--cordel-status-danger)] hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] cursor-pointer'
          : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer';
        const disabledCls = 'text-[var(--cordel-text-muted)] opacity-45 cursor-not-allowed';

        return (
          <React.Fragment key={item.id}>
            {item.danger && <div className="my-0.5 border-t border-[var(--cordel-border)]/35" />}
            <button
              type="button"
              role="menuitem"
              disabled={!item.enabled}
              onClick={() => {
                if (!item.enabled) return;
                item.run();
                onClose();
              }}
              className={`w-full min-h-[40px] px-2.5 py-1.5 rounded-sm flex items-center justify-between gap-2 font-cactus font-bold text-xs uppercase tracking-wide transition-colors ${
                item.enabled ? enabledCls : disabledCls
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="font-mono text-[10px] opacity-75 shrink-0">{item.shortcut}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>,
    portalBody
  );
});

StrokeDockActionsPopover.displayName = 'StrokeDockActionsPopover';
