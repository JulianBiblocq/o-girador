import React, { useState } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../../hooks/useAudioSync';
import { instrumentsConfig } from '../../data';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { getStrokesForInstrument } from '../../utils/instrumentStrokes';
import { useSettingsKitMacros } from './useSettingsKitMacros';
import { SettingsKitMacroEditor } from './SettingsKitMacroEditor';

interface SettingsKitTabProps {
  lang: string;
  isLeftHanded: boolean;
}

export const SettingsKitTab: React.FC<SettingsKitTabProps> = ({ lang, isLeftHanded }) => {
  const [selectedMacro, setSelectedMacro] = useState<{ trackId: number; stroke: string } | null>(null);
  const {
    activeTracks,
    forcedStrokes,
    setStrokeForcedState,
    getActiveStrokesForTrack,
    getStrokeAverages,
    applyMacroVolumeDelta,
    applyMacroDecayDelta,
  } = useSettingsKitMacros();

  return (
    <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[4px_10px_6px_12px] p-4 bg-white shadow-[3.5px_3.5px_0px_#000]">
      <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
        🥁 {lang === 'fr' ? 'Montage du Kit (Macros)' : 'Montagem do Kit (Macros)'}
      </h3>
      <p className="text-[10px] opacity-75 mb-4">
        {lang === 'pt'
          ? 'Clique em uma batida para ajustar proporcionalmente seu volume e ressonância. Batidas tracejadas/foscas ainda não estão em uso, mas você pode definir seus valores padrão.'
          : 'Cliquez sur une frappe pour régler son volume et sa résonance globale. Les frappes grisées/pointillées ne sont pas utilisées, mais vous pouvez définir leurs valeurs par défaut.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTracks.length === 0 ? (
          <p className="text-[10px] italic opacity-60">
            {lang === 'fr' ? 'Aucun instrument actif dans cette session.' : 'Nenhum instrumento ativo nesta sessão.'}
          </p>
        ) : (
          activeTracks.map((track) => {
            const inst = instrumentsConfig[track.instrumentIdx];
            const activeStrokes = getActiveStrokesForTrack(track);
            const allStrokes = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);

            return (
              <div key={track.id} className="border border-black/10 p-3 bg-black/[0.02] flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">
                    {track.customName || useNomenclatureStore.getState().getInstrumentLabel(inst.id) || inst.name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allStrokes.map((strokeDef) => {
                      const stroke = strokeDef.symbol;
                      const strokeColor = inst.colors[stroke] || '#666';
                      const strokeTextColor = inst.colors.text || '#f4ecd8';
                      const isUsed = activeStrokes.includes(stroke);
                      const forced = forcedStrokes[`${track.id}:${stroke}`];
                      const isActive = forced !== undefined ? forced : isUsed;
                      const isSelected = selectedMacro?.trackId === track.id && selectedMacro?.stroke === stroke;

                      return (
                        <button
                          key={stroke}
                          onClick={() => {
                            setSelectedMacro(isSelected ? null : { trackId: track.id, stroke });
                            if (audioEngine) audioEngine.playNote(track.id, stroke, Tone.now(), 1.0, 1.0);
                          }}
                          data-midi-target={`${inst.id}-${stroke}`}
                          className={`w-7 h-7 font-mono font-bold text-xs normal-case flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer hover:scale-105 active:scale-95 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all transition-transform duration-100 select-none ${
                            !isActive ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''
                          }`}
                          style={{
                            backgroundColor: strokeColor,
                            color: strokeTextColor,
                            outline: isSelected ? '3px solid #000' : 'none',
                            outlineOffset: isSelected ? '1px' : '0px',
                          }}
                          title={`${stroke} : ${strokeDef.label}`}
                        >
                          {stroke}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedMacro && selectedMacro.trackId === track.id && (() => {
                  const stroke = selectedMacro.stroke;
                  const isUsed = activeStrokes.includes(stroke);
                  const { avgVolume, avgDecay } = getStrokeAverages(track, stroke);
                  const isVoice = inst?.type === 'voice';
                  const currentForced = forcedStrokes[`${track.id}:${stroke}`];
                  const isStrokeCurrentlyActive = currentForced !== undefined ? currentForced : isUsed;

                  return (
                    <SettingsKitMacroEditor
                      track={track}
                      stroke={stroke}
                      isVoice={isVoice}
                      isUsed={isUsed}
                      isStrokeCurrentlyActive={isStrokeCurrentlyActive}
                      avgVolume={avgVolume}
                      avgDecay={avgDecay}
                      lang={lang}
                      onToggleForcedState={() => setStrokeForcedState(`${track.id}:${stroke}`, !isStrokeCurrentlyActive)}
                      onClose={() => setSelectedMacro(null)}
                      onVolumeChange={(val, delta) => applyMacroVolumeDelta(track.id, stroke, delta, val)}
                      onDecayChange={(val, delta) => applyMacroDecayDelta(track.id, stroke, delta, val)}
                    />
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
