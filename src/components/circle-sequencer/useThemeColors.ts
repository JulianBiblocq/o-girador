
import { useRef, useEffect } from 'react';
import { ThemeColors } from './circleSequencerTypes';

export function useThemeColors(): React.MutableRefObject<ThemeColors> {
  const themeRef = useRef<ThemeColors>({
    themeBg: '#f4ecd8',
    themeText: '#1a1a1a',
    themeBorder: '#1a1a1a',
    themeWood: '#8b2a1a',
    skinBg: '#f4ecd8',
    skinInk: '#1a1a1a',
    skinBorder: '#1a1a1a',
    skinWood: '#8b2a1a',
    isDark: false,
  });

  useEffect(() => {
    const updateTheme = () => {
      const doc = document.documentElement;
      const isDark = doc.classList.contains('dark') || doc.getAttribute('data-theme') === 'dark';
      const s = getComputedStyle(doc);
      themeRef.current = {
        themeBg: s.getPropertyValue('--cordel-bg').trim() || '#f4ecd8',
        themeText: s.getPropertyValue('--cordel-text').trim() || '#1a1a1a',
        themeBorder: s.getPropertyValue('--cordel-border').trim() || '#1a1a1a',
        themeWood: s.getPropertyValue('--cordel-wood').trim() || '#8b2a1a',
        skinBg: s.getPropertyValue('--roda-skin-bg').trim() || '#f4ecd8',
        skinInk: s.getPropertyValue('--roda-skin-ink').trim() || '#1a1a1a',
        skinBorder: s.getPropertyValue('--roda-skin-border').trim() || '#1a1a1a',
        skinWood: s.getPropertyValue('--roda-skin-wood').trim() || '#8b2a1a',
        isDark,
      };
    };
    updateTheme();

    const obs = new MutationObserver((muts) => {
      if (muts.some(m => m.attributeName === 'data-theme' || m.attributeName === 'class')) updateTheme();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => obs.disconnect();
  }, []);

  return themeRef;
}
