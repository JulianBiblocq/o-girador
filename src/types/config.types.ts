/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InstrumentConfig {
  id: string;
  iconImg: string;
  name: string;
  type: 'hands' | 'gongue' | 'shake' | 'voice';
  mixerBg: string;
  path: string;
  colors: {
    [key: string]: string;
  };
  color?: string;
}

export type Language = 'pt' | 'fr';
