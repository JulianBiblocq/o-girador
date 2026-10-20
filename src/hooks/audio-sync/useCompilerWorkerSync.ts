import { useState, useRef, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { instrumentsConfig } from '../../data';
import { ActiveInstrumentData } from '../../AudioEngine';
import { getActiveStrokesForTrack } from './strokeNormalization';
import { getAudioEngine } from './audioEngineNodes';

export interface UseCompilerWorkerSyncProps {
  flatCompiledScheduleRef: React.MutableRefObject<Float64Array | null>;
}

export function useCompilerWorkerSync({ flatCompiledScheduleRef }: UseCompilerWorkerSyncProps) {
  const [isCompiling, setIsCompiling] = useState(false);
  const compilerWorkerRef = useRef<Worker | null>(null);
  const lastActiveInstrumentIdsRef = useRef('');

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
        flatCompiledScheduleRef.current = e.data.data;
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
      isolateBaseOnly: !!isolateBaseOnly
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
      const activeInstruments = tracks.map((t: any) => {
        const inst = instrumentsConfig[t.instrumentIdx];
        if (!inst) return null;
        return { id: inst.id, activeStrokes: getActiveStrokesForTrack(t, tracks) };
      }).filter(Boolean) as ActiveInstrumentData[];
      activeInstruments.sort((a, b) => a.id.localeCompare(b.id));
      const activeStr = JSON.stringify(activeInstruments);
      if (activeStr !== lastActiveInstrumentIdsRef.current) {
        lastActiveInstrumentIdsRef.current = activeStr;
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

    const unsubSettings = useSequencerSettingsStore.subscribe((state, prevState) => {
      if (state.forcedStrokes !== prevState.forcedStrokes) {
        scheduleSyncInstruments(useSequencerStore.getState().tracks);
      }
    });

    return () => {
      if (compileTimeout) clearTimeout(compileTimeout);
      unsubSeq();
      unsubTransport();
      unsubSettings();
    };
  }, [compile, triggerCompile]);

  return { isCompiling, triggerCompile };
}
