/**
 * 
 * O Girador - Visual Stroke Symbol Helpers for Left-Handed Mirroring
 */

export function getVisualStrokeSymbol(
  symbol: string | number | [string, string],
  isLeftHanded: boolean,
  instId: string
): string | number | [string, string] {
  if (!isLeftHanded) return symbol;
  if (Array.isArray(symbol)) {
    return [
      String(getVisualStrokeSymbol(symbol[0], isLeftHanded, instId)),
      String(getVisualStrokeSymbol(symbol[1], isLeftHanded, instId))
    ] as [string, string];
  }
  if (typeof symbol !== 'string') return symbol;
  const targetInsts = ['marcante', 'meiao', 'repique', 'caixa', 'tarol'];
  if (!targetInsts.includes(instId)) return symbol;

  if (symbol === 'D') return 'E';
  if (symbol === 'E') return 'D';
  if (symbol === 'd') return 'e';
  if (symbol === 'e') return 'd';
  if (symbol === 'R') return 'r';
  if (symbol === 'r') return 'R';
  if (symbol === 'F') return 'f';
  if (symbol === 'f') return 'F';
  return symbol;
}
