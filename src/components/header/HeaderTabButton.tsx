
import React from 'react';
import { TabKey } from './useHeaderTabMenu';

interface HeaderTabButtonProps {
  tabKey: TabKey;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  createTabTouchHandlers: (tabKey: TabKey, title: string) => any;
}

export const HeaderTabButton: React.FC<HeaderTabButtonProps> = ({
  tabKey,
  label,
  icon,
  isActive,
  title,
  onClick,
  createTabTouchHandlers,
}) => {
  return (
    <div
      {...createTabTouchHandlers(tabKey, label)}
      className="flex items-stretch h-[36px] cordel-border cordel-button overflow-hidden shadow-[4px_4px_0_var(--cordel-text)] rounded bg-[var(--cordel-bg)] text-[var(--cordel-text)] select-none shrink-0"
    >
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 px-4 font-cactus uppercase font-bold cursor-pointer h-full hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors ${
          isActive
            ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]'
            : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
        }`}
        title={title}
      >
        {icon} {label}
      </button>
    </div>
  );
};
