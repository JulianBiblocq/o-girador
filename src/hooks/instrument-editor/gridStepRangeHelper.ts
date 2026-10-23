
export function isStepInRange(range: any, cellIsPreRoll: boolean, cellStep: number, preRollCount: number): boolean {
  if (!range) return false;
  const getLinear = (step: number, preRoll: boolean) => preRoll ? step : (preRollCount + step);
  const cellLinear = getLinear(cellStep, Boolean(cellIsPreRoll));
  const startLinear = getLinear(range.start.step, Boolean(range.start.isPreRoll));
  const endLinear = getLinear(range.end.step, Boolean(range.end.isPreRoll));
  return cellLinear >= Math.min(startLinear, endLinear) && cellLinear <= Math.max(startLinear, endLinear);
}
