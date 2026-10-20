/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CordelMenuItem } from './cordelContextMenuTypes';

interface CordelContextSubMenuProps {
  subItems: CordelMenuItem[];
  shouldOpenSubMenuLeft: boolean;
  onClose: () => void;
}

export const CordelContextSubMenu: React.FC<CordelContextSubMenuProps> = ({
  subItems,
  shouldOpenSubMenuLeft,
  onClose,
}) => {
  return (
    <div
      className={`absolute top-0 z-[1000000] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] rounded-sm py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100 ${
        shouldOpenSubMenuLeft ? 'right-full mr-1' : 'left-full ml-1'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {subItems.map((sub, sIdx) => {
        if (sub.isSeparator) {
          return <div key={`sub-sep-${sIdx}`} className="my-1 border-t border-[#1a1a1a]/15" />;
        }

        if (sub.disabled) {
          return (
            <div key={`sub-${sIdx}`} className="px-3 py-1.5 text-[11px] text-[#1a1a1a]/40 italic cursor-not-allowed">
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
  );
};
