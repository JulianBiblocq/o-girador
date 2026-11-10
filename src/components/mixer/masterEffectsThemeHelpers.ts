export const getPowerBtnClass = (active: boolean) =>
  `w-full py-1 px-1.5 font-cactus font-bold text-[9.5px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer rounded-[2px] ${
    active
      ? 'border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)]'
      : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-text-muted)] border border-[var(--cordel-card-btn-border)] opacity-75 hover:opacity-100'
  }`;

export const getPowerBtnStyle = (active: boolean, activeBg: string, activeText = 'var(--fx-active-text)') =>
  active
    ? { backgroundColor: activeBg, color: activeText, borderColor: 'var(--cordel-ink-dark)' }
    : undefined;

export const getLedClass = (active: boolean, isDarkActiveText = false) =>
  `w-1.5 h-1.5 rounded-full shrink-0 ${
    active
      ? isDarkActiveText
        ? 'bg-[var(--cordel-ink-dark)] shadow-[0_0_4px_rgba(26,26,26,0.6)]'
        : 'bg-[var(--fx-active-text)] shadow-[0_0_4px_rgba(244,236,216,0.9)]'
      : 'bg-current opacity-35'
  }`;
