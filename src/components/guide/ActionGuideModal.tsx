import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGuideStore } from '../../stores/useGuideStore';
import { useTourStore } from '../../stores/useTourStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { GUIDE_POLES } from '../../data/guide';
import { GuideHeaderBar, GuideSidebarNav } from './GuideSidebarAndHeader';
import { GuideActionCardView } from './GuideActionCardView';
import { GuidePanoramaView } from './GuidePanoramaView';

interface ActionGuideModalProps {
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const ActionGuideModal: React.FC<ActionGuideModalProps> = ({
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const { isOpen, activePoleId, highlightedCardId, searchQuery, closeGuide, setActivePoleId, setSearchQuery } = useGuideStore();
  const sequencer = useSequencer();
  const lang = sequencer?.lang === 'pt' ? 'pt' : 'fr';
  const isFr = lang === 'fr';

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeGuide();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeGuide]);

  const activePole = useMemo(
    () => GUIDE_POLES.find((p) => p.id === activePoleId) ?? GUIDE_POLES[0],
    [activePoleId]
  );

  const hasSearch = searchQuery.trim().length > 0;
  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activePole.cards;
    return GUIDE_POLES.flatMap((pole) =>
      pole.cards.filter((c) => {
        const hay = `${c.id} ${c.titleFr} ${c.titlePt} ${c.goalFr} ${c.goalPt} ${c.contextFr} ${c.contextPt} ${c.stepsFr.join(' ')} ${c.stepsPt.join(' ')} ${c.tipFr} ${c.tipPt} ${c.shortcut || ''}`.toLowerCase();
        return hay.includes(q);
      })
    );
  }, [searchQuery, activePole]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleStartTour = () => {
    closeGuide();
    useTourStore.getState().startTour();
  };

  const portalRoot = document.getElementById('modal-root') || document.body;
  const isPanoramaActive = !hasSearch && activePole.id === 'panorama';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-testid="action-guide-modal"
      onClick={(e) => { if (e.target === e.currentTarget) closeGuide(); }}
      className="fixed inset-0 z-[100040] bg-[var(--cordel-ink-dark)]/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-3 md:p-5"
    >
      <div className="w-full h-full sm:w-[96vw] sm:max-w-7xl sm:h-[92vh] bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-0 sm:border-[3px] border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] flex flex-col overflow-hidden">
        <GuideHeaderBar
          isFr={isFr}
          isDarkMode={isDarkMode}
          onSetLang={(l) => sequencer?.setLang?.(l)}
          onToggleDarkMode={onToggleDarkMode}
          onStartTour={handleStartTour}
          onClose={closeGuide}
        />

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <GuideSidebarNav
            poles={GUIDE_POLES}
            activePoleId={activePole.id}
            searchQuery={searchQuery}
            isFr={isFr}
            onSelectPole={setActivePoleId}
            onSearchChange={setSearchQuery}
          />

          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col gap-5">
            <div className="border-b-2 border-[var(--cordel-border)] pb-3">
              <div className="flex items-center gap-2">
                {!hasSearch && (
                  <span className="font-mono font-bold text-xs px-2 py-0.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)]">
                    {activePole.id === 'panorama' ? '00' : (isFr ? `PÔLE ${activePole.num}` : `POLO ${activePole.num}`)}
                  </span>
                )}
                <h3 className="font-cactus font-bold text-lg sm:text-xl uppercase text-[var(--cordel-text)]">
                  {hasSearch
                    ? (isFr ? `Résultats de recherche (${filteredCards.length})` : `Resultados da pesquisa (${filteredCards.length})`)
                    : (isFr ? activePole.titleFr : activePole.titlePt)}
                </h3>
              </div>
              {!hasSearch && (
                <p className="text-xs text-[var(--cordel-text-muted)] mt-1">
                  {isFr ? activePole.subtitleFr : activePole.subtitlePt}
                </p>
              )}
            </div>

            {isPanoramaActive ? (
              <GuidePanoramaView isFr={isFr} poles={GUIDE_POLES} onSelectPole={setActivePoleId} />
            ) : filteredCards.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-center text-xs text-[var(--cordel-text-muted)] font-cactus font-bold uppercase">
                {isFr ? 'Aucune fiche-action ne correspond à votre recherche.' : 'Nenhuma ficha corresponde à sua pesquisa.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredCards.map((card) => (
                  <GuideActionCardView
                    key={card.id}
                    card={card}
                    isFr={isFr}
                    isHighlighted={highlightedCardId === card.id}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>,
    portalRoot
  );
};
