/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useMidiStore } from '../../stores/useMidiStore';
import { audioEngine } from '../../hooks/useAudioSync';
import { PercussionTuningControl } from '../PercussionTuningControl';
import { VocalTimbreSelector } from './VocalTimbreSelector';
import { isDarkText } from '../../data';
import { getStrokePairs, strokeExistsForInstrument } from '../../utils/instrumentStrokes';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { X, Volume2, Clock, Scissors, Sliders, FolderOpen } from 'lucide-react';
import { PatternInspectorHeader, BalancoPresetItem } from './PatternInspectorHeader';

interface StrokeInspectorPanelProps {
  trackId: number;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    name?: string;
    [key: string]: any;
  };
  lang: string;
  isLeftHanded: boolean;
  activeTool: string; // e.g. 'D', 'E', '0', 'scissors', etc.
  patternId?: number;
  onCloseMobileDrawer?: () => void;
  isMobileDrawer?: boolean;
  // Pilotage centralisé des motifs
  patterns?: any[];
  canPaste?: boolean;
  balancoPresets?: BalancoPresetItem[];
  onSelectPattern?: (patternId: number) => void;
  onAddPattern?: () => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  onSavePattern?: (patternId: number) => void;
  onLoadPattern?: (patternId: number) => void;
  onDeletePattern?: (patternId: number) => void;
  onBalancoChange?: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
  isVoice?: boolean;
  hasVocalRecording?: boolean;
  onOpenAlignment?: () => void;
  onImportAudio?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StrokeInspectorPanel: React.FC<StrokeInspectorPanelProps> = React.memo(({
  trackId,
  instrument,
  lang,
  isLeftHanded,
  activeTool,
  patternId,
  onCloseMobileDrawer,
  isMobileDrawer = false,
  patterns,
  canPaste = false,
  balancoPresets = [],
  onSelectPattern,
  onAddPattern,
  onCopyPattern,
  onPastePattern,
  onSavePattern,
  onLoadPattern,
  onDeletePattern,
  onBalancoChange,
  isVoice: isVoiceProp,
  hasVocalRecording = false,
  onOpenAlignment,
  onImportAudio,
}) => {
  const isFr = lang === 'fr';
  const isEraser = activeTool === '0' || activeTool === '';
  const isScissors = activeTool === 'scissors';
  const isVoice = isVoiceProp ?? (instrument?.type === 'voice' || instrument?.id === 'puxador' || instrument?.id === 'coro');
  const getInstrumentLabel = useInstrumentLabel();

  // Store selectors
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const setTracks = useSequencerStore(state => state.setTracks);
  const pushUndoState = useSequencerStore(state => state.pushUndoState);
  const vocalTransposeSteps = useSequencerStore(state => state.vocalTransposeSteps);

  const effectivePatterns = patterns || track?.patterns || [];
  const pitchOffset = track?.tuning || 0;
  const isTunableDrum = useMemo(() => {
    const id = instrument?.id?.toLowerCase() || '';
    const type = instrument?.type?.toLowerCase() || '';
    return (
      ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'].includes(id) ||
      type === 'alfaia' ||
      type === 'caixa'
    );
  }, [instrument?.id, instrument?.type]);

  const handleTranspose = React.useCallback((semitones: number) => {
    const currentPatternId = patternId || track?.selectedPatternId || track?.patterns?.[0]?.id;
    if (!currentPatternId) return;
    useSequencerStore.getState().transposePatternNotes(trackId, currentPatternId, semitones);
  }, [patternId, track?.selectedPatternId, track?.patterns, trackId]);

  const strokeDefaults = useSequencerSettingsStore(state => state.strokeDefaults) || {};
  const setStrokeDefault = useSequencerSettingsStore(state => state.setStrokeDefault);
  const setIsSettingsOpen = useSequencerSettingsStore(state => state.setIsSettingsOpen);

  // Throttled Audio Preview
  const lastPreviewTimeRef = useRef<number>(0);
  const playThrottledPreview = (symbol: string, volumePct: number, decayPct: number) => {
    const now = performance.now();
    if (now - lastPreviewTimeRef.current < 80) return; // 80ms throttle
    lastPreviewTimeRef.current = now;
    try {
      if (audioEngine) {
        audioEngine.playNote(trackId, symbol, Tone.now(), volumePct / 100, decayPct / 100);
      }
    } catch (_) {}
  };

  const handlePreviewDrum = React.useCallback(() => {
    if (!audioEngine) return;
    const instId = instrument.id;
    const strokeSymbol = instId === 'timbal' ? 'A' : 'D';
    const pitch = track?.tuning || 0;
    audioEngine.playPreview(instId, strokeSymbol, pitch, 1.0);
  }, [instrument.id, track?.tuning]);

  // Find paired strokes for active tool
  const pairs = useMemo(() => {
    return getStrokePairs(instrument.id, instrument.type, lang, isLeftHanded);
  }, [instrument.id, instrument.type, lang, isLeftHanded]);

  const currentPair = useMemo(() => {
    return pairs.find(
      p => p.id === activeTool || p.strong.symbol === activeTool || p.strokes.some(s => s.symbol === activeTool)
    );
  }, [pairs, activeTool]);

  // Compute average volume & decay for a stroke
  const getStrokeStats = (stroke: string) => {
    const defaultDecay = isVoice ? 10 : 100;
    if (!track) return { avgVolume: 80, avgDecay: defaultDecay };

    let volSum = 0;
    let volCount = 0;
    let decaySum = 0;
    let decayCount = 0;

    track.patterns.forEach((p) => {
      const vols = p.volumes || [];
      const decays = p.decays || [];

      p.activeSteps.forEach((step, idx) => {
        if (step === stroke) {
          const v = vols[idx];
          volSum += v !== undefined ? (Array.isArray(v) ? v[0] : v) : 80;
          volCount++;
          const d = decays[idx];
          decaySum += d !== undefined ? (Array.isArray(d) ? d[0] : d) : defaultDecay;
          decayCount++;
        }
      });

      p.variations?.forEach((v) => {
        const varVols = v.volumes || [];
        const varDecays = v.decays || [];
        v.steps.forEach((step, idx) => {
          if (step === stroke) {
            const vv = varVols[idx];
            volSum += vv !== undefined ? (Array.isArray(vv) ? vv[0] : vv) : 80;
            volCount++;
            const vd = varDecays[idx];
            decaySum += vd !== undefined ? (Array.isArray(vd) ? vd[0] : vd) : defaultDecay;
            decayCount++;
          }
        });
      });
    });

    if (volCount > 0 && decayCount > 0) {
      return {
        avgVolume: Math.round(volSum / volCount),
        avgDecay: Math.round(decaySum / decayCount),
      };
    }

    const defaults = strokeDefaults[`${trackId}:${stroke}`];
    return {
      avgVolume: defaults?.volume !== undefined ? defaults.volume : 80,
      avgDecay: defaults?.decay !== undefined ? defaults.decay : defaultDecay,
    };
  };

  // Macro volume delta
  const applyMacroVolumeDelta = (stroke: string, delta: number, targetVal: number) => {
    pushUndoState();
    setStrokeDefault(`${trackId}:${stroke}`, { volume: targetVal });

    setTracks(prevTracks => prevTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            const newVols = [...(p.volumes || [])];
            p.activeSteps.forEach((s, idx) => {
              if (s === stroke) {
                const current = newVols[idx] !== undefined ? newVols[idx] : 80;
                newVols[idx] = Array.isArray(current)
                  ? [Math.max(0, Math.min(100, current[0] + delta)), Math.max(0, Math.min(100, current[1] + delta))]
                  : Math.max(0, Math.min(100, current + delta));
              }
            });

            const newVars = p.variations?.map(v => {
              const varVols = [...(v.volumes || [])];
              v.steps.forEach((s, idx) => {
                if (s === stroke) {
                  const current = varVols[idx] !== undefined ? varVols[idx] : 80;
                  varVols[idx] = Array.isArray(current)
                    ? [Math.max(0, Math.min(100, current[0] + delta)), Math.max(0, Math.min(100, current[1] + delta))]
                    : Math.max(0, Math.min(100, current + delta));
                }
              });
              return { ...v, volumes: varVols };
            });

            return { ...p, volumes: newVols, variations: newVars };
          })
        };
      }
      return t;
    }));
  };

  // Macro decay delta
  const applyMacroDecayDelta = (stroke: string, delta: number, targetVal: number) => {
    pushUndoState();
    setStrokeDefault(`${trackId}:${stroke}`, { decay: targetVal });

    const minDecay = isVoice ? 1 : 10;
    setTracks(prevTracks => prevTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            const newDecays = [...(p.decays || [])];
            p.activeSteps.forEach((s, idx) => {
              if (s === stroke) {
                const current = newDecays[idx] !== undefined ? newDecays[idx] : (isVoice ? 10 : 100);
                newDecays[idx] = Array.isArray(current)
                  ? [Math.max(minDecay, Math.min(100, current[0] + delta)), Math.max(minDecay, Math.min(100, current[1] + delta))]
                  : Math.max(minDecay, Math.min(100, current + delta));
              }
            });

            const newVars = p.variations?.map(v => {
              const varDecays = [...(v.decays || [])];
              v.steps.forEach((s, idx) => {
                if (s === stroke) {
                  const current = varDecays[idx] !== undefined ? varDecays[idx] : (isVoice ? 10 : 100);
                  varDecays[idx] = Array.isArray(current)
                    ? [Math.max(minDecay, Math.min(100, current[0] + delta)), Math.max(minDecay, Math.min(100, current[1] + delta))]
                    : Math.max(minDecay, Math.min(100, current + delta));
                }
              });
              return { ...v, decays: varDecays };
            });

            return { ...p, decays: newDecays, variations: newVars };
          })
        };
      }
      return t;
    }));
  };

  // Composant réutilisable pour afficher une colonne de réglage de frappe
  const RenderStrokeColumn: React.FC<{
    symbol: string;
    label: string;
    isWeak: boolean;
  }> = ({ symbol, label, isWeak }) => {
    const stats = getStrokeStats(symbol);
    const bgCol = instrument.colors?.[symbol] || '#666';
    const isDark = isDarkText(instrument.id, symbol);
    const txtCol = isDark ? '#1a1a1a' : '#f4ecd8';

    const volLabelRef = useRef<HTMLSpanElement>(null);
    const decayLabelRef = useRef<HTMLSpanElement>(null);
    const currentVolRef = useRef<number>(stats.avgVolume);
    const currentDecayRef = useRef<number>(stats.avgDecay);

    return (
      <div className="flex-1 min-w-0 bg-[#f4ecd8] cordel-border-sm p-2 flex flex-col gap-2 shadow-sm">
        {/* En-tête de la frappe avec badge cliquable pour pré-écoute */}
        <div className="flex items-center gap-1.5 border-b border-[#1a1a1a]/15 pb-1">
          <div
            onClick={() => {
              if (audioEngine) {
                try {
                  audioEngine.playNote(
                    trackId,
                    symbol,
                    Tone.now(),
                    currentVolRef.current / 100,
                    currentDecayRef.current / 100
                  );
                } catch (_) {}
              }
            }}
            className="w-6 h-6 rounded-sm flex items-center justify-center font-bold text-xs shadow-inner cursor-pointer active:scale-95 transition-transform shrink-0"
            style={{ backgroundColor: bgCol, color: txtCol }}
            title={isFr ? "Cliquer pour écouter la frappe" : "Clique para ouvir o toque"}
          >
            {symbol}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-cactus font-bold text-[11px] text-[#1a1a1a] truncate">
              {label}
            </span>
            <span className="text-[9px] text-[#666] font-mono leading-tight truncate">
              {isWeak ? (isFr ? 'Déclinaison' : 'Variação') : (isFr ? 'Coup Fort' : 'Toque Forte')} [{symbol}]
            </span>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-[#1a1a1a]">
            <span className="flex items-center gap-1 text-[9px] text-[#666]">
              <Volume2 size={12} className="text-green-700" />
              Volume :
            </span>
            <span ref={volLabelRef} className="font-mono text-green-800">
              {stats.avgVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue={stats.avgVolume}
            onInput={(e) => {
              const val = parseInt(e.currentTarget.value, 10);
              currentVolRef.current = val;
              if (volLabelRef.current) volLabelRef.current.textContent = `${val}%`;
              playThrottledPreview(symbol, val, currentDecayRef.current);
            }}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              const delta = val - stats.avgVolume;
              applyMacroVolumeDelta(symbol, delta, val);
              playThrottledPreview(symbol, val, currentDecayRef.current);
            }}
            className="w-full accent-green-700 cursor-pointer h-1.5 bg-[#1a1a1a]/10"
          />
        </div>

        {/* Decay Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-[#1a1a1a]">
            <span className="flex items-center gap-1 text-[9px] text-[#666]">
              <Clock size={12} className="text-amber-600" />
              {isVoice ? (isFr ? 'Durée :' : 'Duração :') : 'Decay :'}
            </span>
            <span ref={decayLabelRef} className="font-mono text-amber-800">
              {stats.avgDecay}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            defaultValue={stats.avgDecay}
            onInput={(e) => {
              const val = parseInt(e.currentTarget.value, 10);
              currentDecayRef.current = val;
              if (decayLabelRef.current) decayLabelRef.current.textContent = `${val}%`;
              playThrottledPreview(symbol, currentVolRef.current, val);
            }}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              const delta = val - stats.avgDecay;
              applyMacroDecayDelta(symbol, delta, val);
              playThrottledPreview(symbol, currentVolRef.current, val);
            }}
            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-[#1a1a1a]/10"
          />
        </div>
      </div>
    );
  };

  const activeStrongSym = currentPair ? currentPair.strong.symbol : (activeTool || '').toUpperCase();
  const strokeChain = currentPair ? currentPair.strokes.map(s => s.symbol).join(' / ') : activeTool;

  return (
    <div className={`w-full h-full bg-[#ece4d0] p-2.5 flex flex-col gap-2 select-none overflow-y-auto ${
      isMobileDrawer ? 'max-h-[85vh]' : ''
    }`}>
      {/* Header bar of Inspector */}
      <div className="flex items-center justify-between border-b-[2px] border-[#1a1a1a] pb-1.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-cactus font-bold text-sm uppercase tracking-wide text-[#1a1a1a] truncate">
                {isFr ? 'Inspecteur Acoustique' : 'Inspetor Acústico'}
              </h3>
              {/* Bouton discret A Oficina */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 rounded-sm border border-[#1a1a1a]/30 hover:border-[#8b2a1a] hover:bg-[#8b2a1a]/10 text-[#1a1a1a] hover:text-[#8b2a1a] transition-all cursor-pointer shrink-0"
                title={isFr ? "Ouvrir l'Atelier" : "Abrir A Oficina"}
              >
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2L14 5H10L12 2Z" />
                  <path d="M12 22L10 19H14L12 22Z" />
                  <path d="M22 12L19 14V10L22 12Z" />
                  <path d="M2 12L5 10V14L2 12Z" />
                  <path d="M19.07 4.93L16.24 7.76L17.66 9.17L20.49 6.34L19.07 4.93Z" />
                  <path d="M4.93 19.07L7.76 16.24L9.17 17.66L6.34 20.49L4.93 19.07Z" />
                  <path d="M19.07 19.07L16.24 16.24L17.66 14.83L20.49 17.66L19.07 19.07Z" />
                  <path d="M4.93 4.93L7.76 7.76L9.17 6.34L6.34 3.51L4.93 4.93Z" />
                </svg>
              </button>
            </div>
            <span className="text-[10px] text-[#666]">
              {track ? getInstrumentLabel(track) : getInstrumentLabel(instrument.id)}
            </span>
          </div>
        </div>
        {onCloseMobileDrawer && (
          <button
            onClick={onCloseMobileDrawer}
            className="w-7 h-7 flex items-center justify-center rounded-sm bg-[#1a1a1a]/10 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer text-sm font-bold shrink-0"
            title={isFr ? 'Fermer le panneau' : 'Fechar o painel'}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ─── Bloc 1 : Gestion centralisée du motif actif (Sélecteur & Actions) ─── */}
      {effectivePatterns.length > 0 && onSelectPattern && onAddPattern && (
        <div className="border-b-2 border-[#1a1a1a]/15 pb-3 mb-3 shrink-0">
          <PatternInspectorHeader
            patterns={effectivePatterns}
            selectedPatternId={patternId || track?.selectedPatternId || effectivePatterns[0]?.id}
            trackId={trackId}
            lang={lang}
            canPaste={canPaste}
            balancoPresets={balancoPresets}
            onSelectPattern={onSelectPattern}
            onAddPattern={onAddPattern}
            onCopyPattern={() => {
              const currentId = patternId || track?.selectedPatternId || effectivePatterns[0]?.id;
              const p = effectivePatterns.find(pt => pt.id === currentId);
              if (p && onCopyPattern) onCopyPattern(p);
            }}
            onPastePattern={() => {
              const targetId = patternId || track?.selectedPatternId || effectivePatterns[0]?.id;
              if (targetId && onPastePattern) onPastePattern(targetId);
            }}
            onSavePattern={() => {
              const targetId = patternId || track?.selectedPatternId || effectivePatterns[0]?.id;
              if (targetId && onSavePattern) onSavePattern(targetId);
            }}
            onLoadPattern={() => {
              const targetId = patternId || track?.selectedPatternId || effectivePatterns[0]?.id;
              if (targetId && onLoadPattern) onLoadPattern(targetId);
            }}
            onDeletePattern={onDeletePattern}
            onBalancoChange={onBalancoChange}
            isVoice={isVoice}
          />
        </div>
      )}

      {/* ─── Bloc 2 : Vocal (Actions Audio) OU Percussif (Frappes & Nuances) ─── */}
      {isVoice ? (
        <div className="flex flex-col gap-2 p-2.5 bg-[#f4ecd8] border-2 border-[#1a1a1a] rounded-sm shadow-[2px_2px_0px_#1a1a1a] select-none mb-3">
          <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70">
              {isFr ? 'Audio du motif' : 'Áudio do padrão'}
            </span>
            <span className="text-[10px] font-mono font-bold text-[#8b2a1a]">
              {hasVocalRecording ? (isFr ? 'Enregistré' : 'Gravado') : (isFr ? 'Aucun' : 'Nenhum')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {hasVocalRecording ? (
              <>
                <button
                  type="button"
                  onClick={onOpenAlignment}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-[#f4ecd8] hover:bg-[#fffdf9] border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded text-xs font-bold font-cactus text-[#1a1a1a] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5"
                  title={isFr ? "Ajuster le calage, trim et tempo du sample audio" : "Ajustar alinhamento, trim e andamento"}
                >
                  <Sliders size={13} className="text-[#8b2a1a]" />
                  <span>{isFr ? '🎚️ Ajuster le calage' : '🎚️ Ajustar alinhamento'}</span>
                </button>

                <label className="flex items-center justify-center gap-1.5 w-full py-1 px-2 bg-[#f4ecd8] hover:bg-[#1a1a1a]/5 border border-[#1a1a1a]/40 rounded text-[11px] font-bold font-cactus text-[#1a1a1a]/80 cursor-pointer transition-colors">
                  <FolderOpen size={12} />
                  <span>{isFr ? '📁 Remplacer le fichier' : '📁 Substituir arquivo'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={onImportAudio}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <label className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-[#f4ecd8] hover:bg-[#fffdf9] border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] rounded text-xs font-bold font-cactus text-[#1a1a1a] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5">
                <FolderOpen size={13} className="text-[#8b2a1a]" />
                <span>{isFr ? '📁 Importer un audio' : '📁 Importar áudio'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={onImportAudio}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/60 mb-2">
            {isFr ? 'Frappes & Nuances' : 'Toques & Nuances'}
          </div>

      {/* CAS 1 : Gomme active */}
      {isEraser ? (
        <div className="bg-[#f4ecd8] cordel-border-sm p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[#1a1a1a] shadow-sm">
          <div className="w-9 h-9 rounded-sm bg-[#8b2a1a] text-[#f4ecd8] flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#1a1a1a]">
            ⌫
          </div>
          <span className="font-cactus font-bold text-xs">
            {isFr ? "Outil d'effacement actif" : "Ferramenta de apagar ativa"}
          </span>
          <p className="text-[10px] text-[#666] leading-tight max-w-[200px]">
            {isFr
              ? "Cliquez ou glissez sur les pas de la grille pour supprimer des frappes."
              : "Clique ou arraste nos passos da grade para remover toques."}
          </p>
        </div>
      ) : isScissors ? (
        <div className="bg-[#f4ecd8] cordel-border-sm p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[#1a1a1a] shadow-sm">
          <div className="w-9 h-9 rounded-sm bg-[#8b2a1a] text-[#f4ecd8] flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#1a1a1a]">
            <Scissors size={18} />
          </div>
          <span className="font-cactus font-bold text-xs">
            {isFr ? "Outil Ciseau / Colle actif" : "Ferramenta Tesoura / Cola ativa"}
          </span>
          <p className="text-[10px] text-[#666] leading-tight max-w-[220px]">
            {isFr
              ? "Cliquez sur un pas simple pour le scinder en deux triples croches (main opposée automatique). Cliquez sur un pas scindé pour le recoller."
              : "Clique num passo para dividir em duas semicolcheias (mão oposta automática). Clique num passo dividido para colar."}
          </p>
        </div>
      ) : (
        /* CAS 2 : Outil de frappe actif */
        <div className="flex flex-col gap-2">
          {/* Active Tool Name (No ATIVO button) */}
          <div className="flex items-center justify-between gap-2 bg-[#f4ecd8] cordel-border-sm px-2.5 py-1 shrink-0">
            <span className="font-cactus font-bold text-xs text-[#1a1a1a] truncate">
              {currentPair?.mainLabel || activeTool}
            </span>
            <span className="text-[10px] text-[#8b2a1a] font-mono font-bold">
              {strokeChain}
            </span>
          </div>

          {/* Colonnes de frappes : Solo (1), Miroir (2), Triplet (3) ou Flas Timbal (4) */}
          {currentPair?.strokes && currentPair.strokes.length === 1 ? (
            <div className="flex flex-col gap-2">
              <RenderStrokeColumn
                symbol={currentPair.strokes[0].symbol}
                label={currentPair.strokes[0].label}
                isWeak={false}
              />
            </div>
          ) : currentPair?.strokes && currentPair.strokes.length === 2 ? (
            <div className="flex flex-row gap-2">
              <RenderStrokeColumn
                symbol={currentPair.strokes[0].symbol}
                label={currentPair.strokes[0].label}
                isWeak={false}
              />
              <RenderStrokeColumn
                symbol={currentPair.strokes[1].symbol}
                label={currentPair.strokes[1].label}
                isWeak={true}
              />
            </div>
          ) : currentPair?.strokes && currentPair.strokes.length === 3 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2">
                <RenderStrokeColumn
                  symbol={currentPair.strokes[0].symbol}
                  label={currentPair.strokes[0].label}
                  isWeak={false}
                />
                <RenderStrokeColumn
                  symbol={currentPair.strokes[1].symbol}
                  label={currentPair.strokes[1].label}
                  isWeak={true}
                />
              </div>
              <div className="flex flex-row gap-2">
                <RenderStrokeColumn
                  symbol={currentPair.strokes[2].symbol}
                  label={currentPair.strokes[2].label}
                  isWeak={true}
                />
              </div>
            </div>
          ) : currentPair?.strokes && currentPair.strokes.length >= 4 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2">
                <RenderStrokeColumn
                  symbol={currentPair.strokes[0].symbol}
                  label={currentPair.strokes[0].label}
                  isWeak={false}
                />
                <RenderStrokeColumn
                  symbol={currentPair.strokes[1].symbol}
                  label={currentPair.strokes[1].label}
                  isWeak={true}
                />
              </div>
              <div className="flex flex-row gap-2">
                <RenderStrokeColumn
                  symbol={currentPair.strokes[2].symbol}
                  label={currentPair.strokes[2].label}
                  isWeak={false}
                />
                <RenderStrokeColumn
                  symbol={currentPair.strokes[3].symbol}
                  label={currentPair.strokes[3].label}
                  isWeak={true}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-row gap-2">
              <RenderStrokeColumn
                symbol={activeStrongSym}
                label={activeStrongSym}
                isWeak={false}
              />
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Section Lutherie du Fût (Accordage / Pitch) ou Timbre Vocal & Transposition */}
      {(isVoice || isTunableDrum) && (
        <div className="border-t border-[#1a1a1a]/20 pt-1 flex flex-col gap-1.5 mt-auto shrink-0">
          {isVoice ? (
            <>
              {/* Widget Transposition vocale sur deux lignes */}
              <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] p-2 rounded-sm select-none">
                {/* Ligne 1 : Titre */}
                <div className="text-xs font-cactus font-bold uppercase tracking-wider text-[#1a1a1a] mb-1.5">
                  {isFr ? 'Transposition' : 'Transposição'}
                </div>

                {/* Ligne 2 : Grille / Flex des 5 commandes */}
                <div className="flex items-center justify-between gap-1.5">
                  {/* -7 st */}
                  <button
                    type="button"
                    onClick={() => handleTranspose(-7)}
                    className="flex-1 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                    title={isFr ? 'Transposer de -7 demi-tons (Quinte descendante)' : 'Transpor -7 semitons (Quinta descendente)'}
                  >
                    -7
                  </button>

                  {/* -1 st */}
                  <button
                    type="button"
                    onClick={() => handleTranspose(-1)}
                    className="w-7 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                    title={isFr ? 'Transposer de -1 demi-ton' : 'Transpor -1 semitom'}
                  >
                    -
                  </button>

                  {/* Compteur central */}
                  <span className="w-8 text-center font-cactus font-black text-sm text-[#8b2a1a] tabular-nums">
                    {vocalTransposeSteps > 0 ? `+${vocalTransposeSteps}` : vocalTransposeSteps}
                  </span>

                  {/* +1 st */}
                  <button
                    type="button"
                    onClick={() => handleTranspose(1)}
                    className="w-7 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                    title={isFr ? 'Transposer de +1 demi-ton' : 'Transpor +1 semitom'}
                  >
                    +
                  </button>

                  {/* +7 st */}
                  <button
                    type="button"
                    onClick={() => handleTranspose(7)}
                    className="flex-1 h-7 flex items-center justify-center bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] font-cactus font-bold text-xs rounded transition-colors"
                    title={isFr ? 'Transposer de +7 demi-tons (Quinte ascendante)' : 'Transpor +7 semitons (Quinta ascendente)'}
                  >
                    +7
                  </button>
                </div>
              </div>

              <VocalTimbreSelector lang={lang} />
            </>
          ) : (
            <details className="border-t-2 border-[#1a1a1a]/20 pt-2 mt-2 group">
              <summary className="text-xs font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between py-1 select-none [&::-webkit-details-marker]:hidden">
                <span>
                  {isFr ? 'Accorder le tambour' : 'Afinar o tambor'} ({pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset} st)
                </span>
                <span className="transition-transform group-open:rotate-90">▸</span>
              </summary>
              <div className="pt-2">
                <PercussionTuningControl trackId={trackId} onPreview={handlePreviewDrum} showPreviewButton={true} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
});

StrokeInspectorPanel.displayName = 'StrokeInspectorPanel';
