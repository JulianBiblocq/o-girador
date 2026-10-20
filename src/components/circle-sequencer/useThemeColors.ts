/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect } from 'react';
import { ThemeColors } from './circleSequencerTypes';

export function useThemeColors(): React.MutableRefObject<ThemeColors> {
  const themeRef = useRef<ThemeColors>({
    themeBg: '#f4ecd8',
    themeText: '#1a1a1a',
    themeBorder: '#1a1a1a',
    themeWood: '#8b2a1a',
  });

  useEffect(() => {
    const updateTheme = () => {
      const s = getComputedStyle(document.documentElement);
      themeRef.current = {
        themeBg: s.getPropertyValue('--cordel-bg').trim() || '#f4ecd8',
        themeText: s.getPropertyValue('--cordel-text').trim() || '#1a1a1a',
        themeBorder: s.getPropertyValue('--cordel-border').trim() || '#1a1a1a',
        themeWood: s.getPropertyValue('--cordel-wood').trim() || '#8b2a1a',
      };
    };
    updateTheme();

    const obs = new MutationObserver((muts) => {
      if (muts.some(m => m.attributeName === 'data-theme')) updateTheme();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return themeRef;
}
