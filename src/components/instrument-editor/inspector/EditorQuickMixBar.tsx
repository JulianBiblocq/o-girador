import React, { useRef, useEffect, useCallback } from 'react';
import { Volume2 } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { applyRealtimeTrackOrBusFader } from '../../../hooks/audio-sync/realtimeFaderAudioUpdater';
import { faderPositionToDbString, UNITY_GAIN_FADER_POSITION } from '../../../utils/audioMath';
import { PanKnob } from '../../PanKnob';

export interface EditorQuickMixBarProps {
  trackId: number;
  isFr: boolean;
}

export const EditorQuickMixBar: React.FC<EditorQuickMixBarProps> = React.memo(({ trackId, isFr }) => {
  const volumeVal = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === trackId)?.volumeVal ?? UNITY_GAIN_FADER_POSITION, [trackId]));
  const panVal = useSequencerStore(useCallback((s) => {
    const t = s.tracks.find((x) => x.id === trackId);
    return t?.panVal ?? t?.pan ?? 0;
  }, [trackId]));

  const inputRef = useRef<HTMLInputElement>(null);
  const dbLabelRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const currentValRef = useRef<number>(volumeVal);

  const syncVisuals = useCallback((val: number) => {
    currentValRef.current = val;
    if (inputRef.current && inputRef.current.value !== String(val)) {
      inputRef.current.value = String(val);
    }
    if (dbLabelRef.current) {
      dbLabelRef.current.textContent = faderPositionToDbString(val);
    }
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, val / 100))})`;
    }
  }, []);

  useEffect(() => {
    if (!isDraggingRef.current) syncVisuals(volumeVal);
  }, [volumeVal, syncVisuals]);

  const handleResetUnity = useCallback(() => {
    isDraggingRef.current = false;
    syncVisuals(UNITY_GAIN_FADER_POSITION);
    applyRealtimeTrackOrBusFader(trackId, UNITY_GAIN_FADER_POSITION, 0.018);
    useSequencerStore.getState().handleTrackVolumeChange(trackId, UNITY_GAIN_FADER_POSITION);
  }, [trackId, syncVisuals]);

  const handlePanChange = useCallback((nextPan: number) => {
    useSequencerStore.getState().handleTrackPanChange(trackId, nextPan);
  }, [trackId]);

  return (
    <div
      data-testid="editor-quick-mix-bar"
      className="flex items-center gap-2.5 bg-[var(--cordel-parchment-bg)] cordel-border-sm px-2.5 py-1.5 w-full min-w-0 box-border select-none"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1" onDoubleClick={handleResetUnity}>
        <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-[var(--cordel-ink-dark)]">
          <span className="flex items-center gap-1 truncate font-cactus uppercase tracking-wider">
            <Volume2 size={12} className="text-[var(--cordel-accent)] shrink-0" />
            <span className="truncate">{isFr ? 'Volume piste' : 'Volume da faixa'}</span>
          </span>
          <span
            ref={dbLabelRef}
            className="font-mono text-[10px] text-[var(--cordel-accent)] tabular-nums shrink-0 cursor-pointer"
            title={isFr ? 'Double-clic : réinitialiser à 0.0 dB' : 'Duplo clique: redefinir para 0.0 dB'}
          >
            {faderPositionToDbString(volumeVal)}
          </span>
        </div>
        <div className="relative h-2 w-full bg-[var(--cordel-ink-dark)]/15 rounded-xs overflow-hidden flex items-center">
          <div
            ref={fillRef}
            className="absolute inset-0 bg-[var(--cordel-accent)] origin-left pointer-events-none"
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, volumeVal / 100))})` }}
          />
          <input
            ref={inputRef}
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={volumeVal}
            aria-label={isFr ? 'Volume de la piste' : 'Volume da faixa'}
            onPointerDown={() => { isDraggingRef.current = true; }}
            onInput={(e) => {
              const val = Number(e.currentTarget.value);
              syncVisuals(val);
              applyRealtimeTrackOrBusFader(trackId, val, 0.018);
            }}
            onPointerUp={() => {
              isDraggingRef.current = false;
              useSequencerStore.getState().handleTrackVolumeChange(trackId, currentValRef.current);
            }}
            onChange={(e) => {
              if (!isDraggingRef.current) {
                const val = Number(e.target.value);
                syncVisuals(val);
                applyRealtimeTrackOrBusFader(trackId, val, 0.018);
                useSequencerStore.getState().handleTrackVolumeChange(trackId, val);
              }
            }}
            className="relative z-10 w-full h-full opacity-0 cursor-pointer m-0"
          />
        </div>
      </div>

      <div className="pl-2 border-l border-[var(--cordel-ink-dark)]/20 shrink-0">
        <PanKnob trackId={trackId} value={panVal} onChange={handlePanChange} label="Pan" showLabels={false} />
      </div>
    </div>
  );
});

EditorQuickMixBar.displayName = 'EditorQuickMixBar';
