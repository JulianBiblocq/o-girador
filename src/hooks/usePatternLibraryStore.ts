import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SavedPattern } from '../types';

interface PatternLibraryState {
  patterns: SavedPattern[];
  savePattern: (pattern: SavedPattern) => void;
  deletePattern: (id: string) => void;
  getPatternsByInstrumentId: (instrumentId: string) => SavedPattern[];
}

export const usePatternLibraryStore = create<PatternLibraryState>()(
  persist(
    (set, get) => ({
      patterns: [],
      
      savePattern: (pattern: SavedPattern) => set((state) => {
        const existingIndex = state.patterns.findIndex(p => p.id === pattern.id);
        if (existingIndex >= 0) {
          // Replace existing
          const newPatterns = [...state.patterns];
          newPatterns[existingIndex] = pattern;
          return { patterns: newPatterns };
        }
        // Add new
        return { patterns: [...state.patterns, pattern] };
      }),
      
      deletePattern: (id: string) => set((state) => ({
        patterns: state.patterns.filter(p => p.id !== id)
      })),
      
      getPatternsByInstrumentId: (instrumentId: string) => {
        return get().patterns.filter(p => p.instrumentId === instrumentId);
      }
    }),
    {
      name: 'baquemix-pattern-library',
    }
  )
);
