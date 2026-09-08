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
import { isDarkText } from '../../data';
import { getStrokePairs, strokeExistsForInstrument } from '../../utils/instrumentStrokes';
import { X, Volume2, Clock, Scissors } from 'lucide-react';

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
  onCloseMobileDrawer?: () => void;
  isMobileDrawer?: boolean;
}

export const StrokeInspectorPanel: React.FC<StrokeInspectorPanelProps> = React.memo(({
  trackId,
  instrument,
  lang,
  isLeftHanded,
  activeTool,
  onCloseMobileDrawer,
  isMobileDrawer = false,
}) => {
  const isFr = lang === 'fr';
  const isEraser = activeTool === '0' || activeTool === 0 || activeTool === '';
  const isScissors = activeTool === 'scissors';
  const isVoice = instrument?.type === 'voice';

  // Store selectors
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const setTracks = useSequencerStore(state => state.setTracks);
  const pushUndoState = useSequencerStore(state => state.pushUndoState);

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
          volSum += vols[idx] !== undefined ? vols[idx] : 80;
          volCount++;
          decaySum += decays[idx] !== undefined ? decays[idx] : defaultDecay;
          decayCount++;
        }
      });

      p.variations?.forEach((v) => {
        const varVols = v.volumes || [];
        const varDecays = v.decays || [];
        v.steps.forEach((step, idx) => {
          if (step === stroke) {
            volSum += varVols[idx] !== undefined ? varVols[idx] : 80;
            volCount++;
            decaySum += varDecays[idx] !== undefined ? varDecays[idx] : defaultDecay;
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
                newVols[idx] = Math.max(0, Math.min(100, current + delta));
              }
            });

            const newVars = p.variations?.map(v => {
              const varVols = [...(v.volumes || [])];
              v.steps.forEach((s, idx) => {
                if (s === stroke) {
                  const current = varVols[idx] !== undefined ? varVols[idx] : 80;
                  varVols[idx] = Math.max(0, Math.min(100, current + delta));
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
                newDecays[idx] = Math.max(minDecay, Math.min(100, current + delta));
              }
            });

            const newVars = p.variations?.map(v => {
              const varDecays = [...(v.decays || [])];
              v.steps.forEach((s, idx) => {
                if (s === stroke) {
                  const current = varDecays[idx] !== undefined ? varDecays[idx] : (isVoice ? 10 : 100);
                  varDecays[idx] = Math.max(minDecay, Math.min(100, current + delta));
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
                title={isFr ? "Ouvrir l'Atelier (A Oficina)" : "Abrir A Oficina"}
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
              {instrument.name || instrument.id}
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

      {/* Section Lutherie du Fût (Accordage / Pitch) */}
      <div className="border-t border-[#1a1a1a]/20 pt-1.5 flex flex-col gap-1.5 mt-auto shrink-0">
        <PercussionTuningControl trackId={trackId} />
      </div>
    </div>
  );
});

StrokeInspectorPanel.displayName = 'StrokeInspectorPanel';
