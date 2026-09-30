/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrokeInspectorPanel } from './instrument-editor/StrokeInspectorPanel';

// Re-export of StrokeInspectorPanel and VocalTimbreSelector for Acoustic Inspector namespace
export { StrokeInspectorPanel, StrokeInspectorPanel as AcousticInspector } from './instrument-editor/StrokeInspectorPanel';
export { VocalTimbreSelector } from './instrument-editor/VocalTimbreSelector';
export default StrokeInspectorPanel;
