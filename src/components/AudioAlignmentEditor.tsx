
import React, { useState } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../stores/useSequencerStore';
import { renderTrimmedVocalBuffer, audioBufferToWav } from '../utils/audioBufferUtils';
import { VocalClipMeta } from '../types/store.types';
import { AudioAlignmentEditorProps } from './audio-alignment/audioAlignmentTypes';
import { calculateAlignmentMetrics } from './audio-alignment/audioAlignmentCalculations';
import { useAudioAlignmentEditorState } from './audio-alignment/useAudioAlignmentEditorState';
import { AudioAlignmentHeaderToolbar } from './audio-alignment/AudioAlignmentHeaderToolbar';
import { AudioAlignmentBoard } from './audio-alignment/AudioAlignmentBoard';
import { AudioAlignmentControls } from './audio-alignment/AudioAlignmentControls';
import { AudioAlignmentFooter } from './audio-alignment/AudioAlignmentFooter';

export const AudioAlignmentEditor: React.FC<AudioAlignmentEditorProps> = (props) => {
  const {
    audioBuffer, pattern, bpm, measureBpms, measureTimeSigs, preRollDurationSec,
    initialTrimStartSec, initialTrimEndSec, initialNudgeMs = 0, isImported = false,
    targetMeasureIdx, initialSampleBpm, onSave, onCancel,
  } = props;

  const lang = useSequencerStore((state) => state.lang);
  const metrics = calculateAlignmentMetrics({ targetMeasureIdx, bpm, measureBpms, measureTimeSigs, pattern, preRollDurationSec });
  const [isProcessing, setIsProcessing] = useState(false);

  const state = useAudioAlignmentEditorState({
    audioBuffer, pattern, metrics, initialTrimStartSec, initialTrimEndSec,
    initialNudgeMs, initialSampleBpm, isImported, lang,
  });

  const handleValidate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    state.preview.killSwitch();
    if (state.preview.savedLoopStateRef.current) {
      useSequencerStore.setState({ ...state.preview.savedLoopStateRef.current });
      Tone.Transport.loop = state.preview.savedLoopStateRef.current.isLooping;
      state.preview.savedLoopStateRef.current = null;
    }
    try {
      const cleanBuffer = await renderTrimmedVocalBuffer(audioBuffer, state.trimStartSec, state.trimEndSec, 0.010, 0.030);
      const wavBlob = audioBufferToWav(cleanBuffer);
      const startOffsetSec = state.drag.calculateStartOffsetSec(state.waveBaseXRef.current, state.trimStartSec);
      const anacrusisSec = startOffsetSec < 0 ? Math.abs(startOffsetSec) : 0;
      const anacrusisBeats = anacrusisSec / metrics.beatDurationSec;
      const validatedSampleBpm = (typeof state.sampleBpm === 'number' && state.sampleBpm > 20 && Number.isFinite(state.sampleBpm))
        ? Math.round(state.sampleBpm * 10) / 10 : metrics.anchorBpm;

      const meta: VocalClipMeta = {
        patternId: pattern.id, sampleBpm: validatedSampleBpm, baseBpm: validatedSampleBpm,
        trimStartSec: 0, trimEndSec: cleanBuffer.duration, nudgeMs: state.nudgeMsRef.current,
        anacrusisBeats, anacrusisSec, startOffsetSec, offsetStart: 0,
        startTimeDelay: state.nudgeMsRef.current / 1000, bpmSync: true,
        offsetEnd: cleanBuffer.duration, updatedAt: Date.now(),
      };
      onSave(cleanBuffer, wavBlob, meta);
    } catch (err) {
      console.error('Erreur lors du rendu du buffer vocal :', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none font-mono">
      <AudioAlignmentHeaderToolbar
        patternName={pattern.name} lang={lang} anacrusisBadgeRef={state.anacrusisBadgeRef}
        sampleBpm={state.sampleBpm} setSampleBpm={state.setSampleBpm} anchorBpm={metrics.anchorBpm}
        pixelsPerSecond={state.pixelsPerSecond} handleZoomOut={state.drag.handleZoomOut}
        handleZoomIn={state.drag.handleZoomIn} handleResetZoom1x={state.drag.handleResetZoom1x}
        handleFitToWindow={state.drag.handleFitToWindow}
      />
      <AudioAlignmentBoard
        scrollContainerRef={state.scrollContainerRef} totalBoardWidth={state.totalBoardWidth}
        canvasHeight={state.canvasHeight} temps1Px={state.temps1Px} effectiveMeasure={metrics.effectiveMeasure}
        lang={lang} staticGridCanvasRef={state.staticGridCanvasRef} pattern={pattern}
        isCompound={metrics.isCompound} isCompoundPrev={metrics.isCompoundPrev}
        beatsCount={metrics.beatsCount} beatDurationSec={metrics.beatDurationSec}
        pixelsPerSecond={state.pixelsPerSecond} patternMeasures={metrics.patternMeasures}
        waveformContainerRef={state.waveformContainerRef} bufferPxWidth={state.bufferPxWidth}
        waveformCanvasRef={state.waveformCanvasRef} trimOverlayCanvasRef={state.trimOverlayCanvasRef}
        trimStartSec={state.trimStartSec} trimEndSec={state.trimEndSec} handleWheelScroll={state.drag.handleWheelScroll}
        handleWaveformPointerDown={state.drag.handleWaveformPointerDown} handleWaveformPointerMove={state.drag.handleWaveformPointerMove}
        handleWaveformPointerUp={state.drag.handleWaveformPointerUp} handleTrimPointerDown={state.drag.handleTrimPointerDown}
        handleTrimPointerMove={state.drag.handleTrimPointerMove} handleTrimPointerUp={state.drag.handleTrimPointerUp}
      />
      <AudioAlignmentControls
        lang={lang} trimStartSec={state.trimStartSec} setTrimStartSec={state.setTrimStartSec}
        trimEndSec={state.trimEndSec} setTrimEndSec={state.setTrimEndSec} bufferDuration={audioBuffer.duration}
        initialNudgeMs={initialNudgeMs} nudgeValueLabelRef={state.nudgeValueLabelRef}
        handleResetNudge={() => {
          state.nudgeMsRef.current = 0;
          const totalX = state.waveBaseXRef.current;
          state.currentTotalWaveXRef.current = totalX;
          if (state.waveformContainerRef.current) state.waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
          if (state.nudgeValueLabelRef.current) state.nudgeValueLabelRef.current.textContent = '0 ms';
          const input = document.getElementById('vocal-nudge-slider') as HTMLInputElement | null;
          if (input) input.value = '0';
          state.drag.updateLiveTimingBadges(totalX);
        }}
        handleNudgeInput={(e) => {
          const val = parseFloat(e.target.value);
          state.nudgeMsRef.current = val;
          const totalX = state.waveBaseXRef.current + (val / 1000) * state.pixelsPerSecond;
          state.currentTotalWaveXRef.current = totalX;
          if (state.waveformContainerRef.current) state.waveformContainerRef.current.style.transform = `translate3d(${totalX}px, 0, 0)`;
          if (state.nudgeValueLabelRef.current) state.nudgeValueLabelRef.current.textContent = `${val > 0 ? '+' : ''}${val.toFixed(0)} ms`;
          state.drag.updateLiveTimingBadges(totalX);
        }}
      />
      <AudioAlignmentFooter
        isPlayingPreview={state.preview.isPlayingPreview} handleTogglePreview={state.preview.handleTogglePreview}
        onCancel={() => { state.preview.killSwitch(); onCancel(); }}
        handleValidate={handleValidate} isProcessing={isProcessing} lang={lang}
      />
    </div>
  );
};
