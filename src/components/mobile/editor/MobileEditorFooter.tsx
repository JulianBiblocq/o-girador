/**
 * Barre de pied Mobile Éditeur : Play/Stop & Sauvegarder en chantier (< 95 lignes).
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { usePaperVigilanceStore } from '../../../stores/usePaperVigilanceStore';
import { saveDraftLocally, syncOfflineDraftsIfOnline } from '../../../utils/offlineDraftStorage';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const MobileEditorFooter: React.FC<Props> = ({ isPlaying, onTogglePlay }) => {
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
    <footer className="shrink-0 p-2.5 bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] flex flex-col gap-2">
      {feedback && (
        <div className="text-[11px] text-center font-mono py-1 px-2 rounded bg-black/5 text-[#b94a2c] font-semibold border border-[var(--cordel-border)] animate-fade-in">
          {feedback}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onTogglePlay}
          className={`flex-1 py-2.5 rounded font-mono text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 ${
            isPlaying ? 'bg-red-700 text-white' : 'bg-[#15803d] hover:bg-[#166534] text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              <span>Stop</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        <button
          onClick={handleSaveDraft}
          className="flex-1 py-2.5 rounded font-mono text-xs font-bold border-2 border-[var(--cordel-border)] bg-[var(--cordel-card-btn-bg)] hover:bg-black/5 text-[var(--cordel-card-btn-text)] shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>{tMobile(lang, 'saveDraft')}</span>
        </button>
      </div>
    </footer>
  );
};
