export interface LoopHandlersContext {
  pushUndoState: () => void;
  loopStartRef: { current: number | null };
  loopEndRef: { current: number | null };
  setLoopStartMeasure: (updater: number | null | ((prev: number | null) => number | null)) => void;
  setLoopEndMeasure: (updater: number | null | ((prev: number | null) => number | null)) => void;
  setIsLoopRegionActive: (v: boolean) => void;
}

export function createLoopHandlers(ctx: LoopHandlersContext) {
  const { pushUndoState, setLoopStartMeasure, setLoopEndMeasure, setIsLoopRegionActive } = ctx;

  const handleSetLoopStart = (measureIdx: number) => {
    pushUndoState();
    setLoopStartMeasure(measureIdx);
    setIsLoopRegionActive(true);
    if (ctx.loopEndRef.current !== null && measureIdx > ctx.loopEndRef.current) setLoopEndMeasure(measureIdx);
  };

  const handleSetLoopEnd = (measureIdx: number) => {
    pushUndoState();
    setLoopEndMeasure(measureIdx);
    setIsLoopRegionActive(true);
    if (ctx.loopStartRef.current !== null && measureIdx < ctx.loopStartRef.current) setLoopStartMeasure(measureIdx);
  };

  const handleClearLoop = () => {
    setLoopStartMeasure(null);
    setLoopEndMeasure(null);
    setIsLoopRegionActive(false);
  };

  return { handleSetLoopStart, handleSetLoopEnd, handleClearLoop };
}
