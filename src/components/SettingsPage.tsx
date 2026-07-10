import React, { useState, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { TelemetryBadge } from './TelemetryBadge';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig, i18n } from '../data';
import { metroChannel } from '../audio/effectsChain';
import { TrackGroup, Pattern, GlobalSwing, CloudRhythmSignal } from '../types';
import { getStrokesForInstrument } from '../utils/instrumentStrokes';
import { exportTablatureFile, printTablature, printLegendOnly, generateTablatureCore, generateAnnexTablature } from '../utils/exportTablature';
import { ShortcutsGuide } from './right-sidebar/ShortcutsGuide';

interface SettingsPageProps {
  mestreSignals?: CloudRhythmSignal[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ mestreSignals = [] }) => {
  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useSequencerSettingsStore((state) => state.setIsSettingsOpen);
  const balanco = useSequencerSettingsStore((state) => state.balanco);
  const setBalanco = useSequencerSettingsStore((state) => state.setBalanco);
  const strokeDefaults = useSequencerSettingsStore((state) => state.strokeDefaults);
  const setStrokeDefault = useSequencerSettingsStore((state) => state.setStrokeDefault);
  const enabledSignalIds = useSequencerSettingsStore((state) => state.enabledSignalIds);
  const toggleSignalEnabled = useSequencerSettingsStore((state) => state.toggleSignalEnabled);
  const setSignalsBatch = useSequencerSettingsStore((state) => state.setSignalsBatch);
  const forcedStrokes = useSequencerSettingsStore((state) => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore((state) => state.setStrokeForcedState);

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
  const totalMeasures = useSequencerStore((state) => state.totalMeasures);
  const songSections = useSequencerStore((state) => state.songSections);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);
  const isEcoMode = useSequencerStore((state) => state.isEcoMode);
  const ecoConfig = useSequencerStore((state) => state.ecoConfig);
  const toggleEcoMode = useSequencerStore((state) => state.toggleEcoMode);
  const toggleEcoOption = useSequencerStore((state) => state.toggleEcoOption);

  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>('groove');
  const [selectedMacro, setSelectedMacro] = useState<{ trackId: number; stroke: string } | null>(null);

  const sequencer = useSequencer();
  const lang = sequencer?.lang || 'fr';

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  // --- LOGIQUE DES MÉTADONNÉES ET PAROLES (PANNEAU 3) ---
  const letras = sequencer?.letras || '';
  const setLetras = sequencer?.setLetras;
  const metadata = sequencer?.metadata || { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] };
  const setMetadata = sequencer?.setMetadata;

  const handleMetaChange = (field: string, val: any) => {
    if (setMetadata) {
      setMetadata({
        ...metadata,
        [field]: val
      });
    }
  };

  // --- LOGIQUE DE SÉLECTION D'INSTRUMENTS D'EXPORT (PANNEAU 3) ---
  const validExportTracks = useMemo(() => {
    return tracks.filter(t => {
      const conf = instrumentsConfig[t.instrumentIdx];
      return conf && conf.id !== 'apito' && conf.type !== 'voice' && !t.isBusFolder && !t.isLinkFolder;
    });
  }, [tracks]);

  const [selectedExportTracks, setSelectedExportTracks] = useState<Set<number>>(new Set());
  const [selectedAnnexTracks, setSelectedAnnexTracks] = useState<Set<number>>(new Set());

  // Initialisation par défaut avec toutes les pistes d'export valides
  useEffect(() => {
    if (validExportTracks.length > 0 && selectedExportTracks.size === 0) {
      setSelectedExportTracks(new Set(validExportTracks.map(t => t.id)));
    }
  }, [validExportTracks]);

  const handleToggleAll = () => {
    const isAllChecked = validExportTracks.length === selectedExportTracks.size;
    if (isAllChecked) {
      setSelectedExportTracks(new Set());
      setSelectedAnnexTracks(new Set());
    } else {
      setSelectedExportTracks(new Set(validExportTracks.map(t => t.id)));
    }
  };

  const [liveText, setLiveText] = useState<string>('');

  const refreshPreviewText = () => {
    const tracksToExport = tracks.filter(t => selectedExportTracks.has(t.id));
    const outputTxt = generateTablatureCore(
      tracksToExport, 
      totalMeasures, 
      songSections, 
      measureTimeSigs, 
      sequencer?.measureBpms || Array(totalMeasures).fill(83), 
      false
    );
    const annexTxt = generateAnnexTablature(tracks, selectedAnnexTracks, false);
    
    const title = metadata?.toada?.trim() || "O Girador Tablature";
    
    let finalTxt = `TITRE: ${title}\n`;
    if (metadata?.compositor) finalTxt += `COMPOSITEUR: ${metadata.compositor}\n`;
    if (metadata?.ritmo) finalTxt += `RYTHME: ${metadata.ritmo}\n`;
    finalTxt += `\n${outputTxt}`;
    if (annexTxt) finalTxt += annexTxt;
    
    if (letras && letras.trim() !== '') {
      finalTxt += `\n--- VOIX / PAROLES ---\n${letras}\n`;
    }
    
    finalTxt += `\n(Généré avec O Girador)\n`;
    setLiveText(finalTxt);
  };

  useEffect(() => {
    if (activeSection === 'prensa' && selectedExportTracks.size > 0 && !liveText) {
      refreshPreviewText();
    }
  }, [activeSection, selectedExportTracks.size, liveText]);

  const handleToggleTrackExport = (trackId: number, checked: boolean) => {
    const newSet = new Set(selectedExportTracks);
    if (checked) {
      newSet.add(trackId);
    } else {
      newSet.delete(trackId);
      const newAnnexSet = new Set(selectedAnnexTracks);
      newAnnexSet.delete(trackId);
      setSelectedAnnexTracks(newAnnexSet);
    }
    setSelectedExportTracks(newSet);
  };

  const handleToggleTrackAnnex = (trackId: number, checked: boolean) => {
    const newSet = new Set(selectedAnnexTracks);
    if (checked) {
      newSet.add(trackId);
    } else {
      newSet.delete(trackId);
    }
    setSelectedAnnexTracks(newSet);
  };

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

  // --- LOGIQUE DES SIGNAUX DU MESTRE (PANNEAU 2) ---
  const localRhythmSignals = useSequencerStore((state) => state.metadata?.rhythmSignals || []);

  const rhythmSignals = useMemo(() => {
    return [
      ...mestreSignals.map(s => ({ id: s.id, name: s.name, image: s.imageUrl, isCloud: true })),
      ...localRhythmSignals.map(s => ({ id: s.id, name: s.name, image: s.image, isCloud: false }))
    ];
  }, [mestreSignals, localRhythmSignals]);

  const allSignalIds = useMemo(() => rhythmSignals.map(s => s.id), [rhythmSignals]);

  // --- LOGIQUE DES MACROS PAR FRAPPE (DELTAS) ---

  // 1. Extraire les pistes actives qui représentent de vrais instruments
  const activeTracks = useMemo(() => {
    return tracks.filter(t => {
      if (t.isBusFolder || t.isLinkFolder || t.instrumentIdx === undefined) return false;
      const conf = instrumentsConfig[t.instrumentIdx];
      return conf && conf.type !== 'voice';
    });
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

  // --- LOGIQUE DE CALCUL DES FRAPPES ACTIVES PAR INSTRUMENT (PANNEAU 5) ---
  const activeStrokesByInstrument = useMemo(() => {
    const dict: Record<string, string[]> = {};
    activeTracks.forEach(t => {
      const conf = instrumentsConfig[t.instrumentIdx];
      if (conf) {
        const id = conf.id;
        const activeForTrack = getActiveStrokesForTrack(t);
        const allStrokes = getStrokesForInstrument(conf.id, conf.type, lang, sequencer?.isLeftHanded || false);
        
        if (!dict[id]) {
          dict[id] = [];
        }
        allStrokes.forEach(strokeDef => {
          const stroke = strokeDef.symbol;
          const isUsed = activeForTrack.includes(stroke);
          const forced = forcedStrokes[`${t.id}:${stroke}`];
          const isActive = forced !== undefined ? forced : isUsed;
          
          if (isActive && !dict[id].includes(stroke)) {
            dict[id].push(stroke);
          }
        });
      }
    });
    return dict;
  }, [activeTracks, forcedStrokes, lang, sequencer?.isLeftHanded]);

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
    { id: 'groove', title: lang === 'pt' ? 'Balanço, Kit & Metrônomo' : 'Balanço, Kit & Métronome' },
    { id: 'sinais', title: lang === 'pt' ? 'Sinais do Mestre' : 'Sinais do Mestre' },
    { id: 'prensa', title: lang === 'pt' ? 'A Prensa (Partitura)' : 'A Prensa (Partition)' },
    { id: 'performance', title: lang === 'pt' ? 'Desempenho (Performances)' : 'Desempenho (Performances)' },
    { id: 'ajuda', title: lang === 'pt' ? 'Ajuda (Ajuda)' : 'Ajuda (Aide)' },
  ];

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Container Principal Brutaliste */}
      <div className="bg-[#f4ecd8] border-4 border-black w-full md:w-[92vw] max-w-6xl h-[85vh] flex flex-col shadow-[8px_8px_0px_#000] relative overflow-hidden text-[#1a1a1a]">
        
        {/* Header de la page */}
        <div className="bg-black text-[#f4ecd8] px-6 py-4 flex justify-between items-center shrink-0 border-b-4 border-black">
          <h2 className="text-xl md:text-2xl font-cactus font-bold tracking-wider uppercase">
            ⚙️ A Oficina - O Girador
          </h2>
          <div className="flex items-center gap-3">
            {/* Commutateur de langue brutaliste */}
            <div className="flex border-2 border-[#f4ecd8] bg-black text-[10px] md:text-xs font-cactus font-bold uppercase overflow-hidden shadow-[2px_2px_0px_#f4ecd8]/20">
              <button
                onClick={() => sequencer?.setLang && sequencer.setLang('fr')}
                className={`px-2 py-1 cursor-pointer transition-colors ${
                  lang === 'fr' 
                    ? 'bg-[#f4ecd8] text-black font-black font-cactus' 
                    : 'bg-black text-[#f4ecd8] hover:bg-[#f4ecd8]/10'
                }`}
                title="Passer en Français"
              >
                FR
              </button>
              <div className="w-[2px] bg-[#f4ecd8]/30"></div>
              <button
                onClick={() => sequencer?.setLang && sequencer.setLang('pt')}
                className={`px-2 py-1 cursor-pointer transition-colors ${
                  lang === 'pt' 
                    ? 'bg-[#f4ecd8] text-black font-black font-cactus' 
                    : 'bg-black text-[#f4ecd8] hover:bg-[#f4ecd8]/10'
                }`}
                title="Mudar para Português"
              >
                PT
              </button>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="bg-[#f4ecd8] text-black border-2 border-black hover:bg-black hover:text-[#f4ecd8] transition-colors px-3 py-1 font-cactus font-black text-lg cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              title={lang === 'fr' ? 'Fermer' : 'Fechar'}
            >
              ✕
            </button>
          </div>
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
                    className="border-t-2 border-b-4 border-l-3 border-r-2 border-black rounded-[4px_10px_6px_12px] bg-white shadow-[4px_4px_0px_#000] flex flex-col overflow-hidden"
                  >
                    {/* Header de Section Accordéon */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full text-left px-4 py-2.5 font-cactus font-bold text-xs md:text-sm uppercase flex justify-between items-center transition-colors bg-white hover:bg-black hover:text-white cursor-pointer select-none border-none outline-none"
                    >
                      <span>{section.title}</span>
                      <span className="font-black text-lg transition-transform duration-200">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    {/* Contenu de Section Accordéon */}
                    {isOpen && (
                      <div className="p-5 border-t-2 border-black bg-[#fbf8f0] text-xs leading-relaxed font-sans text-left">
                        {section.id === 'groove' && (
                          <div className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* 1. BLOC GROOVE (BALANÇO COMPLET INLINE) */}
                            <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
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
                            <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                ⏱️ Metrônomo
                              </h3>
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-3">
                                  {/* Gauche : Activer Clic */}
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

                                  {/* Droite : Choix du son */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                      {lang === 'pt' ? 'Som :' : 'Son :'}
                                    </span>
                                    <select
                                      value={metroSound}
                                      onChange={(e) => setMetroSound(e.target.value as any)}
                                      className="bg-white border-2 border-black p-1.5 font-cactus font-bold text-xs uppercase outline-none cursor-pointer focus:bg-[#fbf8f0] min-w-[100px]"
                                    >
                                      <option value="synth">Synth</option>
                                      <option value="clave">Clave</option>
                                      <option value="cowbell">Cowbell</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Volume */}
                                <div className="flex flex-col gap-1">
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
                                    className="w-full accent-black cursor-pointer h-1.5 bg-black/10"
                                  />
                                </div>
                              </div>
                            </div>
                            </div>

                            {/* 3. BLOC MONTAGEM DO KIT (MACROS EXHAUSTIVES AVEC FRAPPES FANTÔMES GRISÉES) */}
                            <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[4px_10px_6px_12px] p-4 bg-white shadow-[3.5px_3.5px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                🥁 Montagem do Kit (Macros)
                              </h3>
                              <p className="text-[10px] opacity-75 mb-4">
                                {lang === 'pt' 
                                  ? 'Clique em uma batida para ajustar proporcionalmente seu volume e ressonância. Batidas tracejadas/foscas ainda não estão em uso, mas você pode definir seus valores padrão.'
                                  : 'Cliquez sur une frappe pour régler son volume et sa résonance globale. Les frappes grisées/pointillées ne sont pas utilisées, mais vous pouvez définir leurs valeurs par défaut.'}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                              const forced = forcedStrokes[`${track.id}:${stroke}`];
                                              const isActive = forced !== undefined ? forced : isUsed;
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
                                                  className={`w-7 h-7 font-mono font-bold text-xs normal-case flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer hover:scale-105 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
                                                    !isActive ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''
                                                  }`}
                                                  style={{ 
                                                    backgroundColor: strokeColor, 
                                                    color: strokeTextColor,
                                                    outline: isSelected ? '3px solid #000' : 'none',
                                                    outlineOffset: isSelected ? '1px' : '0px'
                                                  }}
                                                  title={`${stroke} : ${strokeDef.label} (${isActive ? (lang === 'fr' ? 'Actif' : 'Ativo') : (lang === 'fr' ? 'Anticipé' : 'Antecipado')})`}
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
                                                <div className="flex justify-between items-center text-[10px] font-bold border-b border-black/10 pb-1.5 flex-wrap gap-2">
                                                   <div className="flex items-center gap-2 flex-wrap">
                                                     <span>
                                                       🎚️ CONFIGURAÇÃO DE GOLPE : [{stroke}]
                                                     </span>
                                                     {/* Bouton de forçage d'activation/désactivation de frappe */}
                                                     <button
                                                       onClick={() => {
                                                         const currentForced = forcedStrokes[`${track.id}:${stroke}`];
                                                         const isStrokeCurrentlyActive = currentForced !== undefined ? currentForced : isUsed;
                                                         setStrokeForcedState(`${track.id}:${stroke}`, !isStrokeCurrentlyActive);
                                                       }}
                                                       className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
                                                         (forcedStrokes[`${track.id}:${stroke}`] !== undefined ? forcedStrokes[`${track.id}:${stroke}`] : isUsed)
                                                           ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' 
                                                           : 'bg-red-700 text-white border-red-800 hover:bg-red-800'
                                                       }`}
                                                       title={lang === 'fr' 
                                                         ? 'Cliquez pour forcer l\'activation ou la désactivation de cette frappe dans le kit'
                                                         : 'Clique para forçar a ativação ou desativação desta batida no kit'}
                                                     >
                                                       {(forcedStrokes[`${track.id}:${stroke}`] !== undefined ? forcedStrokes[`${track.id}:${stroke}`] : isUsed)
                                                         ? '● ACTIF' 
                                                         : '○ DÉSACTIVÉ'}
                                                     </button>
                                                   </div>
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
                          <div className="flex flex-col gap-4 text-left">
                            <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                              📢 {lang === 'fr' ? 'Sélection des Appels du Mestre' : 'Seleção dos Sinais do Mestre'}
                            </h3>
                            <p className="text-[10px] opacity-75">
                              {lang === 'fr'
                                ? 'Décochez les signaux visuels que vous ne souhaitez pas afficher dans le menu déroulant de votre timeline pour simplifier la grille.'
                                : 'Desmarque os sinais visuais que você não deseja exibir no menu suspenso da sua linha do tempo para simplificar a grade.'}
                            </p>

                            {rhythmSignals.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-2 border-black p-3 bg-[#eaddcf]/30 mb-2">
                                <div className="flex flex-col gap-2">
                                  <span className="font-bold text-[10px] uppercase text-black/60">
                                    🌐 {lang === 'fr' ? 'Signaux Cloud' : 'Sinais Cloud'}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const cloudIds = rhythmSignals.filter(s => s.isCloud).map(s => s.id);
                                        setSignalsBatch(cloudIds, true, allSignalIds);
                                      }}
                                      className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer transition-colors shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                                    >
                                      {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const cloudIds = rhythmSignals.filter(s => s.isCloud).map(s => s.id);
                                        setSignalsBatch(cloudIds, false, allSignalIds);
                                      }}
                                      className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-[#8b2a1a] hover:text-white cursor-pointer transition-colors shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                                    >
                                      {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <span className="font-bold text-[10px] uppercase text-black/60">
                                    💻 {lang === 'fr' ? 'Signaux Locaux' : 'Sinais Locais'}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const localIds = rhythmSignals.filter(s => !s.isCloud).map(s => s.id);
                                        setSignalsBatch(localIds, true, allSignalIds);
                                      }}
                                      className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer transition-colors shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                                    >
                                      {lang === 'fr' ? 'Tout cocher' : 'Selecionar Todos'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const localIds = rhythmSignals.filter(s => !s.isCloud).map(s => s.id);
                                        setSignalsBatch(localIds, false, allSignalIds);
                                      }}
                                      className="px-2 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-[#8b2a1a] hover:text-white cursor-pointer transition-colors shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                                    >
                                      {lang === 'fr' ? 'Tout décocher' : 'Desmarcar Todos'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {rhythmSignals.length === 0 ? (
                              <p className="text-[10px] italic opacity-60">
                                {lang === 'fr' ? 'Aucun signal disponible dans ce projet.' : 'Nenhum sinal disponível neste projeto.'}
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                                {rhythmSignals.map((sig) => {
                                  const isEnabled = enabledSignalIds === null || enabledSignalIds.includes(sig.id);
                                  
                                  return (
                                    <button
                                      key={sig.id}
                                      onClick={() => toggleSignalEnabled(sig.id, allSignalIds)}
                                      className={`border-2 border-black p-3 bg-white flex flex-col items-center gap-2 cursor-pointer text-center relative shadow-[3px_3px_0px_#000] hover:scale-[1.02] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none ${
                                        isEnabled 
                                          ? 'bg-white border-black font-bold' 
                                          : 'opacity-40 grayscale bg-gray-50 border-dashed shadow-none'
                                      }`}
                                    >
                                      {/* Checkbox Brutaliste */}
                                      <div className="absolute top-1.5 right-1.5 w-4 h-4 border-2 border-black bg-white flex items-center justify-center font-cactus text-[9px] font-black text-black">
                                        {isEnabled ? '✓' : ''}
                                      </div>

                                      {/* Image / Icône de Signal */}
                                      <div className="w-12 h-12 flex items-center justify-center bg-black/5 border border-black/10 rounded overflow-hidden">
                                        {sig.image ? (
                                          <img src={sig.image} alt={sig.name} className="w-full h-full object-contain" />
                                        ) : (
                                          <span className="text-xl">📢</span>
                                        )}
                                      </div>

                                      {/* Nom du Signal */}
                                      <span className="text-[9px] uppercase font-bold tracking-wider truncate w-full">
                                        {sig.name}
                                      </span>
                                      
                                      {/* Badge Cloud / Local */}
                                      <span className="text-[8px] opacity-50 font-normal">
                                        {sig.isCloud ? 'Cloud' : 'Local'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {section.id === 'prensa' && (
                          <div className="flex flex-col gap-6 text-left">
                            
                            {/* Zone de configuration (Haut) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Colonne de Gauche : Métadonnées et Paroles */}
                              <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                                <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                  📝 Informações da Toada
                                </h3>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="font-bold text-[10px] uppercase">Título / Titre :</label>
                                    <input 
                                      type="text"
                                      value={metadata.toada || ''}
                                      onChange={(e) => handleMetaChange('toada', e.target.value)}
                                      className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
                                      placeholder="Nome da Toada"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="font-bold text-[10px] uppercase">Mestre / Compositeur :</label>
                                    <input 
                                      type="text"
                                      value={metadata.compositor || ''}
                                      onChange={(e) => handleMetaChange('compositor', e.target.value)}
                                      className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
                                      placeholder="Mestre / Compositor"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="font-bold text-[10px] uppercase">Ritmo / Rythme :</label>
                                    <input 
                                      type="text"
                                      value={metadata.ritmo || ''}
                                      onChange={(e) => handleMetaChange('ritmo', e.target.value)}
                                      className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
                                      placeholder="Ex: Maracatu Nação"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 flex-grow">
                                  <label className="font-bold text-[10px] uppercase">Letras / Paroles :</label>
                                  <textarea
                                    rows={5}
                                    value={letras}
                                    onChange={(e) => setLetras && setLetras(e.target.value)}
                                    className="bg-white border-2 border-black font-sans font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none resize-none custom-scrollbar flex-grow"
                                    placeholder="Digite as letras aqui..."
                                  />
                                </div>
                              </div>

                              {/* Colonne de Droite : Sélection d'instruments */}
                              <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                                <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                  🥁 Seleção de Instrumentos
                                </h3>
                                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar flex-grow">
                                  
                                  {/* Case "Tous les instruments" */}
                                  <label className="flex items-center gap-3 p-2 border-2 border-black bg-white cursor-pointer hover:bg-black/5 transition-colors select-none">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 cursor-pointer accent-black"
                                      checked={validExportTracks.length === selectedExportTracks.size}
                                      onChange={handleToggleAll}
                                    />
                                    <span className="font-cactus font-bold text-xs uppercase">
                                      {lang === 'fr' ? 'Tous les instruments' : 'Todos os instrumentos'}
                                    </span>
                                  </label>

                                  {/* Liste des instruments actifs */}
                                  {validExportTracks.map(track => {
                                    const conf = instrumentsConfig[track.instrumentIdx];
                                    if (!conf) return null;
                                    
                                    const isExportChecked = selectedExportTracks.has(track.id);
                                    const isAnnexChecked = selectedAnnexTracks.has(track.id);

                                    return (
                                      <div key={track.id} className="grid grid-cols-2 gap-2 p-2 border border-black/20 bg-black/[0.01] ml-4">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-black/5 transition-colors select-none truncate">
                                          <input 
                                            type="checkbox" 
                                            className="w-3.5 h-3.5 cursor-pointer accent-black"
                                            checked={isExportChecked}
                                            onChange={(e) => handleToggleTrackExport(track.id, e.target.checked)}
                                          />
                                          <span className="font-cactus text-xs font-bold text-[#8b2a1a] uppercase truncate">{conf.name}</span>
                                        </label>
                                        
                                        <label className={`flex items-center gap-2 cursor-pointer transition-all select-none ${!isExportChecked ? 'opacity-40 pointer-events-none' : 'hover:bg-black/5'}`}>
                                          <input 
                                            type="checkbox" 
                                            className="w-3 h-3 cursor-pointer accent-black"
                                            checked={isAnnexChecked}
                                            disabled={!isExportChecked}
                                            onChange={(e) => handleToggleTrackAnnex(track.id, e.target.checked)}
                                          />
                                          <span className="font-sans text-[10px] opacity-80">
                                            {lang === 'fr' ? 'Variation' : 'Variação'}
                                          </span>
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                             {/* 3. PLAN DE TRAVAIL (ÉDITEUR LIVETEXT INTERACTIF) */}
                             <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[4px_10px_6px_12px] p-4 bg-white shadow-[3.5px_3.5px_0px_#000] flex flex-col gap-4">
                               <div className="flex justify-between items-center border-b border-black/10 pb-1.5 flex-wrap gap-2">
                                 <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-1.5">
                                   ✍️ {lang === 'fr' ? 'Plan de Travail - Éditeur de Partition' : 'Planilha de Trabalho - Editor de Partitura'}
                                 </h3>
                                 <button
                                   onClick={refreshPreviewText}
                                   className="px-3 py-1 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase cursor-pointer hover:bg-[#8b2a1a] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                                 >
                                   🔄 {lang === 'fr' ? "Régénérer depuis l'Atelier" : 'Gerar da Oficina'}
                                 </button>
                               </div>
                               <p className="text-[10px] italic opacity-60 text-center border-b border-dashed border-black/15 pb-2">
                                 📋 {lang === 'fr' 
                                   ? "Consigne d'atelier : Vous pouvez modifier, aérer ou annoter directement la partition ci-dessous avant impression ou export."
                                   : "Instrução de oficina: Você pode editar, espaçar ou anotar diretamente a partitura abaixo antes de imprimir ou exportar."}
                               </p>
                               <div className="w-full p-4 md:p-8 bg-black/5 border border-black/10 rounded-md overflow-x-auto flex justify-center">
                                 <textarea
                                   value={liveText}
                                   onChange={(e) => setLiveText(e.target.value)}
                                   className="w-full max-w-[21cm] min-h-[60vh] md:min-h-[29.7cm] bg-[#fbf8f0] text-black font-mono text-[11px] leading-relaxed p-6 md:p-12 outline-none shadow-[0px_10px_25px_rgba(0,0,0,0.15)] md:shadow-[0px_15px_40px_rgba(0,0,0,0.25)] border border-black/5 resize-y custom-scrollbar text-[#1a1a1a]"
                                   placeholder="Générez ou tapez la partition ici..."
                                 />
                               </div>
                             </div>

                             {/* 4. AÇÕES DE IMPRESSÃO */}
                             <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                🖨️ Ações de Impressão & Exportação
                              </h3>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                  onClick={() => {
                                    exportTablatureFile(
                                      liveText, 
                                      selectedAnnexTracks, 
                                      undefined, 
                                      undefined, 
                                      metadata
                                    );
                                  }}
                                  disabled={!liveText}
                                  className="px-3 py-2 text-[10px] bg-[#eaddcf] text-black border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-black hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
                                >
                                  {lang === 'fr' ? 'Télécharger (.txt)' : 'Baixar (.txt)'}
                                </button>

                                <button
                                  onClick={() => {
                                    printTablature(
                                      liveText, 
                                      selectedAnnexTracks, 
                                      undefined, 
                                      undefined, 
                                      metadata
                                    );
                                  }}
                                  disabled={!liveText}
                                  className="px-3 py-2 text-[10px] bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
                                >
                                  {lang === 'fr' ? 'Imprimer (HTML)' : 'Imprimir (HTML)'}
                                </button>
                              </div>

                              <div className="border-t border-dashed border-black/20 pt-3">
                                <button
                                  onClick={printLegendOnly}
                                  className="w-full px-3 py-2 text-[10px] bg-white text-black border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
                                >
                                  {lang === 'fr' ? '🖨️ Imprimer la Légende' : '🖨️ Imprimir a Legenda'}
                                </button>
                              </div>
                            </div>

                          </div>
                        )}
                        {section.id === 'performance' && (
                          <div className="flex flex-col gap-6 text-left">
                            
                            {/* Grille supérieure : Télémétrie + Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* TÉLÉMÉTRIE */}
                              <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-2">
                                <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                  ⚡ Télémétrie en Temps Réel
                                </h3>
                                <p className="text-[10px] opacity-75 mb-2">
                                  {lang === 'fr' 
                                    ? "Suivi des performances pour assurer un rendu fluide à 60 FPS sans coupure audio." 
                                    : "Monitoramento de desempenho para garantir renderização fluida a 60 FPS sem engasgos de áudio."}
                                </p>
                                <TelemetryBadge />
                              </div>

                              {/* CONFIGURATION MODE ÉCO */}
                              <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                                <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                  ⚙️ {lang === 'fr' ? 'Configuration des Performances' : 'Configurações de Desempenho'}
                                </h3>
                                
                                {/* Interrupteur Maître */}
                                <label className="flex items-center gap-3 p-3 border-2 border-black bg-[#f4ecd8]/40 cursor-pointer hover:bg-black/5 transition-colors select-none">
                                  <input 
                                    type="checkbox" 
                                    className="w-5 h-5 cursor-pointer accent-black"
                                    checked={isEcoMode}
                                    onChange={toggleEcoMode}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-cactus font-bold text-xs uppercase">
                                      {lang === 'fr' ? 'Mode Éco Maître (Recommandé)' : 'Modo Eco Mestre (Recomendado)'}
                                    </span>
                                    <span className="text-[9px] opacity-70">
                                      {lang === 'fr' 
                                        ? "Active automatiquement toutes les options d'économie d'énergie." 
                                        : "Ativa automaticamente todas as opções de economia de energia."}
                                    </span>
                                  </div>
                                </label>

                                {/* Options granulaires (Empilées verticalement) */}
                                <div className="flex flex-col gap-3 pl-2 border-l-2 border-dashed border-black/30 mt-2">
                                  {/* Option FX */}
                                  <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 transition-colors select-none">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 cursor-pointer accent-black"
                                      checked={!!ecoConfig?.disableFx}
                                      onChange={() => toggleEcoOption('disableFx')}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-cactus text-xs font-bold text-black uppercase">
                                        {lang === 'fr' ? 'Désactiver les Effets (Reverb/Compressor)' : 'Desativar Efeitos (Reverb/Compressor)'}
                                      </span>
                                      <span className="text-[9px] opacity-70">
                                        {lang === 'fr' 
                                          ? "Bypasse la réverbération spatiale et la compression master." 
                                          : "Ignora a reverberação espacial e compressão master."}
                                      </span>
                                    </div>
                                  </label>

                                  {/* Option EQ */}
                                  <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 transition-colors select-none">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 cursor-pointer accent-black"
                                      checked={!!ecoConfig?.disableEq}
                                      onChange={() => toggleEcoOption('disableEq')}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-cactus text-xs font-bold text-black uppercase">
                                        {lang === 'fr' ? 'Désactiver les Égaliseurs par piste' : 'Desativar Equalizadores por canal'}
                                      </span>
                                      <span className="text-[9px] opacity-70">
                                        {lang === 'fr' 
                                          ? "Bypasse les bandes d'égalisation (EQ) individuelles sur la table de mixage." 
                                          : "Ignora as bandas de equalização (EQ) individuais no mixer."}
                                      </span>
                                    </div>
                                  </label>

                                  {/* Option Animations */}
                                  <label className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-1 transition-colors select-none">
                                    <input 
                                      type="checkbox" 
                                      className="w-4 h-4 cursor-pointer accent-black"
                                      checked={!!ecoConfig?.disableAnimations}
                                      onChange={() => toggleEcoOption('disableAnimations')}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-cactus text-xs font-bold text-black uppercase">
                                        {lang === 'fr' ? 'Désactiver les Animations (30 FPS)' : 'Desativar Animações (30 FPS)'}
                                      </span>
                                      <span className="text-[9px] opacity-70">
                                        {lang === 'fr' 
                                          ? "Limite l'affichage et la rotation à 30 FPS pour soulager le GPU." 
                                          : "Limita o display e a rotação a 30 FPS para aliviar o GPU."}
                                      </span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>

                             {/* PURGE DU CACHE */}
                             <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-[#8b2a1a] rounded-[4px_10px_6px_12px] p-4 bg-[#fbf8f0] shadow-[3px_3px_0px_#8b2a1a] flex flex-col gap-4">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-[#8b2a1a]/20 pb-1 text-[#8b2a1a]">
                                🖨️ {lang === 'fr' ? 'Purge de l\'Atelier' : 'Limpar Oficina'}
                              </h3>
                              <p className="text-[10px] italic opacity-85">
                                {lang === 'fr'
                                  ? "Si le son bégaie ou que la mémoire s'étouffe, purgez l'atelier pour repartir sur une toile vierge."
                                  : "Se o som engasgar ou a memória ficar cheia, limpe a oficina para começar do zero."}
                              </p>
                              
                              <button
                                onClick={async () => {
                                  const confirmText = lang === 'fr' 
                                    ? "Attention, vous devrez re-télécharger les sons avec une connexion internet à la prochaine ouverture. Voulez-vous continuer ?"
                                    : "Atenção, você precisará baixar novamente os sons com uma conexão de internet na próxima vez que abrir. Deseja continuar ?";
                                  if (window.confirm(confirmText)) {
                                    try {
                                      if ('caches' in window) {
                                        const keys = await caches.keys();
                                        for (const key of keys) {
                                          await caches.delete(key);
                                        }
                                      }
                                      if ('serviceWorker' in navigator) {
                                        const registrations = await navigator.serviceWorker.getRegistrations();
                                        for (const reg of registrations) {
                                          await reg.unregister();
                                        }
                                      }
                                      alert(lang === 'fr' ? "Le cache a été purgé avec succès. Rechargement de la page..." : "O cache foi limpo com sucesso. Recarregando a página...");
                                      window.location.reload();
                                    } catch (err) {
                                      console.error('Error purging cache:', err);
                                    }
                                  }
                                }}
                                className="w-full px-4 py-3 text-xs bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-black hover:text-white shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
                                style={{
                                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)'
                                }}
                              >
                                {lang === 'fr' ? 'Purger le Cache Local' : 'Purger o Cache Local'}
                              </button>
                            </div>

                          </div>
                        )}
                        {section.id === 'ajuda' && (
                          <div className="flex flex-col gap-5 text-left">
                            
                            {/* Manuel / Mode d'emploi */}
                            <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                📖 {lang === 'fr' ? "Mode d'Emploi de l'Atelier" : 'Manual da Oficina'}
                              </h3>
                              <p className="text-[10px] opacity-75">
                                {lang === 'fr' 
                                  ? "Accédez au guide illustré complet pour apprendre à utiliser les fonctions de la Roda, de la Timeline, de la synthèse vocale et de l'exportation."
                                  : "Acesse o guia ilustrado completo para aprender a usar os recursos da Roda, Linha do tempo, sintetizador de voz e exportação."}
                              </p>
                              
                              <button
                                onClick={() => window.open('tutorial.html', '_blank')}
                                className="w-full px-4 py-3 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
                              >
                                {lang === 'fr' ? 'Abrir o Manual / Ouvrir le Mode d\'Emploi' : 'Abrir o Manual / Ouvrir le Mode d\'Emploi'}
                              </button>
                            </div>

                            {/* Légende Dynamique */}
                            <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-3 max-h-[45vh] min-h-[30vh]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                📝 {lang === 'fr' ? 'Légende des Frappes Actives' : 'Legenda das Batidas Ativas'}
                              </h3>
                              <p className="text-[10px] opacity-75 mb-1">
                                {lang === 'fr' 
                                  ? "Voici la liste des raccourcis clavier et notations pour les instruments de la partition courante. Les instruments non programmés sont automatiquement masqués."
                                  : "Esta é a lista de atalhos e notações para os instrumentos do ritmo atual. Instrumentos não programados são ocultados automaticamente."}
                              </p>
                              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                <ShortcutsGuide 
                                  lang={lang} 
                                  t={t} 
                                  activeStrokesByInstrument={activeStrokesByInstrument} 
                                />
                              </div>
                            </div>

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
