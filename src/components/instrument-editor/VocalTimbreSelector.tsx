/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useAudioStore } from '../../stores/useAudioStore';
import { VocalPresetId, VOCAL_PRESET_LIST, VOCAL_PRESETS } from '../../audio/vocalPresets';
import { playVoicePitchLive, releaseVoicePitchLive, applyVocalPresetLive } from '../../audio/vocalSynthService';

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

  const handleTestPreview = useCallback(() => {
    // Joue une note test C4 (ou A3) avec le timbre sélectionné
    playVoicePitchLive('C4', 0.85);
    setTimeout(() => {
      releaseVoicePitchLive('C4');
    }, 450);
  }, []);

  return (
    <div
      data-testid="vocal-timbre-selector"
      className={`flex flex-col items-center justify-center bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] p-2 gap-1.5 w-full select-none ${className}`}
    >
      {/* En-tête Cordel */}
      <div className="flex justify-between w-full items-center leading-none border-b border-dashed border-[#1a1a1a]/30 pb-1.5">
        <span className="text-[11px] font-bold font-cactus uppercase text-[#1a1a1a] tracking-wider truncate">
          {isFr ? "Timbre d'écoute" : 'Timbre da Voz'}
        </span>
        <span className="text-[10px] font-cactus font-bold text-[#8b2a1a] uppercase">
          {isFr ? activePresetConfig.nameFr.split(' ')[0] : activePresetConfig.namePt.split(' ')[0]}
        </span>
      </div>

      {/* Menu déroulant des 5 presets */}
      <div className="w-full flex flex-col gap-1 mt-0.5">
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

      {/* Description du timbre sélectionné */}
      <p className="text-[9px] text-[#444] italic leading-tight text-center px-1 min-h-[22px] flex items-center justify-center">
        {isFr ? activePresetConfig.descFr : activePresetConfig.descPt}
      </p>

      {/* Bouton de pré-écoute test direct */}
      <button
        type="button"
        data-testid="vocal-timbre-preview-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleTestPreview();
        }}
        className="w-full py-1 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:scale-95 transition-all cursor-pointer font-cactus font-bold uppercase text-[9px] flex items-center justify-center gap-1 mt-0.5"
      >
        <span>🔊</span>
        <span>{isFr ? 'Tester le son (C4)' : 'Testar som (C4)'}</span>
      </button>
    </div>
  );
};

export default VocalTimbreSelector;
