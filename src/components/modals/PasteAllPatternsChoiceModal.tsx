/**
 * PasteAllPatternsChoiceModal.tsx — Modale Cordel bilingue FR/BR « Remplacer » vs « Ajouter » au collage de banque (< 125 L).
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePortalRoot, useWindow } from '../../contexts/WindowContext';

export const PasteAllPatternsChoiceModal: React.FC = () => {
  const pending = useSequencerStore((s) => s.pendingPasteAllRequest);
  const clip = useSequencerStore((s) => s.instrumentPatternsClipboard);
  const lang = useSequencerStore((s) => s.lang);
  const setPending = useSequencerStore((s) => s.setPendingPasteAllRequest);
  const pasteAllTrackPatterns = useSequencerStore((s) => s.pasteAllTrackPatterns);
  const portalRoot = usePortalRoot();
  const hostWin = useWindow();

  const [applyTimeline, setApplyTimeline] = useState<boolean>(true);

  useEffect(() => {
    if (pending) setApplyTimeline(pending.defaultApplyTimeline ?? true);
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setPending(null);
      }
    };
    hostWin.addEventListener('keydown', onKeyDown, { capture: true });
    return () => hostWin.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [pending, hostWin, setPending]);

  if (!pending || !clip || !clip.patterns?.length) return null;

  const isFr = lang === 'fr';
  const count = clip.patterns.length;
  const srcName = clip.sourceName || clip.sourceType || '';
  const close = () => setPending(null);

  const handleReplace = () => {
    const targetId = pending.targetTrackId;
    setPending(null);
    pasteAllTrackPatterns(targetId, { mode: 'replace', applyTimeline });
  };

  const handleAppend = () => {
    const targetId = pending.targetTrackId;
    setPending(null);
    pasteAllTrackPatterns(targetId, { mode: 'append', applyTimeline: false });
  };

  return createPortal(
    <div
      data-testid="paste-all-patterns-choice-modal"
      data-theme="light"
      onClick={close}
      className="fixed inset-0 z-[100050] flex items-center justify-center p-4 bg-[var(--cordel-ink-dark)]/70"
      style={{ colorScheme: 'light' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--cordel-parchment-panel)] text-[var(--cordel-ink-dark)] cordel-border-sm p-5 flex flex-col gap-4 shadow-[6px_6px_0px_var(--cordel-ink-dark)]"
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-ink-dark)] pb-2">
          <h3 className="font-cactus font-bold text-base uppercase tracking-wide text-[var(--cordel-ink-dark)]">
            {isFr ? 'Coller la banque de motifs' : 'Colar banco de padrões'}
          </h3>
          <button
            type="button"
            onClick={close}
            aria-label={isFr ? 'Fermer' : 'Fechar'}
            className="p-1 text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)]/10 rounded-xs cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[var(--cordel-ink-dark)]">
          {isFr
            ? `${count} motif${count > 1 ? 's' : ''} copié${count > 1 ? 's' : ''}${srcName ? ` depuis « ${srcName} »` : ''}. Cette piste contient déjà des motifs non vides : souhaitez-vous les remplacer ou les ajouter à la suite ?`
            : `${count} padrão(ões) copiado(s)${srcName ? ` de "${srcName}"` : ''}. Esta faixa já contém padrões não vazios: deseja substituí-los ou adicioná-los em seguida?`}
        </p>

        <label className="flex items-center gap-2.5 p-2.5 bg-[var(--cordel-paper-surface)] border border-[var(--cordel-ink-dark)]/30 rounded-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={applyTimeline}
            onChange={(e) => setApplyTimeline(e.target.checked)}
            className="w-4 h-4 accent-[var(--cordel-wood)] cursor-pointer shrink-0"
          />
          <span className="text-xs font-bold text-[var(--cordel-ink-dark)]">
            {isFr ? 'Reporter aussi le placement sur la Timeline' : 'Aplicar também o posicionamento na Timeline'}
          </span>
        </label>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleReplace}
            className="w-full py-2.5 px-4 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] cordel-border-sm font-cactus font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_var(--cordel-ink-dark)] hover:bg-[var(--cordel-accent)] cursor-pointer transition-colors"
          >
            {isFr ? 'Remplacer les motifs existants' : 'Substituir padrões existentes'}
          </button>
          <button
            type="button"
            onClick={handleAppend}
            className="w-full py-2.5 px-4 bg-[var(--cordel-paper-surface)] text-[var(--cordel-ink-dark)] cordel-border-sm font-cactus font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_var(--cordel-ink-dark)] hover:bg-[var(--cordel-ink-dark)] hover:text-[var(--cordel-parchment-panel)] cursor-pointer transition-colors"
          >
            {isFr ? 'Ajouter aux motifs existants' : 'Adicionar aos padrões existentes'}
          </button>
          <button
            type="button"
            onClick={close}
            className="w-full py-2 px-4 bg-transparent text-[var(--cordel-text-muted)] hover:text-[var(--cordel-ink-dark)] font-cactus font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            {isFr ? 'Annuler' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
};
