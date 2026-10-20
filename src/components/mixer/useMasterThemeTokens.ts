import { useEffect } from 'react';
import { getMixerTheme } from '../../theme';

export function useMasterThemeTokens(masterContainerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const applyThemeTokens = () => {
      const el = masterContainerRef.current;
      if (!el) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const mode = isLight ? 'light' : 'dark';
      const theme = getMixerTheme('maracatu');
      el.style.setProperty('--master-header-bg', theme.master.headerBg[mode]);
      el.style.setProperty('--master-header-text', theme.master.headerText[mode]);
      el.style.setProperty('--master-border', theme.master.border[mode]);
      el.style.setProperty('--master-fader-thumb', theme.master.faderThumb[mode]);
      el.style.setProperty('--master-comp-bg', theme.master.compressorBg[mode]);
      el.style.setProperty('--comp-color', theme.master.compressorColor || '#d4af37');
      el.style.setProperty('--eq-low-color', theme.eq.low.color);
      el.style.setProperty('--eq-mid-color', theme.eq.mid.color);
      el.style.setProperty('--eq-high-color', theme.eq.high.color);
      el.style.setProperty('--reverb-color', theme.effects.reverb.accentColor);
      el.style.setProperty('--disto-color', theme.effects.distortion.accentColor);
    };

    applyThemeTokens();
    const observer = new MutationObserver(() => applyThemeTokens());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [masterContainerRef]);
}
