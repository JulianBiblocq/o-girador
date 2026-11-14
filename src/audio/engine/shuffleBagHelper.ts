/**
 * shuffleBagHelper.ts — Sac de tirage Fisher-Yates (Shuffle-Bag) sans répétition aux frontières (< 95 lignes).
 * - Joue 100 % des prises du pool avant rebouclage.
 * - Interdit que les 2 premiers tirages d'un nouveau sac répètent l'un des 2 derniers du sac précédent (pour N >= 4).
 * - Permute à la volée avec une prise libre du sac en cas de collision inter-pistes dans la fenêtre +-30 ms.
 */

export interface ShuffleBagState {
  bag: number[];
  cursor: number;
  lastTwo: [number, number];
}

export function createShuffleBagState(): ShuffleBagState {
  return { bag: [], cursor: 0, lastTwo: [-1, -1] };
}

function refillFisherYatesBag(state: ShuffleBagState, numFiles: number): void {
  const bag = Array.from({ length: numFiles }, (_, i) => i);
  for (let i = numFiles - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
  }

  const [prev2, prev1] = state.lastTwo;
  if (numFiles >= 4 && prev1 >= 0) {
    const isPrev = (v: number) => v === prev1 || v === prev2;
    if (isPrev(bag[0])) {
      for (let k = 2; k < numFiles; k++) {
        if (!isPrev(bag[k])) { const t = bag[0]; bag[0] = bag[k]; bag[k] = t; break; }
      }
    }
    if (isPrev(bag[1])) {
      for (let k = 2; k < numFiles; k++) {
        if (!isPrev(bag[k])) { const t = bag[1]; bag[1] = bag[k]; bag[k] = t; break; }
      }
    }
  } else if (numFiles >= 2 && prev1 >= 0 && bag[0] === prev1) {
    const t = bag[0]; bag[0] = bag[1]; bag[1] = t;
  }

  state.bag = bag;
  state.cursor = 0;
}

export function drawFromShuffleBag(
  state: ShuffleBagState,
  numFiles: number,
  forbiddenIndices: Set<number>
): number {
  if (numFiles <= 1) return 0;
  if (state.bag.length !== numFiles || state.cursor >= numFiles) {
    refillFisherYatesBag(state, numFiles);
  }

  const cur = state.cursor;
  let chosen = state.bag[cur];

  if (forbiddenIndices.size > 0 && forbiddenIndices.has(chosen)) {
    let swapIdx = -1;
    for (let j = cur + 1; j < numFiles; j++) {
      const cand = state.bag[j];
      if (!forbiddenIndices.has(cand)) { swapIdx = j; break; }
    }
    if (swapIdx >= 0) {
      state.bag[cur] = state.bag[swapIdx];
      state.bag[swapIdx] = chosen;
      chosen = state.bag[cur];
    } else {
      for (let k = 0; k < numFiles; k++) {
        if (!forbiddenIndices.has(k) && k !== state.lastTwo[1]) { chosen = k; break; }
      }
      if (forbiddenIndices.has(chosen)) {
        for (let k = 0; k < numFiles; k++) {
          if (!forbiddenIndices.has(k)) { chosen = k; break; }
        }
      }
    }
  }

  state.cursor = cur + 1;
  state.lastTwo = [state.lastTwo[1], chosen];
  return chosen;
}
