/**
 * Utilitaire de pré-remplissage hybride pour fiches papier Cordel (< 90 lignes).
 */
import { GridMode, PaperStepValue } from '../../types/paperWorkshop.types';
import { getDictionaryEntries, DictionaryFamily, PaperDictionaryEntry } from './paperRhythmDictionary';
import { renderOpticalCircle, renderStepCells } from './paperGridModeHelper';

export const getPrefillEntries = (familyKey?: string): PaperDictionaryEntry[] => {
  if (!familyKey) return [];
  return getDictionaryEntries(familyKey as DictionaryFamily);
};

export const renderHybridBlankRows = (
  startVarIndex: number,
  stepsCount: number,
  gridMode: GridMode,
  rowHeight = '18px'
): string => {
  return [startVarIndex, startVarIndex + 1].map((vNum) => `
    <tr>
      <td style="width: 75px; border: 1.5px dashed #1a1a1a; padding: 2px 4px; font-size: 8pt; background: #fff; color: #555;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>↳ Var ${vNum}</span>
          ${renderOpticalCircle(false, '')}
        </div>
      </td>
      ${renderStepCells(stepsCount, gridMode, rowHeight)}
    </tr>
  `).join('');
};

export const renderPrefilledStepCells = (
  steps: PaperStepValue[],
  stepsCount: number,
  gridMode: GridMode,
  isVariation = false
): string => {
  return Array.from({ length: stepsCount }, (_, i) => {
    const rawVal = steps[i];
    const val = rawVal === 0 || !rawVal ? '' : (Array.isArray(rawVal) ? `${rawVal[0]}/${rawVal[1]}` : String(rawVal));
    const isBeatEnd = (i + 1) % 4 === 0 && i !== stepsCount - 1;
    const bg = isVariation ? '#fbfbfb' : '#fff';
    return `<td style="width: calc(100% / ${stepsCount}); height: 18px; border: 1px solid #777; border-right: ${
      isBeatEnd ? '2px solid #1a1a1a' : '1px solid #777'
    }; text-align: center; font-weight: bold; font-size: 8.5pt; background: ${bg};">${val}</td>`;
  }).join('');
};
