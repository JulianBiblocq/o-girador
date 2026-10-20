/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Split Pairs and Complementary Stroke Helpers
 */

export function getDefaultSplitPair(instId: string, instType = ''): [string, string] {
  if (['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol', 'agbe'].includes(instId)) {
    return ['D', 'E'];
  }
  if (instId === 'mineiro') {
    return ['P', 'T'];
  }
  if (instId === 'gongue' || instType === 'gongue') {
    return ['G', 'A'];
  }
  if (instId === 'timbal') {
    return ['A', 'a'];
  }
  if (instId === 'apito') {
    return ['W', 'w'];
  }
  return ['D', 'E'];
}

export function getComplementaryStroke(
  symbol: string,
  instId: string,
  instType = '',
  isLeftHanded = false
): string {
  const norm = (symbol || '').trim();

  // Alfaias / Caixas / Tarols / Agbê
  if (['marcante', 'meiao', 'repique', 'alfaia', 'caixa', 'tarol', 'agbe'].includes(instId)) {
    if (norm === 'D') return 'E';
    if (norm === 'd') return 'e';
    if (norm === 'E') return 'D';
    if (norm === 'e') return 'd';
    if (norm === 'C') return 'X';
    if (norm === 'X') return 'C';
    if (norm === 'F') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'R';
    if (norm === 'S') return 'V';
    if (norm === 'V') return 'S';
    if (norm === 'I') return 'D';
    return 'E';
  }

  // Timbal
  if (instId === 'timbal') {
    if (norm === 'A') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'G') return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'S') return 's';
    if (norm === 's') return 'S';
    if (norm === 'D') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'P') return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'F') return 'f';
    if (norm === 'f') return 'F';
    if (norm === 'V') return 'v';
    if (norm === 'v') return 'V';
    return 'a';
  }

  // Mineiro
  if (instId === 'mineiro') {
    if (norm === 'P') return 'T';
    if (norm === 'T') return 'P';
    if (norm === 'p') return 't';
    if (norm === 't') return 'p';
    if (norm === 'L') return 'P';
    return 'T';
  }

  // Gonguê
  if (instId === 'gongue' || instType === 'gongue') {
    if (norm === 'G') return 'A';
    if (norm === 'A') return 'G';
    if (norm === 'g') return 'a';
    if (norm === 'a') return 'g';
    if (norm === 'X') return 'G';
    return 'A';
  }

  // Apito
  if (instId === 'apito') {
    if (norm === 'W') return 'w';
    if (norm === 'w') return 'W';
    return 'w';
  }

  // Fallback universel
  if (norm === norm.toUpperCase()) return norm.toLowerCase();
  return norm.toUpperCase();
}
