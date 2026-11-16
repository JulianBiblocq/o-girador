import React, { useRef } from 'react';
import * as Tone from 'tone';
import { Volume2, Clock } from 'lucide-react';
import { audioEngine } from '../../../hooks/useAudioSync';
import { isDarkText } from '../../../data';
import { applyCordelInkedPatina } from '../../../utils/colorHelpers';
import { StrokeMidiAndKeyBadge } from './StrokeMidiAndKeyBadge';

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
  playThrottledPreview: (symbol: string, volumePct: number, decayPct: number) => void;
  applyMacroVolumeDelta: (stroke: string, delta: number, targetVal: number) => void;
  applyMacroDecayDelta: (stroke: string, delta: number, targetVal: number) => void;
}

export const StrokeColumnSliders: React.FC<StrokeColumnSlidersProps> = React.memo((props) => {
  const {
    symbol, shortcut, label, isWeak, instrument, trackId, trackLabel, patternId, patternLabel,
    activeTool, isVoice, isFr, stats, playThrottledPreview, applyMacroVolumeDelta, applyMacroDecayDelta,
  } = props;

  const bgCol = applyCordelInkedPatina(instrument.colors?.[symbol] || '#666');
  const txtCol = isDarkText(instrument?.id, symbol, bgCol) ? 'var(--cordel-ink-dark)' : 'var(--cordel-on-accent)';
  const volLabelRef = useRef<HTMLSpanElement>(null);
  const decayLabelRef = useRef<HTMLSpanElement>(null);
  const currentVolRef = useRef<number>(stats.avgVolume);
  const currentDecayRef = useRef<number>(stats.avgDecay);

  return (
    <div className="flex-1 min-w-0 bg-[var(--cordel-parchment-bg)] cordel-border-sm p-2.5 flex flex-col gap-2 shadow-sm w-full box-border">
      <div className="flex items-center gap-1.5 border-b border-[var(--cordel-ink-dark)]/15 pb-1 w-full min-w-0">
        <div
          onClick={() => {
            if (audioEngine) {
              try {
                audioEngine.playNote(trackId, symbol, Tone.now(), currentVolRef.current / 100, currentDecayRef.current / 100);
              } catch (_) {}
            }
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

      <div className="flex flex-col gap-1 w-full min-w-0">
        <div className="flex justify-between items-center text-[10px] font-bold text-[var(--cordel-ink-dark)] w-full min-w-0">
          <span className="flex items-center gap-1 text-[9px] text-[var(--cordel-text-muted)] truncate"><Volume2 size={12} className="text-[var(--cordel-accent-readable)] shrink-0" />Volume :</span>
          <span ref={volLabelRef} className="font-mono text-[var(--cordel-ink-dark)] shrink-0 ml-1">{stats.avgVolume}%</span>
        </div>
        <input
          type="range" min="0" max="100" defaultValue={stats.avgVolume}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            currentVolRef.current = val;
            if (volLabelRef.current) volLabelRef.current.textContent = `${val}%`;
            playThrottledPreview(symbol, val, currentDecayRef.current);
          }}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            applyMacroVolumeDelta(symbol, val - stats.avgVolume, val);
            playThrottledPreview(symbol, val, currentDecayRef.current);
          }}
          className="w-full accent-[var(--cordel-wood)] cursor-pointer h-1.5 bg-[var(--cordel-ink-dark)]/10"
        />
      </div>

      <div className="flex flex-col gap-1 w-full min-w-0">
        <div className="flex justify-between items-center text-[10px] font-bold text-[var(--cordel-ink-dark)] w-full min-w-0">
          <span className="flex items-center gap-1 text-[9px] text-[var(--cordel-text-muted)] truncate">
            <Clock size={12} className="text-[var(--cordel-accent-readable)] shrink-0" />{isVoice ? (isFr ? 'Durée :' : 'Duração :') : 'Decay :'}
          </span>
          <span ref={decayLabelRef} className="font-mono text-[var(--cordel-ink-dark)] shrink-0 ml-1">{stats.avgDecay}%</span>
        </div>
        <input
          type="range" min="10" max="100" defaultValue={stats.avgDecay}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            currentDecayRef.current = val;
            if (decayLabelRef.current) decayLabelRef.current.textContent = `${val}%`;
            playThrottledPreview(symbol, currentVolRef.current, val);
          }}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            applyMacroDecayDelta(symbol, val - stats.avgDecay, val);
            playThrottledPreview(symbol, currentVolRef.current, val);
          }}
          className="w-full accent-[var(--cordel-wood)] cursor-pointer h-1.5 bg-[var(--cordel-ink-dark)]/10"
        />
      </div>

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
