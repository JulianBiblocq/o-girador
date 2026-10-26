
import React, { useMemo, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { getStrokePairs } from '../../utils/instrumentStrokes';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { X } from 'lucide-react';
import { PatternInspectorHeader } from './PatternInspectorHeader';
import { useStrokeInspectorStats } from './inspector/useStrokeInspectorStats';
import { StrokeToolInspector } from './inspector/StrokeToolInspector';
import { VocalClipInspectorSection } from './inspector/VocalClipInspectorSection';
import { InspectorTuningAndTranspose } from './inspector/InspectorTuningAndTranspose';
import { StrokeInspectorPanelProps } from './inspector/strokeInspectorProps';

export type { StrokeInspectorPanelProps };

export const StrokeInspectorPanel: React.FC<StrokeInspectorPanelProps> = React.memo((props) => {
  const {
    trackId, instrument, lang, isLeftHanded, activeTool, patternId, onCloseMobileDrawer,
    isMobileDrawer = false, patterns, canPaste = false, balancoPresets = [], onSelectPattern,
    onAddPattern, onCopyPattern, onPastePattern, onSavePattern, onLoadPattern, onDeletePattern,
    onBalancoChange, isVoice: isVoiceProp, hasVocalRecording = false, onOpenAlignment, onImportAudio,
  } = props;

  const isFr = lang === 'fr';
  const isEraser = activeTool === '0' || activeTool === '';
  const isScissors = activeTool === 'scissors';
  const isVoice = isVoiceProp ?? (instrument?.type === 'voice' || instrument?.id === 'puxador' || instrument?.id === 'coro');
  const getInstrumentLabel = useInstrumentLabel();

  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const vocalTransposeSteps = useSequencerStore(state => state.vocalTransposeSteps);
  const effectivePatterns = patterns || track?.patterns || [];
  const pitchOffset = track?.tuning || 0;

  const isTunableDrum = useMemo(() => {
    const id = instrument?.id?.toLowerCase() || '';
    const type = instrument?.type?.toLowerCase() || '';
    return ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'].includes(id) || type === 'alfaia' || type === 'caixa';
  }, [instrument?.id, instrument?.type]);

  const handleTranspose = useCallback((semitones: number) => {
    const currentPatternId = patternId || track?.selectedPatternId || track?.patterns?.[0]?.id;
    if (!currentPatternId) return;
    useSequencerStore.getState().transposePatternNotes(trackId, currentPatternId, semitones);
  }, [patternId, track?.selectedPatternId, track?.patterns, trackId]);

  const lastPreviewTimeRef = useRef<number>(0);
  const playThrottledPreview = useCallback((symbol: string, volumePct: number, decayPct: number) => {
    const now = performance.now();
    if (now - lastPreviewTimeRef.current < 50) return;
    lastPreviewTimeRef.current = now;
    try {
      if (!audioEngine) return;
      const targetId = track ? track.id : (instrument?.id || trackId);
      const t = Tone.now() || audioEngine.getCurrentTime();
      audioEngine.playNote(targetId, symbol, t, volumePct / 100, decayPct / 100);
    } catch (_) {}
  }, [trackId, track, instrument?.id]);

  const handlePreviewDrum = useCallback(() => {
    if (!audioEngine) return;
    const instId = instrument.id;
    const strokeSymbol = instId === 'timbal' ? 'A' : 'D';
    audioEngine.playPreview(instId, strokeSymbol, track?.tuning || 0, 1.0, undefined, 1.0, track?.id ?? trackId);
  }, [audioEngine, instrument.id, track?.tuning, track?.id, trackId]);

  const pairs = useMemo(() => getStrokePairs(instrument.id, instrument.type, lang, isLeftHanded), [instrument.id, instrument.type, lang, isLeftHanded]);
  const currentPair = useMemo(() => pairs.find(p => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some(s => s.symbol === activeTool)), [pairs, activeTool]);
  const { getStrokeStats, applyMacroVolumeDelta, applyMacroDecayDelta } = useStrokeInspectorStats(trackId, isVoice);

  return (
    <div className={`flex flex-col gap-2.5 p-3 sm:px-4 sm:py-3 overflow-y-auto overflow-x-hidden max-h-full w-full min-w-0 box-border ${isMobileDrawer ? '' : 'bg-[var(--cordel-parchment-surface)]'}`}>
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-1 border-b border-[var(--cordel-border)]/20">
          <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-ink-dark)]">
            {isFr ? "Inspecteur de l'instrument" : 'Inspetor do instrumento'}
          </span>
          <button type="button" onClick={onCloseMobileDrawer} className="p-1 hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] rounded text-[var(--cordel-ink-dark)] transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      <PatternInspectorHeader
        trackId={trackId} instrumentName={getInstrumentLabel({ id: instrument.id, customName: instrument.name })}
        patterns={effectivePatterns} currentPatternId={patternId || track?.selectedPatternId || track?.patterns?.[0]?.id}
        canPaste={canPaste} lang={lang} balancoPresets={balancoPresets} isVoice={isVoice}
        onSelectPattern={onSelectPattern} onAddPattern={onAddPattern} onCopyPattern={onCopyPattern}
        onPastePattern={onPastePattern} onSavePattern={onSavePattern} onLoadPattern={onLoadPattern}
        onDeletePattern={onDeletePattern} onBalancoChange={onBalancoChange}
      />

      {isVoice && hasVocalRecording ? (
        <VocalClipInspectorSection isFr={isFr} hasVocalRecording={hasVocalRecording} onOpenAlignment={onOpenAlignment} onImportAudio={onImportAudio} />
      ) : (
        <StrokeToolInspector
          isEraser={isEraser} isScissors={isScissors} isFr={isFr} activeTool={activeTool}
          currentPair={currentPair} instrument={instrument} trackId={trackId} isVoice={isVoice}
          getStrokeStats={getStrokeStats} playThrottledPreview={playThrottledPreview}
          applyMacroVolumeDelta={applyMacroVolumeDelta} applyMacroDecayDelta={applyMacroDecayDelta}
        />
      )}

      <InspectorTuningAndTranspose
        isVoice={isVoice} isTunableDrum={isTunableDrum} pitchOffset={pitchOffset}
        vocalTransposeSteps={vocalTransposeSteps} lang={lang} trackId={trackId}
        onTranspose={handleTranspose} onPreviewDrum={handlePreviewDrum}
      />
    </div>
  );
});

StrokeInspectorPanel.displayName = 'StrokeInspectorPanel';
