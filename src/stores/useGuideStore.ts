import { create } from 'zustand';
import { GuidePoleId } from '../data/guide/guideTypes';

interface GuideStoreState {
  isOpen: boolean;
  activePoleId: GuidePoleId;
  highlightedCardId: string | null;
  searchQuery: string;
  openGuide: (poleId?: GuidePoleId, cardId?: string | null) => void;
  closeGuide: () => void;
  setActivePoleId: (poleId: GuidePoleId) => void;
  setSearchQuery: (q: string) => void;
}

function inferPoleFromCardId(cardId: string | null): GuidePoleId {
  if (!cardId) return 'panorama';
  const m = /^p([1-5])-/i.exec(cardId.trim());
  return m ? (`pole-${m[1]}` as GuidePoleId) : 'panorama';
}

function checkInitialGuideUrl(): { open: boolean; poleId: GuidePoleId; cardId: string | null } {
  if (typeof window === 'undefined') return { open: false, poleId: 'panorama', cardId: null };
  try {
    const g = new URLSearchParams(window.location.search).get('guide');
    if (!g) return { open: false, poleId: 'panorama', cardId: null };
    const cardId = g !== '1' && g !== 'true' && g !== 'panorama' ? g : null;
    return { open: true, poleId: inferPoleFromCardId(cardId), cardId };
  } catch {
    return { open: false, poleId: 'panorama', cardId: null };
  }
}

const init = checkInitialGuideUrl();

export const useGuideStore = create<GuideStoreState>((set) => ({
  isOpen: init.open,
  activePoleId: init.poleId,
  highlightedCardId: init.cardId,
  searchQuery: '',

  openGuide: (poleId, cardId = null) =>
    set(() => ({
      isOpen: true,
      activePoleId: poleId ?? (cardId ? inferPoleFromCardId(cardId) : 'panorama'),
      highlightedCardId: cardId,
    })),

  closeGuide: () => {
    if (typeof window !== 'undefined' && window.location.search.includes('guide=')) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('guide');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch {}
    }
    set({ isOpen: false, highlightedCardId: null });
  },

  setActivePoleId: (activePoleId) => set({ activePoleId, highlightedCardId: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
