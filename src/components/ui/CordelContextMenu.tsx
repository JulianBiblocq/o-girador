import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface CordelMenuItem {
  id?: string;
  label?: string;
  icon?: React.ReactNode | string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  isDestructive?: boolean;
  isSeparator?: boolean;
  subItems?: CordelMenuItem[];
}

export interface CordelContextMenuProps {
  x: number;
  y: number;
  title?: string;
  items: CordelMenuItem[];
  onClose: () => void;
  minWidth?: number;
}

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleWheel = () => {
      onClose();
    };

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

  // Clamping du menu principal dans le viewport
  const adjustedX = Math.max(8, Math.min(x, viewportWidth - menuWidth - 12));
  const estimatedHeight = (items.length * 36) + (title ? 32 : 0) + 16;
  const adjustedY = Math.max(8, Math.min(y, viewportHeight - estimatedHeight - 12));

  // Consigne 4 : Inversion dynamique des sous-menus si l'espace à droite est inférieur à 160 px
  const shouldOpenSubMenuLeft = (adjustedX + menuWidth + 160) > viewportWidth;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={title || (lang === 'fr' ? 'Menu contextuel Cordel' : 'Menu contextual Cordel')}
      className="fixed z-[999999] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] rounded-sm py-1.5 select-none text-xs font-bold text-[#1a1a1a] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        minWidth: `${menuWidth}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* En-tête Cordel optionnel */}
      {title && (
        <div className="px-3 py-1 mb-1 text-[11px] font-cactus tracking-wide uppercase text-[#8b2a1a] border-b border-[#1a1a1a]/20 flex items-center justify-between">
          <span className="truncate">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] text-[#1a1a1a]/50 hover:text-[#1a1a1a] px-1 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Liste des actions */}
      <div className="flex flex-col">
        {items.map((item, index) => {
          if (item.isSeparator) {
            return <div key={`sep-${index}`} className="my-1 border-t border-[#1a1a1a]/15" />;
          }

          const itemId = item.id || `item-${index}`;
          const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
          const isSubMenuOpen = activeSubMenuId === itemId;

          if (item.disabled) {
            return (
              <div
                key={itemId}
                className="px-3 py-1.5 text-[11px] text-[#1a1a1a]/40 italic flex items-center justify-between cursor-not-allowed bg-transparent"
                title={item.disabledReason}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon && <span className="text-sm shrink-0 opacity-50">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.disabledReason && (
                  <span className="text-[9px] text-[#8b2a1a]/60 ml-2 font-mono">({item.disabledReason})</span>
                )}
              </div>
            );
          }

          return (
            <div
              key={itemId}
              className="relative"
              onMouseEnter={() => {
                if (hasSubItems) setActiveSubMenuId(itemId);
                else setActiveSubMenuId(null);
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (hasSubItems) {
                    setActiveSubMenuId(prev => prev === itemId ? null : itemId);
                  } else if (item.onClick) {
                    item.onClick();
                    onClose();
                  }
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  item.isDestructive
                    ? 'hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#8b2a1a]'
                    : isSubMenuOpen
                    ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                    : 'hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#1a1a1a]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon && <span className="text-sm shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
                {hasSubItems && (
                  <span className="text-[10px] shrink-0 font-bold ml-2">
                    {shouldOpenSubMenuLeft ? '◀' : '▶'}
                  </span>
                )}
              </button>

              {/* Sous-menu Cordel avec inversion dynamique */}
              {hasSubItems && isSubMenuOpen && item.subItems && (
                <div
                  className={`absolute top-0 z-[1000000] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] rounded-sm py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100 ${
                    shouldOpenSubMenuLeft ? 'right-full mr-1' : 'left-full ml-1'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.subItems.map((sub, sIdx) => {
                    if (sub.isSeparator) {
                      return <div key={`sub-sep-${sIdx}`} className="my-1 border-t border-[#1a1a1a]/15" />;
                    }

                    if (sub.disabled) {
                      return (
                        <div
                          key={`sub-${sIdx}`}
                          className="px-3 py-1.5 text-[11px] text-[#1a1a1a]/40 italic cursor-not-allowed"
                        >
                          {sub.label}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`sub-${sIdx}`}
                        type="button"
                        onClick={() => {
                          if (sub.onClick) {
                            sub.onClick();
                            onClose();
                          }
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors cursor-pointer ${
                          sub.isDestructive
                            ? 'hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#8b2a1a]'
                            : 'hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#1a1a1a]'
                        }`}
                      >
                        {sub.icon && <span className="text-sm shrink-0">{sub.icon}</span>}
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
};
