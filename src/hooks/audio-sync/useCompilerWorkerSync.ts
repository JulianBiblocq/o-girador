import { useState, useRef, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useWizardStore } from '../../stores/useWizardStore';
import { instrumentsConfig } from '../../data';
import { extractActiveInstrumentsFromTracks } from '../../audio/engine/activeTrackPreloadExtractor';
import { rebuildWorkletHorizonFromNow } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { attachCompiledTrackIds } from '../../workers/compiler/compiledTrackIdResolver';
import { getAudioEngine } from './audioEngineNodes';

export interface UseCompilerWorkerSyncProps {
  flatCompiledScheduleRef: React.MutableRefObject<Float64Array | null>;
}

export function useCompilerWorkerSync({ flatCompiledScheduleRef }: UseCompilerWorkerSyncProps) {
  const [isCompiling, setIsCompiling] = useState(false);
  const compilerWorkerRef = useRef<Worker | null>(null);
  const lastActiveInstrumentSigRef = useRef('');

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/audioCompiler.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      if (!e.data.success) {
        setIsCompiling(false);
        return;
      }
      if (e.data.action === 'compileSong') {
        setIsCompiling(false);
        if (Array.isArray(e.data.compiledTrackIds)) {
          attachCompiledTrackIds(e.data.data, e.data.compiledTrackIds);
        }
        flatCompiledScheduleRef.current = e.data.data;
        rebuildWorkletHorizonFromNow('edit');
      }
    };

    compilerWorkerRef.current = worker;
    return () => {
      if (compilerWorkerRef.current) {
        compilerWorkerRef.current.terminate();
        compilerWorkerRef.current = null;
        setIsCompiling(false);
      }
    };
  }, [flatCompiledScheduleRef]);

  const compile = useCallback((stateTracks: any, totalM: number, mTimeSigs: any, soloId: number | null, soloVarId: string | null) => {
    const worker = compilerWorkerRef.current;
    if (!worker) return;
    setIsCompiling(true);
    const isolateBaseOnly = useSequencerStore.getState().isolateBaseOnly;
    worker.postMessage({
      action: 'compileSong',
      tracks: stateTracks,
      totalMeasures: totalM,
      measureTimeSigs: mTimeSigs,
      instConfig: instrumentsConfig,
      soloPatternPlayId: soloId,
      soloPatternVariationId: soloVarId,
      isolateBaseOnly: !!isolateBaseOnly,
    });
  }, []);

  const triggerCompile = useCallback(() => {
    const st = useSequencerStore.getState();
    const tp = useTransportStore.getState();
    compile(st.tracks, st.totalMeasures, st.measureTimeSigs, tp.soloPatternPlayId, tp.soloPatternVariationId);
  }, [compile]);

  useEffect(() => {
    let lastSoloPatternPlayId = useTransportStore.getState().soloPatternPlayId;
    let lastSoloPatternVariationId = useTransportStore.getState().soloPatternVariationId;
    triggerCompile();

    const scheduleSyncInstruments = (tracks: any[]) => {
      const activeEngine = getAudioEngine();
      if (!activeEngine) return;
      const activeInstruments = extractActiveInstrumentsFromTracks(tracks);
      const presentIdsSig = activeInstruments.map((a) => a.id).join(',');
      if (presentIdsSig !== lastActiveInstrumentSigRef.current) {
        lastActiveInstrumentSigRef.current = presentIdsSig;
        activeEngine.syncActiveInstrumentsMemory(activeInstruments).catch(() => {});
      }
    };

    let compileTimeout: any = null;
    const unsubSeq = useSequencerStore.subscribe((state, prevState) => {
      if (state.tracksVersion !== prevState.tracksVersion) {
        if (compileTimeout) clearTimeout(compileTimeout);
        compileTimeout = setTimeout(() => {
          compile(state.tracks, state.totalMeasures, state.measureTimeSigs, lastSoloPatternPlayId, lastSoloPatternVariationId);
        }, 16);
      }
      if (state.tracks !== prevState.tracks) {
        scheduleSyncInstruments(state.tracks);
      }
    });

    const unsubTransport = useTransportStore.subscribe((state) => {
      if (state.soloPatternPlayId !== lastSoloPatternPlayId || state.soloPatternVariationId !== lastSoloPatternVariationId) {
        lastSoloPatternPlayId = state.soloPatternPlayId;
        lastSoloPatternVariationId = state.soloPatternVariationId;
        triggerCompile();
      }
    });

    const unsubWizard = useWizardStore.subscribe((state, prevState) => {
      if (state.isWizardOpen !== prevState.isWizardOpen || state.placedInstruments !== prevState.placedInstruments) {
        scheduleSyncInstruments(useSequencerStore.getState().tracks);
      }
    });

    return () => {
      if (compileTimeout) clearTimeout(compileTimeout);
      unsubSeq();
      unsubTransport();
      unsubWizard();
    };
  }, [compile, triggerCompile]);

  return { isCompiling, triggerCompile };
}
