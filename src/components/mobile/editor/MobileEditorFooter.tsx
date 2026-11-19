/**
 * Barre de pied Mobile Éditeur : Trio [ ⏮ ] [ ▶/⏸ ] [ ⏹ ] & Sauvegarder en chantier (< 85 lignes).
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';
import { saveDraftLocally, syncOfflineDraftsIfOnline } from '../../../utils/offlineDraftStorage';
import { tMobile } from '../../../i18n/mobileTranslations';
import { CordelTransportTrio } from '../../transport/CordelTransportTrio';

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop?: () => void;
  onRewind?: () => void;
}

export const MobileEditorFooter: React.FC<Props> = ({ isPlaying, onTogglePlay, onStop, onRewind }) => {
  const lang = useSequencerStore((s) => s.lang);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    const state = useSequencerStore.getState();
    const vigilance = usePaperVigilanceStore.getState().points;
    const name = state.metadata?.toada || 'Chantier Mobile';
    saveDraftLocally(name, state, vigilance, state.mestreSignals);
    setFeedback(tMobile(lang, 'savedOffline'));
    setTimeout(() => setFeedback(null), 3000);
    try {
      await syncOfflineDraftsIfOnline();
    } catch (_) {}
  };

  return (
    <footer className="shrink-0 p-2 bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] flex flex-col gap-1.5">
      {feedback && (
        <div className="text-[11px] text-center font-mono py-1 px-2 bg-[var(--cordel-surface)] text-[var(--cordel-accent)] font-semibold border border-[var(--cordel-border)] animate-fade-in">
          {feedback}
        </div>
      )}
      <div className="flex items-center gap-2 min-w-0">
        <CordelTransportTrio
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onStop={onStop || onTogglePlay}
          onRewind={onRewind || onStop || onTogglePlay}
          lang={lang}
          variant="mobile"
        />

        <button
          type="button"
          onClick={handleSaveDraft}
          className="flex-1 min-w-0 min-h-[42px] px-2.5 py-2 font-mono text-xs font-bold border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-card-btn-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-card-btn-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 truncate"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span className="truncate">{tMobile(lang, 'saveDraft')}</span>
        </button>
      </div>
    </footer>
  );
};
