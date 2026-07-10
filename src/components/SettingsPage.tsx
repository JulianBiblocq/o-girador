import React, { useState, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { TelemetryBadge } from './TelemetryBadge';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig } from '../data';
import { metroChannel } from '../audio/effectsChain';
import { TrackGroup, Pattern, GlobalSwing } from '../types';
import { getStrokesForInstrument } from '../utils/instrumentStrokes';

export const SettingsPage: React.FC = () => {
  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useSequencerSettingsStore((state) => state.setIsSettingsOpen);
  const balanco = useSequencerSettingsStore((state) => state.balanco);
  const setBalanco = useSequencerSettingsStore((state) => state.setBalanco);
  const strokeDefaults = useSequencerSettingsStore((state) => state.strokeDefaults);
  const setStrokeDefault = useSequencerSettingsStore((state) => state.setStrokeDefault);

  const isMetroOn = useTransportStore((state) => state.isMetroOn);
  const setIsMetroOn = useTransportStore((state) => state.setIsMetroOn);
  const metroVolume = useTransportStore((state) => state.metroVolume);
  const setMetroVolume = useTransportStore((state) => state.setMetroVolume);
  const metroSound = useTransportStore((state) => state.metroSound);
  const setMetroSound = useTransportStore((state) => state.setMetroSound);
  const globalSwing = useTransportStore((state) => state.globalSwing);
  const setGlobalSwing = useTransportStore((state) => state.setGlobalSwing);

  const tracks = useSequencerStore((state) => state.tracks);
  const setTracks = useSequencerStore((state) => state.setTracks);
  const pushUndoState = useSequencerStore((state) => state.pushUndoState);

  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>('groove');
  const [selectedMacro, setSelectedMacro] = useState<{ trackId: number; stroke: string } | null>(null);
  
  const sequencer = useSequencer();
  const lang = sequencer?.lang || 'fr';

  // --- LOGIQUE LOCALE DU BALANÇO (SWING) ---
  const [localSwing, setLocalSwing] = useState<GlobalSwing>(globalSwing);

  // Synchronise l'état local si le globalSwing change de l'extérieur
  useEffect(() => {
    setLocalSwing(globalSwing);
  }, [globalSwing]);

  const handleSwingModeChange = (mode: 'maracatu' | 'custom' | 'off') => {
    const newSwing = { ...localSwing, mode };
    setLocalSwing(newSwing);
    setGlobalSwing(newSwing);
  };

  const handleCustomOffsetChange = (index: number, val: number) => {
    const newOffsets = [...localSwing.customOffsets];
    newOffsets[index] = val;
    const newSwing = { ...localSwing, customOffsets: newOffsets as [number, number, number, number] };
    setLocalSwing(newSwing);
    setGlobalSwing(newSwing);
  };

  const handleResetCustom = () => {
    const newSwing = { ...localSwing, customOffsets: [0, 8, -29, -58] as [number, number, number, number] };
    setLocalSwing(newSwing);
    setGlobalSwing(newSwing);
  };

  // Latence artificielle pour protéger le thread audio d'un pic de render synchrone
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 85);
    return () => clearTimeout(timer);
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  // Logic pour le changement de volume du métronome (Tone.js + store)
  const handleMetroVolumeChange = (val: number) => {
    setMetroVolume(val);
    if (metroChannel && metroChannel.volume) {
      const gain = Math.max(0.00001, val / 100);
      const db = val === 0 ? -Infinity : Tone.gainToDb(gain);
      metroChannel.volume.value = db;
    }
  };

  // --- LOGIQUE DES MACROS PAR FRAPPE (DELTAS) ---

  // 1. Extraire les pistes actives qui représentent de vrais instruments
  const activeTracks = useMemo(() => {
    return tracks.filter(t => !t.isBusFolder && !t.isLinkFolder && t.instrumentIdx !== undefined);
  }, [tracks]);

  // 2. Extraire toutes les frappes uniques programmées sur une piste
  const getActiveStrokesForTrack = (track: TrackGroup) => {
    const activeStrokes = new Set<string>();
    track.patterns.forEach((pattern) => {
      pattern.activeSteps.forEach((step) => {
        if (step !== 0 && typeof step === 'string') {
          activeStrokes.add(step);
        }
      });
      pattern.variations?.forEach((variation) => {
        variation.steps.forEach((step) => {
          if (step !== 0 && typeof step === 'string') {
            activeStrokes.add(step);
          }
        });
      });
    });
    return Array.from(activeStrokes).sort();
  };

  // 3. Calculer les moyennes réelles (volume et decay) pour une frappe donnée sur une piste
  const getStrokeAverages = (track: TrackGroup, stroke: string) => {
    let volSum = 0;
    let volCount = 0;
    let decaySum = 0;
    let decayCount = 0;

    const inst = instrumentsConfig[track.instrumentIdx];
    const isVoice = inst?.type === 'voice';
    const defaultDecay = isVoice ? 10 : 100;

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

    // Récupération de la valeur par défaut anticipée dans les strokeDefaults
    const defaults = strokeDefaults[`${track.id}:${stroke}`];
    return {
      avgVolume: defaults?.volume !== undefined ? defaults.volume : 80,
      avgDecay: defaults?.decay !== undefined ? defaults.decay : defaultDecay,
    };
  };

  // 4. Appliquer un delta de volume relatif sur tous les pas correspondants de la piste, et sauvegarder la valeur par défaut
  const applyMacroVolumeDelta = (trackId: number, stroke: string, delta: number, targetVal: number) => {
    if (pushUndoState) pushUndoState();

    // Enregistrer la macro par défaut anticipée
    setStrokeDefault(`${trackId}:${stroke}`, { volume: targetVal });

    setTracks(prevTracks => prevTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            const newVols = [...(p.volumes || Array(p.steps).fill(80))];
            let hasChanged = false;
            p.activeSteps.forEach((step, idx) => {
              if (step === stroke) {
                newVols[idx] = Math.max(0, Math.min(100, newVols[idx] + delta));
                hasChanged = true;
              }
            });

            const newVariations = p.variations?.map(v => {
              const newVarVols = [...(v.volumes || Array(v.steps.length).fill(80))];
              let varChanged = false;
              v.steps.forEach((step, idx) => {
                if (step === stroke) {
                  newVarVols[idx] = Math.max(0, Math.min(100, newVarVols[idx] + delta));
                  varChanged = true;
                }
              });
              return varChanged ? { ...v, volumes: newVarVols } : v;
            });

            return (hasChanged || p.variations) ? { ...p, volumes: newVols, variations: newVariations } : p;
          })
        };
      }
      return t;
    }));
  };

  // 5. Appliquer un delta de decay relatif sur tous les pas correspondants de la piste, et sauvegarder la valeur par défaut
  const applyMacroDecayDelta = (trackId: number, stroke: string, delta: number, targetVal: number) => {
    if (pushUndoState) pushUndoState();

    // Enregistrer la macro par défaut anticipée
    setStrokeDefault(`${trackId}:${stroke}`, { decay: targetVal });

    setTracks(prevTracks => prevTracks.map(t => {
      if (t.id === trackId) {
        const inst = instrumentsConfig[t.instrumentIdx];
        const isVoice = inst?.type === 'voice';
        const defaultDecay = isVoice ? 10 : 100;

        return {
          ...t,
          patterns: t.patterns.map(p => {
            const newDecays = [...(p.decays || Array(p.steps).fill(defaultDecay))];
            let hasChanged = false;
            p.activeSteps.forEach((step, idx) => {
              if (step === stroke) {
                newDecays[idx] = Math.max(10, Math.min(100, newDecays[idx] + delta));
                hasChanged = true;
              }
            });

            const newVariations = p.variations?.map(v => {
              const newVarDecays = [...(v.decays || Array(v.steps.length).fill(defaultDecay))];
              let varChanged = false;
              v.steps.forEach((step, idx) => {
                if (step === stroke) {
                  newVarDecays[idx] = Math.max(10, Math.min(100, newVarDecays[idx] + delta));
                  varChanged = true;
                }
              });
              return varChanged ? { ...v, decays: newVarDecays } : v;
            });

            return (hasChanged || p.variations) ? { ...p, decays: newDecays, variations: newVariations } : p;
          })
        };
      }
      return t;
    }));
  };

  const sections = [
    { id: 'groove', title: lang === 'pt' ? 'Groove, Kit & Metrônomo' : 'Groove, Kit & Métronome' },
    { id: 'sinais', title: lang === 'pt' ? 'Sinais do Mestre' : 'Sinais do Mestre' },
    { id: 'prensa', title: lang === 'pt' ? 'A Prensa (Partitura)' : 'A Prensa (Partition)' },
    { id: 'performance', title: lang === 'pt' ? 'Desempenho (Performances)' : 'Desempenho (Performances)' },
    { id: 'ajuda', title: lang === 'pt' ? 'Ajuda (Ajuda)' : 'Ajuda (Aide)' },
  ];

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Container Principal Brutaliste */}
      <div className="bg-[#f4ecd8] border-4 border-black w-full max-w-4xl h-[85vh] flex flex-col shadow-[8px_8px_0px_#000] relative overflow-hidden text-[#1a1a1a]">
        
        {/* Header de la page */}
        <div className="bg-black text-[#f4ecd8] px-6 py-4 flex justify-between items-center shrink-0 border-b-4 border-black">
          <h2 className="text-xl md:text-2xl font-cactus font-bold tracking-wider uppercase">
            ⚙️ A Oficina - O Girador
          </h2>
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="bg-[#f4ecd8] text-black border-2 border-black hover:bg-black hover:text-[#f4ecd8] transition-colors px-3 py-1 font-cactus font-black text-lg cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            title="Fechar / Fermer"
          >
            ✕
          </button>
        </div>

        {/* Zone de contenu / Écran de chargement temporisé */}
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar min-h-0 flex flex-col justify-start">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 py-20">
              <div className="animate-spin text-5xl">⚙️</div>
              <span className="font-cactus font-bold text-lg tracking-wider animate-pulse">
                {lang === 'pt' ? 'Carregando A Oficina...' : 'Chargement de A Oficina...'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sections.map((section) => {
                const isOpen = activeSection === section.id;
                return (
                  <div 
                    key={section.id} 
                    className="border-4 border-black bg-white shadow-[4px_4px_0px_#000] flex flex-col overflow-hidden"
                  >
                    {/* Header de Section Accordéon */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full text-left px-5 py-4 font-cactus font-bold text-sm md:text-base uppercase flex justify-between items-center transition-colors bg-white hover:bg-black hover:text-white cursor-pointer select-none border-none outline-none"
                    >
                      <span>{section.title}</span>
                      <span className="font-black text-lg transition-transform duration-200">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    {/* Contenu de Section Accordéon */}
                    {isOpen && (
                      <div className="p-5 border-t-4 border-black bg-[#fbf8f0] text-xs leading-relaxed font-sans text-left">
                        {section.id === 'groove' && (
                          <div className="flex flex-col gap-6">
                            
                            {/* 1. BLOC GROOVE (BALANÇO COMPLET INLINE) */}
                            <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                🌊 {lang === 'fr' ? 'Balanço Général' : 'Balanço Geral'}
                              </h3>
                              <div className="flex flex-col gap-4 text-left">
                                {/* Modes */}
                                <div className="flex flex-col gap-2">
                                  <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Mode de Groove :' : 'Modo de Groove :'}</label>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleSwingModeChange('maracatu')}
                                      className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                                        localSwing.mode === 'maracatu' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
                                      }`}
                                    >
                                      Maracatu
                                    </button>
                                    <button
                                      onClick={() => handleSwingModeChange('custom')}
                                      className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                                        localSwing.mode === 'custom' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
                                      }`}
                                    >
                                      {lang === 'fr' ? 'Personnalisé' : 'Personalizado'}
                                    </button>
                                    <button
                                      onClick={() => handleSwingModeChange('off')}
                                      className={`px-3 py-1.5 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors flex-1 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                                        localSwing.mode === 'off' ? 'bg-black text-white' : 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#d5c3b0]'
                                      }`}
                                    >
                                      {lang === 'fr' ? 'Désactivé' : 'Desativado'}
                                    </button>
                                  </div>
                                </div>

                                {/* Custom blocks */}
                                {localSwing.mode === 'custom' && (
                                  <div className="flex flex-col gap-4 bg-[#eaddcf]/50 p-4 border border-black/10">
                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                                      <span className="font-bold text-[10px] uppercase">
                                        {lang === 'fr' ? 'Micro-timing (4 doubles croches)' : 'Micro-timing (4 semicolcheias)'}
                                      </span>
                                      <button
                                        onClick={handleResetCustom}
                                        className="px-2 py-0.5 bg-white border border-black text-[9px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
                                      >
                                        {lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}
                                      </button>
                                    </div>
                                    
                                    <div className="flex gap-2 justify-around w-full">
                                      {localSwing.customOffsets.map((offset, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                                          
                                          {/* Visuel du carré mobile */}
                                          <div className="relative w-full h-10 flex items-center justify-center">
                                            {/* Axe central pointillé */}
                                            <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-dashed border-black/20 -translate-x-1/2 z-0" />
                                            
                                            {/* Carré de la cellule */}
                                            <div 
                                              className="flex items-center justify-center bg-[#f4ecd8] border border-black shadow-[1.5px_1.5px_0px_#000] z-10 w-7 h-7 font-cactus font-black text-xs transition-transform duration-100"
                                              style={{ 
                                                transform: `translateX(${(offset / 100) * 12}px)` 
                                              }}
                                            >
                                              {idx + 1}
                                            </div>
                                          </div>

                                          {/* Slider horizontal */}
                                          <div className="w-full relative flex items-center">
                                            <input
                                              type="range"
                                              min="-100"
                                              max="100"
                                              value={offset}
                                              onChange={(e) => handleCustomOffsetChange(idx, parseInt(e.target.value, 10))}
                                              className="w-full h-1 bg-black/25 rounded-full appearance-none cursor-pointer outline-none slider-horizontal accent-black"
                                            />
                                          </div>
                                          
                                          {/* Valeur numérique */}
                                          <div className="text-center font-bold text-[9px]">
                                            {offset > 0 ? `+${offset}%` : `${offset}%`}
                                          </div>

                                        </div>
                                      ))}
                                    </div>
                                    
                                    <p className="text-[9px] opacity-75 text-center leading-tight">
                                      {lang === 'fr' 
                                        ? 'Axe vertical = grille théorique. Droite : Retard (+). Gauche : Avance (-).' 
                                        : 'Eixo vertical = grade teórica. Direita: Atraso (+). Esquerda: Avanço (-).'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 2. BLOC MÉTRONOME */}
                            <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                ⏱️ Metrônomo
                              </h3>
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setIsMetroOn(!isMetroOn)}
                                    className={`px-4 py-2 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                                      isMetroOn 
                                        ? 'bg-black text-white' 
                                        : 'bg-white text-black hover:bg-black/5'
                                    }`}
                                  >
                                    {isMetroOn ? 'On' : 'Off'}
                                  </button>
                                  <span className="text-[10px] font-bold">
                                    {lang === 'pt' ? 'Ativar Clique' : 'Activer le Clic'}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span>Volume :</span>
                                    <span>{metroVolume}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={metroVolume}
                                    onChange={(e) => handleMetroVolumeChange(parseInt(e.target.value, 10))}
                                    className="w-full accent-black cursor-pointer h-2 bg-black/10"
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {lang === 'pt' ? 'Som do Metrônomo :' : 'Son du Métronome :'}
                                  </span>
                                  <select
                                    value={metroSound}
                                    onChange={(e) => setMetroSound(e.target.value as any)}
                                    className="bg-white border-2 border-black p-2 font-cactus font-bold text-xs uppercase outline-none cursor-pointer focus:bg-[#fbf8f0] w-full max-w-[200px]"
                                  >
                                    <option value="synth">Synth</option>
                                    <option value="clave">Clave</option>
                                    <option value="cowbell">Cowbell</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* 3. BLOC MONTAGEM DO KIT (MACROS EXHAUSTIVES AVEC FRAPPES FANTÔMES GRISÉES) */}
                            <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                🥁 Montagem do Kit (Macros)
                              </h3>
                              <p className="text-[10px] opacity-75 mb-4">
                                {lang === 'pt' 
                                  ? 'Clique em uma batida para ajustar proporcionalmente seu volume e ressonância. Batidas tracejadas/foscas ainda não estão em uso, mas você pode definir seus valores padrão.'
                                  : 'Cliquez sur une frappe pour régler son volume et sa résonance globale. Les frappes grisées/pointillées ne sont pas utilisées, mais vous pouvez définir leurs valeurs par défaut.'}
                              </p>

                              <div className="flex flex-col gap-4">
                                {activeTracks.length === 0 ? (
                                  <p className="text-[10px] italic opacity-60">Aucun instrument actif dans cette session.</p>
                                ) : (
                                  activeTracks.map((track) => {
                                    const inst = instrumentsConfig[track.instrumentIdx];
                                    const activeStrokes = getActiveStrokesForTrack(track);
                                    
                                    // Obtenir la liste complète des frappes définies pour cet instrument
                                    const allStrokes = getStrokesForInstrument(inst.id, inst.type, lang, sequencer?.isLeftHanded || false);

                                    return (
                                      <div key={track.id} className="border border-black/10 p-3 bg-black/[0.02] flex flex-col gap-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">
                                            {track.customName || inst.name}
                                          </span>
                                          
                                          {/* Pastilles de frappes actives et fantômes */}
                                          <div className="flex flex-wrap gap-1.5">
                                            {allStrokes.map((strokeDef) => {
                                              const stroke = strokeDef.symbol;
                                              const strokeColor = inst.colors[stroke] || '#666';
                                              const strokeTextColor = inst.colors.text || '#f4ecd8';
                                              
                                              const isUsed = activeStrokes.includes(stroke);
                                              const isSelected = selectedMacro?.trackId === track.id && selectedMacro?.stroke === stroke;
                                              
                                              return (
                                                <button
                                                  key={stroke}
                                                  onClick={() => {
                                                    if (isSelected) {
                                                      setSelectedMacro(null);
                                                    } else {
                                                      setSelectedMacro({ trackId: track.id, stroke });
                                                    }
                                                  }}
                                                  className={`w-7 h-7 font-cactus font-black text-xs uppercase flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer hover:scale-105 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
                                                    !isUsed ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''
                                                  }`}
                                                  style={{ 
                                                    backgroundColor: strokeColor, 
                                                    color: strokeTextColor,
                                                    outline: isSelected ? '3px solid #000' : 'none',
                                                    outlineOffset: isSelected ? '1px' : '0px'
                                                  }}
                                                  title={isUsed ? `Macro ${stroke} (Actif)` : `Macro ${stroke} (Anticipé)`}
                                                >
                                                  {stroke}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Panneau Macro Déroulable pour la frappe sélectionnée */}
                                        {selectedMacro && selectedMacro.trackId === track.id && (
                                          (() => {
                                            const stroke = selectedMacro.stroke;
                                            const isUsed = activeStrokes.includes(stroke);
                                            const { avgVolume, avgDecay } = getStrokeAverages(track, stroke);
                                            const isVoice = inst?.type === 'voice';

                                            return (
                                              <div className="mt-2 border-2 border-dashed border-black p-3 bg-white flex flex-col gap-3">
                                                <div className="flex justify-between items-center text-[10px] font-bold border-b border-black/10 pb-1.5">
                                                  <span>
                                                    🎚️ CONFIGURAÇÃO DE GOLPE : [{stroke}] {!isUsed && (lang === 'pt' ? '(INATIVO - ANTECIPADO)' : '(INACTIF - ANTICIPÉ)')}
                                                  </span>
                                                  <button 
                                                    onClick={() => setSelectedMacro(null)}
                                                    className="text-[#8b2a1a] hover:underline uppercase font-bold text-[9px] cursor-pointer"
                                                  >
                                                    Fermer
                                                  </button>
                                                </div>

                                                {/* Volume macro slider */}
                                                <div className="flex flex-col gap-1">
                                                  <div className="flex justify-between text-[10px] font-bold">
                                                    <span>🔊 Volume Global :</span>
                                                    <span>{avgVolume}%</span>
                                                  </div>
                                                  <input 
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={avgVolume}
                                                    onChange={(e) => {
                                                      const val = parseInt(e.target.value, 10);
                                                      const delta = val - avgVolume;
                                                      applyMacroVolumeDelta(track.id, stroke, delta, val);
                                                    }}
                                                    className="w-full accent-green-600 cursor-pointer h-1.5 bg-black/10"
                                                  />
                                                </div>

                                                {/* Decay macro slider */}
                                                <div className="flex flex-col gap-1">
                                                  <div className="flex justify-between text-[10px] font-bold">
                                                    <span>⏳ {isVoice ? (lang === 'fr' ? 'Durée Globale :' : 'Duração Geral :') : 'Decay Global :'}</span>
                                                    <span>{avgDecay}%</span>
                                                  </div>
                                                  <input 
                                                    type="range"
                                                    min="10"
                                                    max="100"
                                                    value={avgDecay}
                                                    onChange={(e) => {
                                                      const val = parseInt(e.target.value, 10);
                                                      const delta = val - avgDecay;
                                                      applyMacroDecayDelta(track.id, stroke, delta, val);
                                                    }}
                                                    className="w-full accent-[#8b2a1a] cursor-pointer h-1.5 bg-black/10"
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })()
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                          </div>
                        )}
                        {section.id === 'sinais' && (
                          <div className="flex flex-col gap-2">
                            <p className="font-bold">📢 Signaux du Mestre (Placeholder)</p>
                            <p className="opacity-70">La sélection et configuration des appels de rythme (signaux du Mestre) seront configurables ici.</p>
                          </div>
                        )}
                        {section.id === 'prensa' && (
                          <div className="flex flex-col gap-2">
                            <p className="font-bold">🖨️ Édition & Impression de Partition (Placeholder)</p>
                            <p className="opacity-70">Les champs d'édition (Titre, Nação, Mestre, etc.) et les options de génération PDF/impression seront placés ici.</p>
                          </div>
                        )}
                        {section.id === 'performance' && (
                          <div className="flex flex-col gap-4">
                            <p className="font-bold">⚡ Télémétrie & Options d'affichage</p>
                            <p className="opacity-70 mb-2">Suivi des performances système en temps réel pour assurer les 60 FPS requis.</p>
                            <TelemetryBadge />
                          </div>
                        )}
                        {section.id === 'ajuda' && (
                          <div className="flex flex-col gap-2">
                            <p className="font-bold">❓ Aide & Raccourcis (Placeholder)</p>
                            <p className="opacity-70">Les guides, tutoriels vidéo, légendes des frappes et modes d'emploi généraux de l'application seront documentés ici.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Brutaliste */}
        <div className="bg-black text-[#f4ecd8]/60 text-[10px] px-6 py-2 flex justify-between shrink-0 border-t-4 border-black">
          <span>O GIRADOR © 2026</span>
          <span className="font-cactus font-bold tracking-wider">A OFICINA (SETTINGS)</span>
        </div>

      </div>
    </div>
  );
};
