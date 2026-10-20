import { useState, useRef, useCallback } from 'react';
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../../../utils/cordelEffect';

export function usePhotoBoothReprocess(rawImagesRef: React.RefObject<string[]>) {
  const [cordelOptions, setCordelOptions] = useState<CordelOptions>({
    ...defaultCordelOptions,
    zoom: 120,
    detail: 60,
    shadow: 128,
    brightness: 0,
    threshold: 128,
    sobelContrast: 50,
    bgRemovalMode: 'none',
    isMirror: true,
    isFrame: false,
    woodGrain: 10,
    lockFraming: true,
    posX: 0,
    posY: 0,
  });

  const [processedFrames, setProcessedFrames] = useState<string[]>([]);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [overrideMode, setOverrideMode] = useState<'global' | 'local'>('global');
  const [frameOverrides, setFrameOverrides] = useState<Record<number, Partial<CordelOptions>>>({});

  const reprocessDebounceTimerRef = useRef<any>(null);
  const reprocessRequestIdRef = useRef<number>(0);

  const getEffectiveOptions = useCallback((
    idx: number,
    baseOpts = cordelOptions,
    overrides = frameOverrides
  ): CordelOptions => ({
    ...baseOpts,
    ...(overrides[idx] || {})
  }), [cordelOptions, frameOverrides]);

  const activeInspectorOptions = overrideMode === 'local'
    ? getEffectiveOptions(selectedFrameIndex)
    : cordelOptions;

  const startCordelProcessing = async () => {
    const rawImages = rawImagesRef.current || [];
    const finalFrames: string[] = [];

    for (let i = 0; i < rawImages.length; i++) {
      try {
        const eff = getEffectiveOptions(i);
        const cordelized = await processCordelEffectBase64(rawImages[i], eff, 180);
        finalFrames.push(cordelized);
      } catch (err) {
        console.error('[PhotoBooth] Erreur traitement cordel frame', i, err);
        finalFrames.push(rawImages[i]);
      }
    }

    setProcessedFrames(finalFrames);
    setSelectedFrameIndex(0);
  };

  const applyCordelProcessing = useCallback((
    targetMode: 'global' | 'local',
    targetIdx: number,
    globalOpts: CordelOptions,
    overrides: Record<number, Partial<CordelOptions>>
  ) => {
    const reqId = ++reprocessRequestIdRef.current;
    const rawImages = rawImagesRef.current || [];
    if (!rawImages || rawImages.length === 0) return;

    if (reprocessDebounceTimerRef.current) clearTimeout(reprocessDebounceTimerRef.current);

    reprocessDebounceTimerRef.current = setTimeout(async () => {
      setIsReprocessing(true);
      try {
        if (targetMode === 'local') {
          if (!rawImages[targetIdx]) return;
          const eff = getEffectiveOptions(targetIdx, globalOpts, overrides);
          const cordelized = await processCordelEffectBase64(rawImages[targetIdx], eff, 180);
          if (reqId !== reprocessRequestIdRef.current) return;
          setProcessedFrames((prev) => {
            const next = [...prev];
            next[targetIdx] = cordelized;
            return next;
          });
        } else {
          const effActive = getEffectiveOptions(targetIdx, globalOpts, overrides);
          const renderedActive = await processCordelEffectBase64(rawImages[targetIdx], effActive, 180);
          if (reqId !== reprocessRequestIdRef.current) return;
          setProcessedFrames((prev) => {
            const next = [...prev];
            next[targetIdx] = renderedActive;
            return next;
          });

          for (let i = 0; i < rawImages.length; i++) {
            if (i === targetIdx) continue;
            if (reqId !== reprocessRequestIdRef.current) return;
            const effOther = getEffectiveOptions(i, globalOpts, overrides);
            const renderedOther = await processCordelEffectBase64(rawImages[i], effOther, 180);
            if (reqId !== reprocessRequestIdRef.current) return;
            setProcessedFrames((prev) => {
              const next = [...prev];
              next[i] = renderedOther;
              return next;
            });
          }
        }
      } catch (err) {
        console.error('[PhotoBooth] Erreur lors du recalcul cordel:', err);
      } finally {
        if (reqId === reprocessRequestIdRef.current) setIsReprocessing(false);
      }
    }, 50);
  }, [getEffectiveOptions, rawImagesRef]);

  const handleUpdateCordelOptions = (patch: Partial<CordelOptions>) => {
    if (overrideMode === 'local') {
      const updatedOverrides = {
        ...frameOverrides,
        [selectedFrameIndex]: { ...(frameOverrides[selectedFrameIndex] || {}), ...patch },
      };
      setFrameOverrides(updatedOverrides);
      applyCordelProcessing('local', selectedFrameIndex, cordelOptions, updatedOverrides);
    } else {
      const updatedGlobal = { ...cordelOptions, ...patch };
      setCordelOptions(updatedGlobal);
      applyCordelProcessing('global', selectedFrameIndex, updatedGlobal, frameOverrides);
    }
  };

  const handleResetLocalOverride = () => {
    const nextOverrides = { ...frameOverrides };
    delete nextOverrides[selectedFrameIndex];
    setFrameOverrides(nextOverrides);
    applyCordelProcessing('local', selectedFrameIndex, cordelOptions, nextOverrides);
  };

  return {
    cordelOptions, setCordelOptions, processedFrames, setProcessedFrames, isReprocessing,
    selectedFrameIndex, setSelectedFrameIndex, overrideMode, setOverrideMode, frameOverrides,
    setFrameOverrides, activeInspectorOptions, startCordelProcessing, handleUpdateCordelOptions,
    handleResetLocalOverride, reprocessDebounceTimerRef
  };
}
