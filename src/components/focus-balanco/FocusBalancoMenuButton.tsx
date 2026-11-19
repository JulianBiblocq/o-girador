import React, { useSyncExternalStore } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayableFocusTracks, resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';
import {
  subscribeFocusBalancoDrawer,
  getIsFocusBalancoDrawerOpen,
  setFocusBalancoDrawerOpen,
} from '../../audio/groove/liveBalancoMorph';

interface FocusBalancoMenuButtonProps {
  lang?: string;
  onCloseMenu?: () => void;
}

const BalancoPendulumWaveIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 15c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-1" />
    <line x1="12" y1="3" x2="16" y2="12" />
    <circle cx="16.5" cy="13" r="2" />
    <line x1="9" y1="3" x2="15" y2="3" />
  </svg>
);

export const FocusBalancoMenuButton: React.FC<FocusBalancoMenuButtonProps> = ({
  lang = 'fr',
  onCloseMenu,
}) => {
  const { userProfile } = useAuth();
  const isOpen = useSyncExternalStore(
    subscribeFocusBalancoDrawer,
    getIsFocusBalancoDrawerOpen,
    getIsFocusBalancoDrawerOpen
  );
  const isPt = lang === 'pt';

  const handleClick = () => {
    const st = useSequencerStore.getState();
    const fallbackId =
      resolveDefaultFocusTrackId(st.tracks, userProfile, st.preferredInstrumentName) ??
      getPlayableFocusTracks(st.tracks)[0]?.id ??
      null;
    const targetId = st.focusTrackId ?? fallbackId;

    const nextOpen = !isOpen;
    if (nextOpen && targetId !== null) {
      if (!st.isFocusActive) {
        st.toggleFocusMode(targetId);
      } else if (st.focusTrackId === null) {
        st.setFocusTrackId(targetId, undefined, true);
      }
    }
    setFocusBalancoDrawerOpen(nextOpen);
    if (nextOpen && onCloseMenu) {
      onCloseMenu();
    }
  };

  return (
    <div className="pt-1.5 border-t border-[var(--cordel-ink-dark)]/30">
      <button
        type="button"
        data-testid="focus-balanco-drawer-toggle"
        onClick={handleClick}
        aria-pressed={isOpen}
        className={`w-full px-2.5 py-1.5 border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] flex items-center justify-between gap-2 font-cactus font-bold text-[11px] transition-all cursor-pointer active:translate-y-0.5 ${
          isOpen
            ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
            : 'bg-[var(--cordel-parchment-panel)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <BalancoPendulumWaveIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {isPt ? 'Ver e ouvir o Balanço' : 'Voir & écouter le Balanço'}
          </span>
        </span>
        <span
          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border shrink-0 ${
            isOpen
              ? 'border-[var(--cordel-on-accent)]/60 bg-[var(--cordel-ink-dark)]/25 text-[var(--cordel-on-accent)]'
              : 'border-[var(--cordel-ink-dark)]/40 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-accent-readable)]'
          }`}
        >
          {isOpen ? (isPt ? 'ABERTO' : 'OUVERT') : '0% - %'}
        </span>
      </button>
    </div>
  );
};
