
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleWheel = () => onClose();

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [onClose]);

  const menuWidth = Math.max(minWidth, 220);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  const adjustedX = Math.max(8, Math.min(x, viewportWidth - menuWidth - 12));
  const estimatedHeight = (items.length * 36) + (title ? 32 : 0) + 16;
  const adjustedY = Math.max(8, Math.min(y, viewportHeight - estimatedHeight - 12));
  const shouldOpenSubMenuLeft = (adjustedX + menuWidth + 160) > viewportWidth;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={title || (lang === 'fr' ? 'Menu contextuel Cordel' : 'Menu contextual Cordel')}
      className="fixed z-[999999] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] rounded-sm py-1.5 select-none text-xs font-bold text-[#1a1a1a] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px`, minWidth: `${menuWidth}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {title && (
        <div className="px-3 py-1 mb-1 text-[11px] font-cactus tracking-wide uppercase text-[#8b2a1a] border-b border-[#1a1a1a]/20 flex items-center justify-between">
          <span className="truncate">{title}</span>
          <button type="button" onClick={onClose} className="text-[10px] text-[#1a1a1a]/50 hover:text-[#1a1a1a] px-1 font-bold cursor-pointer">
            
          </button>
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
    document.body
  );
};
