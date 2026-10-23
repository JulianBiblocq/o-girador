/**
 * 
 * O Girador - Step Value Progression Helper
 */

export function getNextStepValue(
  instId: string,
  instType: string,
  currentVal: string | number
): string | number {
  const norm = typeof currentVal === 'string' ? currentVal.trim() : currentVal;
  
  if (instId === 'mineiro') {
    if (norm === 0 || norm === '0' || !norm) return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 't';
    if (norm === 't') return 'T';
    if (norm === 'T') return 'L';
    if (norm === 'L') return 'B';
    return 0;
  }
  if (instId === 'agbe') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'S';
    if (norm === 'S' || norm === 's') return 'V';
    if (norm === 'V' || norm === 'v') return 'B';
    return 0;
  }
  if (instType === 'gongue' || instId === 'gongue') {
    if (norm === 0 || norm === '0' || !norm) return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'A') return 'X';
    if (norm === 'X') return 'B';
    return 0;
  }
  if (instId === 'timbal') {
    if (norm === 0 || norm === '0' || !norm) return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'A') return 's';
    if (norm === 's') return 'S';
    if (norm === 'S') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'F') return 'v';
    if (norm === 'v') return 'V';
    if (norm === 'V') return 'C';
    if (norm === 'C') return 'B';
    return 0;
  }
  if (instId === 'caixa' || instId === 'tarol') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'C';
    if (norm === 'C') return 'X';
    if (norm === 'X') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'F') return 'R';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'B';
    return 0;
  }
  if (['marcante', 'meiao', 'repique', 'alfaia'].includes(instId)) {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'C';
    if (norm === 'C') return 'X';
    if (norm === 'X') return 'I';
    if (norm === 'I') return 'B';
    return 0;
  }
  if (instId === 'apito') {
    if (norm === 0 || norm === '0' || !norm) return 'W';
    if (norm === 'W') return 'w';
    return 0;
  }
  // default
  if (norm === 0 || norm === '0' || !norm) return 'd';
  if (norm === 'd') return 'D';
  if (norm === 'D') return 'e';
  if (norm === 'e') return 'E';
  return 0;
}
