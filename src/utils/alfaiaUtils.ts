/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Différenciation visuelle des Alfaias par l'échelle physique de l'icône
export const getAlfaiaIconSizeClass = (instId?: string): string => {
  if (!instId) return 'w-6 h-6';
  if (instId.includes('marcante')) return 'w-7 h-7'; // 28x28 px (Gros fût)
  if (instId.includes('meiao')) return 'w-6 h-6';    // 24x24 px (Moyen fût)
  if (instId.includes('repique')) return 'w-5 h-5';  // 20x20 px (Petit fût)
  return 'w-6 h-6';
};
