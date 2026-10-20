export function handleTrackStepKeyDownHelper(
  _trackId: number,
  _patternId: number,
  _stepIdx: number,
  key: string,
  currentWord: string,
  targetInputEl: HTMLInputElement
): void {
  const cardGrid = targetInputEl?.closest?.('.step-boxes');
  if (!cardGrid) return;
  const inputs = Array.from(cardGrid.querySelectorAll('input'));
  const indexInGrid = inputs.indexOf(targetInputEl);

  if (key === 'Backspace' && currentWord === '' && indexInGrid > 0) {
    const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
    prevEl.focus();
    prevEl.select();
  } else if ((key === 'ArrowRight' || key === 'Tab' || key === 'Enter') && indexInGrid < inputs.length - 1) {
    const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
    nextEl.focus();
    nextEl.select();
  } else if (key === 'ArrowLeft' && indexInGrid > 0) {
    const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
    prevEl.focus();
    prevEl.select();
  } else if (
    ['d', 'D', 'p', 'P', 't', 'T', 'g', 'G', 'a', 'A', 'r', 'R', 'e', 'E', 'x', 'X', 'f', 'F', 'i', 'I', 's', 'S', 'c', 'C', 'w', 'W'].includes(key) &&
    indexInGrid < inputs.length - 1
  ) {
    setTimeout(() => {
      const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
      nextEl?.focus();
      nextEl?.select();
    }, 10);
  }
}
