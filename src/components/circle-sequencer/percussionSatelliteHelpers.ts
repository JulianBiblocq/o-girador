export function formatStrokeSymbol(instId: string, stateStr: string): string {
  if (instId === 'mineiro') {
    if (stateStr.toLowerCase() === 'p') return '↑';
    if (stateStr.toLowerCase() === 't') return '↓';
  } else if (instId === 'agbe') {
    if (stateStr.toLowerCase() === 'e') return '←';
    if (stateStr.toLowerCase() === 'd') return '→';
    if (stateStr.toLowerCase() === 's') return '↑';
    if (stateStr.toLowerCase() === 'v') return '↓';
  }
  return stateStr;
}
