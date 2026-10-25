/**
 * Helper de suppression groupée de mesures en séquence atomique (< 40 lignes).
 */
import { deleteMeasureState } from './measureOperationsHelper';

export const deleteMeasuresBatchState = (state: any, measureIndices: number[]): Record<string, any> => {
  const sortedDesc = [...new Set(measureIndices)].sort((a, b) => b - a);
  let currentState = state;

  for (const mIdx of sortedDesc) {
    if (currentState.totalMeasures <= 1) break;
    currentState = {
      ...currentState,
      ...deleteMeasureState(currentState, mIdx),
    };
  }

  return currentState;
};
