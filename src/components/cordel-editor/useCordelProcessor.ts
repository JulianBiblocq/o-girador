
import { useState, useEffect, useRef, useCallback } from 'react';
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../../utils/cordelEffect';

export function useCordelProcessor(frames: string[], bpm: number = 90) {
  const [options, setOptions] = useState<CordelOptions>(defaultCordelOptions);
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [activePlayheadIndex, setActivePlayheadIndex] = useState<number>(0);
  const [overrideMode, setOverrideMode] = useState<'global' | 'local'>('global');
  const [frameOverrides, setFrameOverrides] = useState<Record<number, Partial<CordelOptions>>>({});

  const reprocessRequestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loopPreviewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getEffectiveOptions = useCallback((idx: number, baseOpts = options, overrides = frameOverrides): CordelOptions => ({
    ...baseOpts,
    ...(overrides[idx] || {}),
  }), [options, frameOverrides]);

  useEffect(() => {
    let active = true;
    const initProcessing = async () => {
      if (!frames || frames.length === 0) return;
      setIsProcessing(true);
      try {
        const rendered: string[] = [];
        for (let i = 0; i < frames.length; i++) {
          const eff = getEffectiveOptions(i, options, frameOverrides);
          const base64 = await processCordelEffectBase64(frames[i], eff, 200);
          rendered.push(base64);
        }
        if (active) {
          setPreviewFrames(rendered);
          setSelectedFrameIndex(0);
          setActivePlayheadIndex(0);
        }
      } catch (err) {
        console.error('[CordelImageEditor] Erreur traitement initial:', err);
      } finally {
        if (active) setIsProcessing(false);
      }
    };
    initProcessing();
    return () => {
      active = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
    };
  }, [frames]);

  const applyCordelProcessing = useCallback((targetMode: 'global' | 'local', targetIdx: number, globalOpts: CordelOptions, overrides: Record<number, Partial<CordelOptions>>) => {
    const reqId = ++reprocessRequestIdRef.current;
    if (!frames || frames.length === 0) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setIsProcessing(true);
      try {
        if (targetMode === 'local') {
          if (!frames[targetIdx]) return;
          const eff = getEffectiveOptions(targetIdx, globalOpts, overrides);
          const cordelized = await processCordelEffectBase64(frames[targetIdx], eff, 200);
          if (reqId !== reprocessRequestIdRef.current) return;
          setPreviewFrames(prev => { const next = [...prev]; next[targetIdx] = cordelized; return next; });
        } else {
          const effActive = getEffectiveOptions(targetIdx, globalOpts, overrides);
          const renderedActive = await processCordelEffectBase64(frames[targetIdx], effActive, 200);
          if (reqId !== reprocessRequestIdRef.current) return;
          setPreviewFrames(prev => { const next = [...prev]; next[targetIdx] = renderedActive; return next; });

          for (let i = 0; i < frames.length; i++) {
            if (i === targetIdx) continue;
            if (reqId !== reprocessRequestIdRef.current) return;
            const effOther = getEffectiveOptions(i, globalOpts, overrides);
            const renderedOther = await processCordelEffectBase64(frames[i], effOther, 200);
            if (reqId !== reprocessRequestIdRef.current) return;
            setPreviewFrames(prev => { const next = [...prev]; next[i] = renderedOther; return next; });
          }
        }
      } catch (err) {
        console.error('[CordelImageEditor] Erreur recalcul:', err);
      } finally {
        if (reqId === reprocessRequestIdRef.current) setIsProcessing(false);
      }
    }, 50);
  }, [frames, getEffectiveOptions]);

  useEffect(() => {
    if (isPlaying && previewFrames.length > 1) {
      const intervalMs = (60 / Math.max(30, bpm || 90)) * 1000;
      loopPreviewTimerRef.current = setInterval(() => {
        setActivePlayheadIndex((prev) => (prev + 1) % previewFrames.length);
      }, intervalMs);
      return () => { if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current); };
    } else {
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
    }
  }, [isPlaying, previewFrames.length, bpm]);

  return {
    options,
    setOptions,
    previewFrames,
    isProcessing,
    setIsProcessing,
    isPlaying,
    setIsPlaying,
    selectedFrameIndex,
    setSelectedFrameIndex,
    activePlayheadIndex,
    overrideMode,
    setOverrideMode,
    frameOverrides,
    setFrameOverrides,
    getEffectiveOptions,
    applyCordelProcessing,
  };
}
