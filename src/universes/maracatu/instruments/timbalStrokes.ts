/**
 * 
 * O Girador - Timbal Combined Stroke Mappings
 */

import { StrokeMapping } from './types';
import { timbalPrimaryStrokes } from './timbalPrimaryStrokes';
import { timbalSecondaryStrokes } from './timbalSecondaryStrokes';

export const timbalStrokes: StrokeMapping[] = [
  ...timbalPrimaryStrokes,
  ...timbalSecondaryStrokes
];
