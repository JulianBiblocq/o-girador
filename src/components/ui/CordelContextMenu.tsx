import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePortalRoot, useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CordelContextMenuItem } from './CordelContextMenuItem';
import { CordelMenuItem, CordelContextMenuProps } from './cordelContextMenuTypes';

export type { CordelMenuItem, CordelContextMenuProps };

export const CordelContextMenu: React.FC<CordelContextMenuProps> = ({
  x,
  y,
  title,
  items,
  onClose,
  minWidth = 220,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubMenuId, setActiveSubMenuId] = useState<string | null>(null);
  const lang = useSequencerStore((state) => state.lang);
  const hostWin = useWindow();
  const portalRoot = usePortalRoot();

  useEffect(() => {
    const doc = hostWin.document;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && e.target && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleWheel = () => onClose();

    doc.addEventListener('mousedown', handleMouseDown, true);
    doc.addEventListener('keydown', handleKeyDown);
    hostWin.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      doc.removeEventListener('mousedown', handleMouseDown, true);
      doc.removeEventListener('keydown', handleKeyDown);
      hostWin.removeEventListener('wheel', handleWheel);
    };
  }, [onClose, hostWin]);

  const menuWidth = Math.max(minWidth, 220);
  const viewportWidth = hostWin?.innerWidth || 1024;
  const viewportHeight = hostWin?.innerHeight || 768;

  const adjustedX = Math.max(8, Math.min(x, viewportWidth - menuWidth - 12));
  const estimatedHeight = items.length * 36 + (title ? 32 : 0) + 16;
  const adjustedY = Math.max(8, Math.min(y, viewportHeight - estimatedHeight - 12));
  const shouldOpenSubMenuLeft = adjustedX + menuWidth + 160 > viewportWidth;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={title || (lang === 'fr' ? 'Menu contextuel Cordel' : 'Menu contextual Cordel')}
      className="fixed z-[999999] bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] rounded-sm py-1.5 select-none text-xs font-bold text-[var(--cordel-text)] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px`, minWidth: `${menuWidth}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {title && (
        <div className="px-3 py-1 mb-1 text-[11px] font-cactus tracking-wide uppercase text-[var(--cordel-accent-readable)] border-b border-[var(--cordel-border)]/25 flex items-center justify-between">
          <span className="truncate">{title}</span>
        </div>
      )}

      <div className="flex flex-col">
        {items.map((item, index) => (
          <CordelContextMenuItem
            key={item.id || `item-${index}`}
            item={item}
            index={index}
            activeSubMenuId={activeSubMenuId}
            setActiveSubMenuId={setActiveSubMenuId}
            shouldOpenSubMenuLeft={shouldOpenSubMenuLeft}
            onClose={onClose}
          />
        ))}
      </div>
    </div>,
    portalRoot
  );
};
