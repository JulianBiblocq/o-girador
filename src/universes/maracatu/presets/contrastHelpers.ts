/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Text Contrast Helpers for Step Badges
 */

export function isDarkText(instId: string, strokeVal: string): boolean {
  if (!strokeVal) return false;
  if (instId === 'apito' && strokeVal === 'w') return true;
  if (instId === 'gongue' && (strokeVal === 'A' || strokeVal === 'a')) return true;
  if (instId === 'agbe' && ['s', 'S', 'd', 'D', 'e', 'E', 'v', 'V'].includes(strokeVal)) return true;
  if (instId === 'caixa' && ['r', 'R', 'd', 'e', 'c', 'C'].includes(strokeVal)) return true;
  if (instId === 'timbal' && ['s', 'S', 'd', 'D', 'c', 'C'].includes(strokeVal)) return true;
  if (instId === 'mineiro' && ['t', 'p', 'L'].includes(strokeVal)) return true;
  if (instId === 'tarol' && ['c', 'C', 'd', 'e', 'F', 'f'].includes(strokeVal)) return true;
  if (['marcante', 'meiao', 'repique'].includes(instId) && ['c', 'C', 'd', 'e'].includes(strokeVal)) return true;
  return false;
}
