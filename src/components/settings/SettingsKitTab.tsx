/**
 * SettingsKitTab.tsx — Onglet « Kit & Métronome » (Métronome Studio linéaire + Montage du Kit / Macros
 * et passerelles directes vers l'Éditeur de Motif) (< 136 lignes).
 */
import React, { useState } from 'react';
import * as Tone from 'tone';
import { SlidersHorizontal } from 'lucide-react';
import { TrackGroup } from '../../types';
import { audioEngine } from '../../hooks/useAudioSync';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { getStrokesForInstrument } from '../../utils/instrumentStrokes';
import { resolveActivePatternIdForTrack } from '../oficina/LutherieTrackLinksRow';
import { useSettingsKitMacros } from './useSettingsKitMacros';
import { SettingsKitMacroEditor } from './SettingsKitMacroEditor';
import { SettingsMetronomeBar } from './SettingsMetronomeBar';

export interface SettingsKitTabProps {
  lang: string;
  isLeftHanded?: boolean;
}

export const SettingsKitTab: React.FC<SettingsKitTabProps> = ({ lang, isLeftHanded }) => {
  const isFr = lang === 'fr';
  const storeLeftHanded = useSequencerStore((s) => s.isLeftHanded);
  const effectiveLeftHanded = isLeftHanded ?? storeLeftHanded;
  const getInstrumentLabel = useInstrumentLabel();

  const [selectedMacro, setSelectedMacro] = useState<{ trackId: number; stroke: string } | null>(null);
  const {
    activeTracks, forcedStrokes, setStrokeForcedState,
    getActiveStrokesForTrack, getStrokeAverages, applyMacroVolumeDelta, applyMacroDecayDelta,
  } = useSettingsKitMacros();

  const handleOpenTrackEditor = (track: TrackGroup) => {
    const currentMeasure = useSequencerStore.getState().currentMeasure ?? 0;
    const patternId = resolveActivePatternIdForTrack(track, currentMeasure);
    useSequencerSettingsStore.getState().setIsSettingsOpen(false);
    useSequencerStore.getState().openInstrumentDetailAt({ trackId: track.id, patternId });
  };

  return (
    <div className="flex flex-col gap-4 text-[var(--cordel-text)]">
      <SettingsMetronomeBar lang={lang} />

      <div className="border-2 border-[var(--cordel-border-strong)] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
        <h3 className="font-cactus font-bold text-xs md:text-sm uppercase text-[var(--cordel-accent-readable)] mb-1.5 border-b border-[var(--cordel-border)] pb-1.5">
          {isFr ? 'Montage du Kit (Macros de Frappes)' : 'Montagem do Kit (Macros de Batidas)'}
        </h3>
        <p className="text-[10px] text-[var(--cordel-text-muted)] font-semibold mb-4">
          {lang === 'pt'
            ? 'Clique em uma batida para ajustar proporcionalmente seu volume e ressonância. Batidas tracejadas ainda não estão em uso, mas você pode definir seus valores padrão.'
            : 'Cliquez sur une frappe pour régler son volume et sa résonance globale. Les frappes pointillées ne sont pas encore utilisées, mais vous pouvez définir leurs valeurs par défaut.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activeTracks.length === 0 ? (
            <p className="text-[10px] italic text-[var(--cordel-text-muted)]">
              {isFr ? 'Aucun instrument actif dans cette session.' : 'Nenhum instrumento ativo nesta sessão.'}
            </p>
          ) : (
            activeTracks.map((track) => {
              const inst = instrumentsConfig[track.instrumentIdx];
              const activeStrokes = getActiveStrokesForTrack(track);
              const allStrokes = getStrokesForInstrument(inst.id, inst.type, lang, effectiveLeftHanded);
              const trackName = track.customName || getInstrumentLabel(inst.id) || inst.name;
              const isTrackMacroOpen = selectedMacro !== null && selectedMacro.trackId === track.id;

              return (
                <div key={track.id} className="border-2 border-[var(--cordel-border)] p-3 bg-[var(--cordel-bg)] flex flex-col gap-2.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[var(--cordel-border)] pb-1.5">
                    <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)] truncate">{trackName}</span>
                    <button type="button" data-testid={`kit-open-editor-${track.id}`} onClick={() => handleOpenTrackEditor(track)} className="px-2 py-1 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[9px] flex items-center gap-1 cursor-pointer transition-colors">
                      <SlidersHorizontal size={11} />
                      <span>{isFr ? 'Éditer motifs' : 'Editar padrões'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {allStrokes.map((strokeDef) => {
                      const stroke = strokeDef.symbol;
                      const isUsed = activeStrokes.includes(stroke);
                      const forced = forcedStrokes[`${track.id}:${stroke}`];
                      const isActive = forced !== undefined ? forced : isUsed;
                      const isSelected = isTrackMacroOpen && selectedMacro.stroke === stroke;
                      return (
                        <button
                          key={stroke} type="button" data-midi-target={`${inst.id}-${stroke}`} title={`${stroke} : ${strokeDef.label}`}
                          onClick={() => {
                            setSelectedMacro(isSelected ? null : { trackId: track.id, stroke });
                            if (audioEngine) audioEngine.playNote(track.id, stroke, Tone.now(), 1.0, 1.0);
                          }}
                          className={`w-7 h-7 font-mono font-bold text-xs normal-case flex items-center justify-center border-2 border-[var(--cordel-border-strong)] shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-100 select-none ${!isActive ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''}`}
                          style={{ backgroundColor: inst.colors[stroke] || 'var(--cordel-surface-elevated)', color: inst.colors.text || 'var(--cordel-on-accent)', outline: isSelected ? '2px solid var(--cordel-gold)' : 'none', outlineOffset: isSelected ? '1px' : '0px' }}
                        >
                          {stroke}
                        </button>
                      );
                    })}
                  </div>

                  {isTrackMacroOpen && (() => {
                    const stroke = selectedMacro.stroke;
                    const isUsed = activeStrokes.includes(stroke);
                    const { avgVolume, avgDecay } = getStrokeAverages(track, stroke);
                    const currentForced = forcedStrokes[`${track.id}:${stroke}`];
                    const isStrokeCurrentlyActive = currentForced !== undefined ? currentForced : isUsed;
                    return (
                      <SettingsKitMacroEditor
                        track={track} stroke={stroke} isVoice={inst?.type === 'voice'} isUsed={isUsed}
                        isStrokeCurrentlyActive={isStrokeCurrentlyActive} avgVolume={avgVolume} avgDecay={avgDecay} lang={lang}
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
    </div>
  );
};
