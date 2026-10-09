/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useAudioStore } from '../../stores/useAudioStore';
import { VocalPresetId, VOCAL_PRESET_LIST, VOCAL_PRESETS } from '../../audio/vocalPresets';
import { applyVocalPresetLive } from '../../audio/vocalSynthService';

interface VocalTimbreSelectorProps {
  lang?: string;
  className?: string;
}

export const VocalTimbreSelector: React.FC<VocalTimbreSelectorProps> = ({
  lang = 'fr',
  className = '',
}) => {
  const isFr = lang === 'fr';
  const vocalPreset = useAudioStore((state) => state.vocalPreset || 'guide');
  const setVocalPreset = useAudioStore((state) => state.setVocalPreset);

  const activePresetConfig = VOCAL_PRESETS[vocalPreset] || VOCAL_PRESETS.guide;

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newPreset = e.target.value as VocalPresetId;
      setVocalPreset(newPreset);
      applyVocalPresetLive(newPreset);
    },
    [setVocalPreset]
  );

  return (
    <div
      data-testid="vocal-timbre-selector"
      className={`flex flex-col items-center justify-center bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] p-1.5 gap-1 w-full select-none rounded-sm ${className}`}
    >
      {/* En-tête Cordel */}
      <div className="flex justify-between w-full items-center leading-none border-b border-dashed border-[#1a1a1a]/30 pb-1">
        <span className="text-[11px] font-bold font-cactus uppercase text-[#1a1a1a] tracking-wider truncate">
          {isFr ? "Timbre d'écoute" : 'Timbre da Voz'}
        </span>
        <span className="text-[10px] font-cactus font-bold text-[#8b2a1a] uppercase">
          {isFr ? activePresetConfig.nameFr.split(' ')[0] : activePresetConfig.namePt.split(' ')[0]}
        </span>
      </div>

      {/* Menu déroulant des 5 presets */}
      <div className="w-full flex flex-col gap-0.5">
        <label
          htmlFor="vocal-preset-select"
          className="text-[9px] font-cactus font-bold uppercase text-[#555] tracking-wide"
        >
          {isFr ? 'Synthétiseur guide :' : 'Sintetizador guia :'}
        </label>
        <select
          id="vocal-preset-select"
          data-testid="vocal-timbre-select"
          value={vocalPreset}
          onChange={handleSelectChange}
          className="w-full bg-[#ebdcb9] hover:bg-[#e4d4ad] text-[#1a1a1a] border border-[#1a1a1a] rounded-none px-2 py-1 text-[11px] font-sans font-medium focus:outline-none focus:ring-1 focus:ring-[#8b2a1a] cursor-pointer shadow-[1px_1px_0px_#1a1a1a]"
        >
          {VOCAL_PRESET_LIST.map((preset) => (
            <option key={preset.id} value={preset.id} className="bg-[#f4ecd8] text-[#1a1a1a]">
              {isFr ? preset.nameFr : preset.namePt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default VocalTimbreSelector;
