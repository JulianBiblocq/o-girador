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

function checkInitialGuideUrl(): { open: boolean; cardId: string | null } {
  if (typeof window === 'undefined') return { open: false, cardId: null };
  try {
    const g = new URLSearchParams(window.location.search).get('guide');
    if (!g) return { open: false, cardId: null };
    return { open: true, cardId: g !== '1' && g !== 'true' ? g : null };
  } catch {
    return { open: false, cardId: null };
  }
}

const init = checkInitialGuideUrl();

export const useGuideStore = create<GuideStoreState>((set) => ({
  isOpen: init.open,
  activePoleId: 'pole-1',
  highlightedCardId: init.cardId,
  searchQuery: '',

  openGuide: (poleId, cardId = null) =>
    set((s) => ({
      isOpen: true,
      activePoleId: poleId ?? s.activePoleId,
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
