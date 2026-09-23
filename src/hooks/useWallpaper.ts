import { useState, useEffect, useCallback } from 'react';
import { WallpaperPattern } from '../components/WallpaperCard';

const WALLPAPER_STORAGE_KEY = 'ogirador-wallpaper';
const ALL_WALLPAPER_CLASSES = ['has-wallpaper-none', 'has-wallpaper-rosace', 'has-wallpaper-damas', 'has-wallpaper-gravure'];

export const DEFAULT_WALLPAPER: WallpaperPattern = 'damas';

export function useWallpaper() {
  const [wallpaper, setWallpaperState] = useState<WallpaperPattern>(() => {
    const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (saved === 'none' || saved === 'rosace' || saved === 'damas' || saved === 'gravure') {
      return saved === 'rosace' ? 'gravure' : saved;
    }
    return DEFAULT_WALLPAPER; // Par défaut : Option B (Treillis Maracatu Damassé)
  });

  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  const applyWallpaperToDOM = useCallback((pattern: WallpaperPattern) => {
    ALL_WALLPAPER_CLASSES.forEach((cls) => document.body.classList.remove(cls));
    document.body.classList.add(`has-wallpaper-${pattern}`);
  }, []);

  useEffect(() => {
    applyWallpaperToDOM(wallpaper);
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, wallpaper);
    } catch {
      // Ignore localStorage errors
    }
  }, [wallpaper, applyWallpaperToDOM]);

  const setWallpaper = useCallback((newPattern: WallpaperPattern) => {
    setWallpaperState(newPattern);
  }, []);

  const openWallpaperModal = useCallback(() => {
    setIsWallpaperModalOpen(true);
  }, []);

  const closeWallpaperModal = useCallback(() => {
    setIsWallpaperModalOpen(false);
  }, []);

  return {
    wallpaper,
    setWallpaper,
    isWallpaperModalOpen,
    openWallpaperModal,
    closeWallpaperModal,
  };
}
