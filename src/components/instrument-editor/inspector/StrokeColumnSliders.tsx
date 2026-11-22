import React, { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { Volume2, Clock } from 'lucide-react';
import { audioEngine } from '../../../hooks/useAudioSync';
import { isDarkText } from '../../../data';
import { applyCordelInkedPatina } from '../../../utils/colorHelpers';
import { StudioRangeSlider } from '../../ui/StudioRangeSlider';
import { StrokeMidiAndKeyBadge } from './StrokeMidiAndKeyBadge';
import { NOMINAL_STEP_VOLUME, getDefaultStrokeDecay, getMinStrokeDecay } from './strokeInspectorScope';

export interface StrokeColumnSlidersProps {
  symbol: string;
  shortcut?: string;
  label: string;
  isWeak: boolean;
  instrument: any;
  trackId: number;
  trackLabel?: string;
  patternId?: number;
  patternLabel?: string;
  activeTool?: string;
  isVoice: boolean;
  isFr: boolean;
  stats: { avgVolume: number; avgDecay: number };
  playThrottledPreview: (symbol: string, volumePct: number, decayPct: number, force?: boolean) => void;
  applyMacroVolumeDelta: (stroke: string, delta: number, targetVal: number, options?: { skipUndo?: boolean }) => void;
  applyMacroDecayDelta: (stroke: string, delta: number, targetVal: number, options?: { skipUndo?: boolean }) => void;
}

export const StrokeColumnSliders: React.FC<StrokeColumnSlidersProps> = React.memo((props) => {
  const {
    symbol, shortcut, label, isWeak, instrument, trackId, trackLabel, patternId, patternLabel,
    activeTool, isVoice, isFr, stats, playThrottledPreview, applyMacroVolumeDelta, applyMacroDecayDelta,
  } = props;

  const bgCol = applyCordelInkedPatina(instrument?.colors?.[symbol] || instrument?.color || '');
  const txtCol = isDarkText(instrument?.id, symbol, bgCol) ? 'var(--cordel-ink-dark)' : 'var(--cordel-on-accent)';
  const currentVolRef = useRef<number>(stats.avgVolume);
  const currentDecayRef = useRef<number>(stats.avgDecay);
  const minDecay = getMinStrokeDecay(isVoice);
  const defaultDecay = getDefaultStrokeDecay(isVoice);

  useEffect(() => { currentVolRef.current = stats.avgVolume; }, [stats.avgVolume]);
  useEffect(() => { currentDecayRef.current = stats.avgDecay; }, [stats.avgDecay]);

  const handleVolScrub = useCallback((val: number, isFirstChange: boolean) => {
    currentVolRef.current = val;
    applyMacroVolumeDelta(symbol, val - stats.avgVolume, val, { skipUndo: !isFirstChange });
    playThrottledPreview(symbol, val, currentDecayRef.current);
  }, [symbol, stats.avgVolume, applyMacroVolumeDelta, playThrottledPreview]);

  const handleVolReset = useCallback((resetVal: number) => {
    currentVolRef.current = resetVal;
    applyMacroVolumeDelta(symbol, resetVal - stats.avgVolume, resetVal, { skipUndo: false });
    playThrottledPreview(symbol, resetVal, currentDecayRef.current, true);
  }, [symbol, stats.avgVolume, applyMacroVolumeDelta, playThrottledPreview]);

  const handleDecayScrub = useCallback((val: number, isFirstChange: boolean) => {
    currentDecayRef.current = val;
    applyMacroDecayDelta(symbol, val - stats.avgDecay, val, { skipUndo: !isFirstChange });
    playThrottledPreview(symbol, currentVolRef.current, val);
  }, [symbol, stats.avgDecay, applyMacroDecayDelta, playThrottledPreview]);

  const handleDecayReset = useCallback((resetVal: number) => {
    currentDecayRef.current = resetVal;
    applyMacroDecayDelta(symbol, resetVal - stats.avgDecay, resetVal, { skipUndo: false });
    playThrottledPreview(symbol, currentVolRef.current, resetVal, true);
  }, [symbol, stats.avgDecay, applyMacroDecayDelta, playThrottledPreview]);

  return (
    <div className="flex-1 min-w-0 bg-[var(--cordel-parchment-bg)] cordel-border-sm p-2.5 flex flex-col gap-2 shadow-sm w-full box-border">
      <div className="flex items-center gap-1.5 border-b border-[var(--cordel-ink-dark)]/15 pb-1 w-full min-w-0">
        <div
          onClick={() => {
            if (!audioEngine) return;
            try { audioEngine.playNote(trackId, symbol, Tone.now(), currentVolRef.current / 100, currentDecayRef.current / 100); } catch (_) {}
          }}
          className="xilo-wood-stamp w-6 h-6 rounded-none flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95 transition-transform shrink-0 border border-[var(--cordel-ink-dark)]/40"
          style={{ backgroundColor: bgCol, color: txtCol }}
          title={isFr ? 'Cliquer pour écouter la frappe' : 'Clique para ouvir o toque'}
        >
          {symbol}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-cactus font-bold text-[11px] text-[var(--cordel-ink-dark)] truncate">{label}</span>
          <span className="text-[9px] text-[var(--cordel-text-muted)] font-mono leading-tight truncate">
            {isWeak ? (isFr ? 'Déclinaison' : 'Variação') : (isFr ? 'Coup Fort' : 'Toque Forte')} [{symbol}]
          </span>
        </div>
      </div>

      <StudioRangeSlider
        value={stats.avgVolume} min={0} max={100} resetValue={NOMINAL_STEP_VOLUME}
        accentVar="var(--cordel-param-volume)"
        ariaLabel={`${label} Volume`}
        resetTitle={isFr ? `Double-clic : réinitialiser à ${NOMINAL_STEP_VOLUME}%` : `Duplo clique: redefinir para ${NOMINAL_STEP_VOLUME}%`}
        labelContent={
          <span className="flex items-center gap-1 text-[9px] text-[var(--cordel-text-muted)] truncate">
            <Volume2 size={12} className="text-[var(--cordel-param-volume)] shrink-0" />Volume :
          </span>
        }
        onScrub={handleVolScrub}
        onReset={handleVolReset}
      />

      <StudioRangeSlider
        value={stats.avgDecay} min={minDecay} max={100} step={isVoice ? 5 : 1} resetValue={defaultDecay}
        accentVar="var(--cordel-param-decay)"
        ariaLabel={`${label} ${isVoice ? 'Durée' : 'Decay'}`}
        resetTitle={isFr ? `Double-clic : réinitialiser à ${defaultDecay}%` : `Duplo clique: redefinir para ${defaultDecay}%`}
        labelContent={
          <span className="flex items-center gap-1 text-[9px] text-[var(--cordel-text-muted)] truncate">
            <Clock size={12} className="text-[var(--cordel-param-decay)] shrink-0" />{isVoice ? (isFr ? 'Durée :' : 'Duração :') : 'Decay :'}
          </span>
        }
        onScrub={handleDecayScrub}
        onReset={handleDecayReset}
      />

      {!isVoice && (
        <StrokeMidiAndKeyBadge
          trackId={trackId} instrumentId={instrument?.id || ''} symbol={symbol} shortcut={shortcut}
          isFr={isFr} trackLabel={trackLabel} patternId={patternId} patternLabel={patternLabel} activeTool={activeTool}
        />
      )}
    </div>
  );
});

StrokeColumnSliders.displayName = 'StrokeColumnSliders';
