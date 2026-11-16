
import React from 'react';
import { Check } from 'lucide-react';
import { CordelMenuItem } from './cordelContextMenuTypes';
import { CordelContextSubMenu } from './CordelContextSubMenu';

interface CordelContextMenuItemProps {
  item: CordelMenuItem;
  index: number;
  activeSubMenuId: string | null;
  setActiveSubMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  shouldOpenSubMenuLeft: boolean;
  onClose: () => void;
}

export const CordelContextMenuItem: React.FC<CordelContextMenuItemProps> = ({
  item,
  index,
  activeSubMenuId,
  setActiveSubMenuId,
  shouldOpenSubMenuLeft,
  onClose,
}) => {
  if (item.isSeparator) {
    return <div key={`sep-${index}`} className="my-1 border-t border-[var(--cordel-border)]/35" />;
  }

  const itemId = item.id || `item-${index}`;
  const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
  const isSubMenuOpen = activeSubMenuId === itemId;

  if (item.disabled) {
    return (
      <div
        key={itemId}
        className="px-3 py-1.5 text-[11px] text-[var(--cordel-text-muted)]/55 italic flex items-center justify-between cursor-not-allowed bg-transparent"
        title={item.disabledReason}
      >
        <div className="flex items-center gap-2 truncate">
          {item.icon && <span className="text-sm shrink-0 opacity-50">{item.icon}</span>}
          <span className="truncate">{item.label}</span>
        </div>
        {item.disabledReason && (
          <span className="text-[9px] text-[var(--cordel-accent-readable)]/75 ml-2 font-mono">({item.disabledReason})</span>
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
            ? 'text-[var(--cordel-status-danger)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)]'
            : isSubMenuOpen
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
            : 'text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {item.icon && <span className="text-sm shrink-0">{item.icon}</span>}
          <span className="truncate">{item.label}</span>
        </div>
        {item.isActive && !hasSubItems && (
          <Check size={13} className="shrink-0 ml-2 stroke-[2.75]" />
        )}
        {hasSubItems && (
          <span className="text-[10px] shrink-0 font-bold ml-2">
            {shouldOpenSubMenuLeft ? '◄' : '►'}
          </span>
        )}
      </button>

      {hasSubItems && isSubMenuOpen && item.subItems && (
        <CordelContextSubMenu
          subItems={item.subItems}
          shouldOpenSubMenuLeft={shouldOpenSubMenuLeft}
          onClose={onClose}
        />
      )}
    </div>
  );
};
