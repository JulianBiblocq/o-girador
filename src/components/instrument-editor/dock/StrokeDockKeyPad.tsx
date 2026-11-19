/**
 * StrokeDockKeyPad.tsx — Touche unitaire Cordel à accès direct (1 clic + pré-écoute audio, 0 hex en dur) (< 100 lignes).
 */
import React, { useCallback } from 'react';
import * as Tone from 'tone';
import { getVisualStrokeSymbol, isDarkText } from '../../../data';
import { audioEngine } from '../../../hooks/useAudioSync';
import { applyCordelInkedPatina } from '../../../utils/colorHelpers';
import { getStrokeDescription } from '../../touch-stroke/getStrokeDescription';

export type DockKeyVariant = 'strong' | 'weak' | 'single' | 'tall' | 'barulhoMain' | 'barulhoMini';

interface StrokeDockKeyPadProps {
  trackId: number;
  instrument: { id: string; type: string; colors: Record<string, string>; color?: string };
  symbol: string;
  customTitle?: string;
  variant: DockKeyVariant;
  isSelected: boolean;
  isLeftHanded: boolean;
  isFr: boolean;
  onSelectTool: (tool: string) => void;
}

const VARIANT_SIZE: Record<DockKeyVariant, string> = {
  strong: 'w-12 h-[26px] px-1 text-xs font-extrabold border-[1.5px]',
  weak: 'w-12 h-[26px] px-1 text-xs font-extrabold border-[1.5px]',
  single: 'w-12 h-[26px] px-1 text-xs font-extrabold border-[1.5px]',
  tall: 'min-w-[34px] sm:min-w-[38px] h-[49px] px-1.5 text-xs font-extrabold border-[1.5px]',
  barulhoMain: 'w-full h-[23px] px-1 text-xs font-extrabold border-[1.5px]',
  barulhoMini: 'min-w-[21px] flex-1 h-[23px] px-0.5 text-[10px] font-bold border',
};

export const StrokeDockKeyPad: React.FC<StrokeDockKeyPadProps> = React.memo(({
  trackId, instrument, symbol, customTitle, variant, isSelected, isLeftHanded, isFr, onSelectTool,
}) => {
  const visualSymbol = String(getVisualStrokeSymbol(symbol, isLeftHanded, instrument.id));
  const rawCol = instrument.colors?.[symbol] || instrument.colors?.[visualSymbol] || instrument.color || '';
  const bgCol = rawCol ? applyCordelInkedPatina(rawCol) : 'var(--cordel-parchment-panel)';
  const isDark = isDarkText(instrument.id, symbol, rawCol ? bgCol : undefined);
  const txtCol = isDark ? 'var(--cordel-ink-dark)' : 'var(--cordel-on-accent)';

  const handleClick = useCallback(() => {
    onSelectTool(symbol);
    if (audioEngine && symbol && symbol !== '0') {
      try {
        const vel = variant === 'weak' || variant === 'barulhoMini' ? 0.65 : 0.85;
        audioEngine.playNote(trackId, symbol, Tone.now(), vel, 1.0);
      } catch (_) {}
    }
  }, [onSelectTool, symbol, trackId, variant]);

  const desc = customTitle || getStrokeDescription(instrument.id, instrument.type, visualSymbol, isFr ? 'fr' : 'pt', isLeftHanded);
  const activeCls = isSelected
    ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] -translate-y-[1px] z-10'
    : 'border-[var(--cordel-ink-dark)]/75 shadow-[1px_1px_0px_var(--cordel-ink-dark)] hover:-translate-y-[0.5px]';

  return (
    <button
      type="button"
      data-testid={`dock-stroke-key-${symbol}`}
      data-stroke-symbol={symbol}
      aria-pressed={isSelected}
      onClick={handleClick}
      style={{ backgroundColor: bgCol, color: txtCol }}
      title={`${desc} [${visualSymbol}]`}
      className={`xilo-wood-stamp rounded-none flex items-center justify-center leading-none font-mono cursor-pointer select-none shrink-0 transition-transform active:translate-y-0 active:scale-95 ${VARIANT_SIZE[variant]} ${activeCls}`}
    >
      {visualSymbol}
    </button>
  );
});

StrokeDockKeyPad.displayName = 'StrokeDockKeyPad';
