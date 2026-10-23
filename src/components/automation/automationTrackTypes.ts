/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Types d'interface pour les pistes d'automation (< 35 lignes).
 */

export interface AutomationTrackProps {
  type: 'tempo' | 'volume' | 'pan' | 'reverb';
  trackId?: number | null;
  label?: string;
  onClose?: () => void;
  totalMeasures: number;
  measureWidth: number;
  values: number[];
  transitions: ('immediate' | 'ramp' | 'bezier')[];
  onChangeValue: (mIdx: number, val: number) => void;
  onChangeTransition: (mIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  min: number;
  max: number;
  color: string;
  lang: string;
  headerWidth: number;
  isBypassed?: boolean;
  onToggleBypass?: () => void;
  paramSelector?: {
    current: 'volume' | 'pan' | 'reverb';
    onChange: (param: 'volume' | 'pan' | 'reverb') => void;
  };
}
