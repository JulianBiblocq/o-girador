/**
 * 
 * O Girador - Instrument Audio Configurations Registry
 */

import { InstrumentAudioConfig } from './types';
import { agbeConfig, mineiroConfig } from './shakerConfig';
import { marcanteConfig, meiaoConfig, repiqueConfig } from './alfaiaConfig';
import { caixaConfig, tarolConfig } from './caixaConfig';
import { gongueConfig } from './ironConfig';
import { timbalConfig, apitoConfig } from './timbalApitoConfig';

export const instrumentAudioConfigs: InstrumentAudioConfig[] = [
  agbeConfig,
  marcanteConfig,
  meiaoConfig,
  repiqueConfig,
  caixaConfig,
  tarolConfig,
  gongueConfig,
  mineiroConfig,
  timbalConfig,
  apitoConfig
];

export function getInstrumentAudioConfig(id: string): InstrumentAudioConfig | undefined {
  return instrumentAudioConfigs.find(c => c.id === id);
}
