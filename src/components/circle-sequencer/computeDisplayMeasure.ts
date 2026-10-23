
export function computeDisplayMeasure(
  expanded: any[],
  totalMeasures: number,
  measure: number,
  iteration: number = 1,
  pendingTargetExpandedIndex: number | null = null
): { displayMeasure: number; displayTotal: number } {
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
  let displayMeasure = 1;

  if (pendingTargetExpandedIndex !== null) {
    displayMeasure = pendingTargetExpandedIndex + 1;
  } else {
    const activeRepIndex = expanded.findIndex(
      item => item.baseMeasure === measure && item.iteration === iteration
    );
    displayMeasure = activeRepIndex !== -1 ? activeRepIndex + 1 : measure + 1;
  }

  return { displayMeasure, displayTotal };
}
