/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
