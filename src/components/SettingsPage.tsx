import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as Tone from 'tone';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { audioEngine } from '../hooks/useAudioSync';
import { useTransportStore } from '../stores/useTransportStore';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { TelemetryBadge } from './TelemetryBadge';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig, i18n } from '../data';
import { metroChannel } from '../audio/effectsChain';
import { TrackGroup, Pattern, GlobalSwing, CloudRhythmSignal } from '../types';
import { getStrokesForInstrument } from '../utils/instrumentStrokes';
import { exportTablatureFile, printTablature, printLegendOnly, generateTablatureCore, generateAnnexTablature } from '../utils/exportTablature';
import { lazyWithRetry } from '../utils/lazyWithRetry';
const ShortcutsGuide = lazyWithRetry(() => import('./right-sidebar/ShortcutsGuide').then(m => ({ default: m.ShortcutsGuide })), 'ShortcutsGuide');
import { MidiManagerPanel } from './MidiManagerPanel';
import { useAudioStore } from '../stores/useAudioStore';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { BalancoEditorPanel } from './balanco/BalancoEditorPanel';
import { useAudio } from '../contexts/AudioContext';
import { useWorkspaceTemplateStore } from '../stores/useWorkspaceTemplateStore';
import { useDesktopWorkspaceStore } from '../stores/useDesktopWorkspaceStore';
import { WorkspaceTemplate } from '../types';
import { DesktopWorkspaceLayout } from '../types/desktopWorkspace.types';
import { XiloScroll } from './XiloIcons';

interface SettingsPageProps {
  mestreSignals?: CloudRhythmSignal[];
}

const SettingsSignalThumb: React.FC<{ name: string; image?: string }> = ({ name, image }) => {
  const [hasError, setHasError] = useState(false);
  const initials = name
    ? name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('')
    : 'SG';

  if (!image || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 text-[10px] font-cactus font-bold text-[var(--cordel-wood)]">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name}
      onError={() => setHasError(true)}
      className="w-full h-full object-contain"
    />
  );
};

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

  const { userProfile, updateUserProfileField } = useAuth();
  const isMestre = userProfile && (userProfile.role === 'mestre' || userProfile.role === 'admin');

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
  const [isClosing, setIsClosing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('groove');
  const [selectedMacro, setSelectedMacro] = useState<{ trackId: number; stroke: string } | null>(null);

  // --- AUDIO I/O ---
  const selectedDeviceId = useAudioStore((state) => state.selectedDeviceId);
  const selectedOutputDeviceId = useAudioStore((state) => state.selectedOutputDeviceId);
  const availableDevices = useAudioStore((state) => state.availableDevices);
  const availableOutputDevices = useAudioStore((state) => state.availableOutputDevices);
  const setSelectedDeviceId = useAudioStore((state) => state.setSelectedDeviceId);
  const setSelectedOutputDeviceId = useAudioStore((state) => state.setSelectedOutputDeviceId);
  const refreshAudioDevices = useAudioStore((state) => state.refreshAudioDevices);
  const [isAskingPermission, setIsAskingPermission] = useState(false);

  const handleRequestAudioPermission = async () => {
    setIsAskingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await refreshAudioDevices();
    } catch (err: any) {
      alert(lang === 'fr' 
        ? "Impossible d'accéder à l'audio : " + err.message 
        : "Erro ao acessar áudio: " + err.message);
    } finally {
      setIsAskingPermission(false);
    }
  };

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

  // --- GABARITS DE BATERIA / WORKSPACE TEMPLATES ---
  const workspaceTemplates = useWorkspaceTemplateStore((state) => state.templates);
  const deleteWorkspaceTemplate = useWorkspaceTemplateStore((state) => state.deleteTemplate);
  const renameWorkspaceTemplate = useWorkspaceTemplateStore((state) => state.renameTemplate);
  const syncWorkspaceTemplates = useWorkspaceTemplateStore((state) => state.syncWithCloud);
  const isSyncingTemplates = useWorkspaceTemplateStore((state) => state.isSyncing);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const audio = useAudio();

  const handleLoadTemplate = (tpl: WorkspaceTemplate) => {
    const confirmMsg = lang === 'pt'
      ? `Carregar o modelo "${tpl.name}" irá substituir o batuque atual por este modelo vazio. Deseja continuar?`
      : `Charger le gabarit "${tpl.name}" va remplacer le batuque actuel par ce gabarit vierge. Voulez-vous continuer ?`;
    if (window.confirm(confirmMsg)) {
      useSequencerStore.getState().handleCreateFromTemplate(tpl, audio);
      handleClose();
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingTemplateName.trim()) {
      renameWorkspaceTemplate(id, editingTemplateName.trim());
    }
    setEditingTemplateId(null);
    setEditingTemplateName('');
  };

  const handleDeleteTemplate = (id: string) => {
    deleteWorkspaceTemplate(id);
    setConfirmDeleteId(null);
  };

  // --- ESPACES DE TRAVAIL (MULTI-ÉCRANS & FENÊTRES) ---
  // Actif sur tout ordinateur (Windows, Mac, Linux) y compris en fenêtres scindées (split-screen),
  // et sur tout écran de résolution >= 768px.
  const isDesktop = typeof window !== 'undefined' && (
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.screen.width >= 768
  );
  const desktopLayouts = useDesktopWorkspaceStore((state) => state.layouts);
  const activeDesktopLayoutId = useDesktopWorkspaceStore((state) => state.activeLayoutId);
  const saveCurrentDesktopLayout = useDesktopWorkspaceStore((state) => state.saveCurrentLayout);
  const applyDesktopLayout = useDesktopWorkspaceStore((state) => state.applyLayout);
  const deleteDesktopLayout = useDesktopWorkspaceStore((state) => state.deleteLayout);
  const renameDesktopLayout = useDesktopWorkspaceStore((state) => state.renameLayout);

  const [isSavingLayoutModalOpen, setIsSavingLayoutModalOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');
  const [confirmDeleteLayoutId, setConfirmDeleteLayoutId] = useState<string | null>(null);
  const [appliedLayoutNotification, setAppliedLayoutNotification] = useState<string | null>(null);

  const handleSaveNewLayout = () => {
    if (!newLayoutName.trim()) return;
    saveCurrentDesktopLayout(newLayoutName.trim());
    setIsSavingLayoutModalOpen(false);
    setNewLayoutName('');
  };

  const handleApplyLayout = (id: string, name: string) => {
    const success = applyDesktopLayout(id);
    if (success) {
      setAppliedLayoutNotification(
        lang === 'pt'
          ? `Espaço de trabalho "${name}" aplicado com sucesso!`
          : `Espace de travail "${name}" appliqué avec succès !`
      );
      setTimeout(() => setAppliedLayoutNotification(null), 3500);
    }
  };

  const handleSaveLayoutRename = (id: string) => {
    if (editingLayoutName.trim()) {
      renameDesktopLayout(id, editingLayoutName.trim());
    }
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

  const handleDeleteLayout = (id: string) => {
    deleteDesktopLayout(id);
    setConfirmDeleteLayoutId(null);
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
  const [bodyFontSize, setBodyFontSize] = useState<number>(13);

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
    
    let finalTxt = outputTxt;
    if (annexTxt) finalTxt += annexTxt;
    
    if (letras && letras.trim() !== '') {
      finalTxt += lang === 'fr' 
        ? `\n--- VOIX / PAROLES ---\n${letras}\n`
        : `\n--- VOZES / LETRAS ---\n${letras}\n`;
    }
    
    finalTxt += lang === 'fr' ? `\n(Généré avec O Girador)\n` : `\n(Gerado com O Girador)\n`;
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


  // Latence artificielle pour protéger le thread audio d'un pic de render synchrone
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 85);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsSettingsOpen(false);
      setIsClosing(false);
    }, 85);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const localRhythmSignals = useSequencerStore((state) => state.metadata?.rhythmSignals || []);

  const rhythmSignals = useMemo(() => {
    return [
      ...mestreSignals.map(s => {
        const resolvedImage = (s.frames && s.frames[0] && s.frames[0].startsWith('data:'))
          ? s.frames[0]
          : (s.image && s.image.startsWith('data:'))
            ? s.image
            : (s.imageUrl && s.imageUrl.startsWith('data:'))
              ? s.imageUrl
              : (s.image || s.imageUrl || '');
        return { id: s.id, name: s.name, image: resolvedImage, isCloud: true };
      }),
      ...localRhythmSignals.map(s => {
        const resolvedImage = (s.frames && s.frames[0] && s.frames[0].startsWith('data:'))
          ? s.frames[0]
          : (s.image && s.image.startsWith('data:'))
            ? s.image
            : (s.image || '');
        return { id: s.id, name: s.name, image: resolvedImage, isCloud: false };
      })
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
    
    let patternsToScan = track.patterns;
    if (track.linkedToTrackId && !track.isLinkFolder) {
      const parentBus = tracks.find(p => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
      if (parentBus) {
        patternsToScan = parentBus.patterns;
      }
    }

    if (patternsToScan) {
      patternsToScan.forEach((pattern) => {
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
    }
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
    { id: 'gabarits', title: lang === 'pt' ? '📜 Meus Modelos de Batuque' : '📜 Mes Gabarits de Batuque' },
    ...(isDesktop ? [{ id: 'desktopLayouts', title: lang === 'pt' ? '🖥️ Espaços de Trabalho' : '🖥️ Espaces de Travail' }] : []),
    { id: 'midi', title: lang === 'pt' ? '🎹 Controladores MIDI' : '🎹 Contrôleurs MIDI' },
    { id: 'sinais', title: lang === 'pt' ? '📢 Sinais do Mestre' : '📢 Signaux du Maître' },
    { id: 'prensa', title: lang === 'pt' ? '🖨️ A Prensa (Partitura)' : '🖨️ La Presse (Partition)' },
    { id: 'performance', title: lang === 'pt' ? '⚡ Desempenho & Modo Eco' : '⚡ Performances & Mode Éco' },
    { id: 'audio', title: lang === 'pt' ? '🎧 Áudio' : '🎧 Audio' },
    { id: 'ajuda', title: lang === 'pt' ? '📖 Ajuda & Atalhos' : '📖 Aide & Raccourcis' },
  ];

  if (isClosing) {
    return createPortal(
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        {/* Conteneur sas de décompression brutaliste */}
        <div className="border-4 border-black bg-[#fbf8f0] p-8 max-w-sm text-center shadow-[6px_6px_0px_#000] flex flex-col items-center justify-center gap-3">
          <div className="animate-spin text-3xl">
            <svg className="w-8 h-8 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
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
          </div>
          <span className="font-cactus font-bold text-sm tracking-wider uppercase animate-pulse">
            {lang === 'fr' ? 'Fermeture de l\'Atelier...' : 'Fechando A Oficina...'}
          </span>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Container Principal Brutaliste */}
      <div className="bg-[#f4ecd8] border-4 border-black w-full md:w-[92vw] max-w-6xl h-[85vh] flex flex-col shadow-[8px_8px_0px_#000] relative overflow-hidden text-[#1a1a1a]">
        
        {/* Header de la page */}
        <div className="bg-black text-[#f4ecd8] px-6 py-4 flex justify-between items-center shrink-0 border-b-4 border-black">
          <h2 className="text-xl md:text-2xl font-cactus font-bold tracking-wider uppercase flex items-center gap-2">
            <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
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
            <span>{lang === 'fr' ? "L'Atelier - O Girador" : 'A Oficina - O Girador'}</span>
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
              onClick={handleClose}
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
              <div className="animate-spin text-5xl">
                <svg className="w-10 h-10 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="square">
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
              </div>
              <span className="font-cactus font-bold text-lg tracking-wider animate-pulse">
                {lang === 'pt' ? 'Carregando A Oficina...' : "Chargement de l'Atelier..."}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-32">
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
                              <BalancoEditorPanel
                                globalSwing={globalSwing}
                                setGlobalSwing={setGlobalSwing}
                                lang={lang}
                                compact={true}
                              />
                            </div>

                            {/* 2. BLOC MÉTRONOME */}
                            <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                ⏱️ {lang === 'fr' ? 'Métronome' : 'Metrônomo'}
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
                                    
                                    // Obtenir la liste complète des frappes définies pour cet instrument
                                    const allStrokes = getStrokesForInstrument(inst.id, inst.type, lang, sequencer?.isLeftHanded || false);

                                    return (
                                      <div key={track.id} className="border border-black/10 p-3 bg-black/[0.02] flex flex-col gap-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">
                                            {track.customName || useNomenclatureStore.getState().getInstrumentLabel(inst.id) || inst.name}
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
                                                    if (audioEngine) {
                                                      audioEngine.playNote(track.id, stroke, Tone.now(), 1.0, 1.0);
                                                    }
                                                  }}
                                                  data-midi-target={`${inst.id}-${stroke}`}
                                                  className={`w-7 h-7 font-mono font-bold text-xs normal-case flex items-center justify-center border-2 border-black shadow-[1.5px_1.5px_0px_#000] cursor-pointer hover:scale-105 active:scale-95 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all transition-transform duration-100 select-none ${
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
                                                       🎚️ {lang === 'fr' ? `CONFIGURATION DE FRAPPE : [${stroke}]` : `CONFIGURAÇÃO DE BATIDA : [${stroke}]`}
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
                                                         ? (lang === 'fr' ? '● ACTIF' : '● ATIVO')
                                                         : (lang === 'fr' ? '○ DÉSACTIVÉ' : '○ DESATIVADO')}
                                                     </button>
                                                   </div>
                                                   <button 
                                                     onClick={() => setSelectedMacro(null)}
                                                     className="text-[#8b2a1a] hover:underline uppercase font-bold text-[9px] cursor-pointer"
                                                   >
                                                     {lang === 'fr' ? 'Fermer' : 'Fechar'}
                                                   </button>
                                                 </div>

                                                 {/* Volume macro slider */}
                                                 <div className="flex flex-col gap-1">
                                                   <div className="flex justify-between text-[10px] font-bold">
                                                     <span>🔊 {lang === 'fr' ? 'Volume Global :' : 'Volume Geral :'}</span>
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
                                                     <span>⏳ {isVoice ? (lang === 'fr' ? 'Durée Globale :' : 'Duração Geral :') : (lang === 'fr' ? 'Résonance Globale (Decay) :' : 'Ressonância Geral (Decay) :')}</span>
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
                        {section.id === 'gabarits' && (
                          <div className="flex flex-col gap-5 text-left">
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-black/10 pb-2">
                              <div>
                                <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-1.5">
                                  <XiloScroll size={16} className="shrink-0" />
                                  <span>{lang === 'pt' ? 'Modelos de Batuque Pessoais' : 'Gabarits de Batuque Personnels'}</span>
                                </h3>
                                <p className="text-[10px] opacity-75 mt-0.5">
                                  {lang === 'pt'
                                    ? 'Seus gabaritos são estritamente privados (salvos localmente e sincronizados na sua conta).'
                                    : 'Vos gabarits sont strictement privés (enregistrés localement et synchronisés sur votre compte).'}
                                </p>
                              </div>
                              {userProfile && (
                                <button
                                  onClick={() => syncWorkspaceTemplates(userProfile.uid)}
                                  disabled={isSyncingTemplates}
                                  className="px-2.5 py-1 text-[10px] font-cactus font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5"
                                  title={lang === 'pt' ? 'Sincronizar com a nuvem' : 'Synchroniser avec le cloud'}
                                >
                                  <span>{isSyncingTemplates ? '🔄' : '☁️'}</span>
                                  <span>
                                    {isSyncingTemplates 
                                      ? (lang === 'pt' ? 'Sincronizando...' : 'Synchronisation...') 
                                      : (lang === 'pt' ? 'Sincronizar' : 'Synchroniser')}
                                  </span>
                                </button>
                              )}
                            </div>

                            {workspaceTemplates.length === 0 ? (
                              <div className="p-6 border-2 border-dashed border-black/40 bg-white/60 text-center flex flex-col items-center justify-center gap-2 rounded">
                                <XiloScroll size={36} className="text-[#1a1a1a]/80 mb-1" />
                                <span className="font-cactus font-bold text-sm uppercase text-black/80">
                                  {lang === 'pt' ? 'Nenhum modelo de batuque salvo ainda' : 'Aucun gabarit de batuque enregistré'}
                                </span>
                                <p className="text-[11px] text-black/60 max-w-md">
                                  {lang === 'pt'
                                    ? 'Abra a mesa de mixagem (Console) e clique no botão "📜 Memorizar modelo" na régua Master para capturar a formação do seu batuque atual.'
                                    : 'Ouvrez la table de mixage (Console) et cliquez sur le bouton "📜 Mémoriser gabarit" sur la tranche Master pour capturer la composition de votre batuque actuel.'}
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {workspaceTemplates.map((tpl) => {
                                  const isEditing = editingTemplateId === tpl.id;
                                  const isConfirmingDelete = confirmDeleteId === tpl.id;

                                  return (
                                    <div
                                      key={tpl.id}
                                      className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 rounded-[3px_6px_4px_8px]"
                                    >
                                      <div className="flex flex-col gap-2">
                                        {/* Header du Template : Titre & Actions inline */}
                                        <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
                                          {isEditing ? (
                                            <div className="flex items-center gap-1.5 flex-1">
                                              <input
                                                type="text"
                                                value={editingTemplateName}
                                                onChange={(e) => setEditingTemplateName(e.target.value)}
                                                className="border-2 border-black px-2 py-0.5 text-xs font-cactus font-bold bg-[#f4ecd8] flex-1 outline-none"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleSaveRename(tpl.id);
                                                  if (e.key === 'Escape') setEditingTemplateId(null);
                                                }}
                                              />
                                              <button
                                                onClick={() => handleSaveRename(tpl.id)}
                                                className="px-2 py-0.5 bg-black text-[#f4ecd8] border border-black font-bold text-xs cursor-pointer hover:bg-green-700"
                                                title={lang === 'pt' ? 'Salvar' : 'Enregistrer'}
                                              >
                                                ✓
                                              </button>
                                              <button
                                                onClick={() => setEditingTemplateId(null)}
                                                className="px-2 py-0.5 bg-white text-black border border-black font-bold text-xs cursor-pointer hover:bg-gray-200"
                                                title={lang === 'pt' ? 'Cancelar' : 'Annuler'}
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <span className="font-cactus font-bold text-sm text-black truncate" title={tpl.name}>
                                                {tpl.name}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  setEditingTemplateId(tpl.id);
                                                  setEditingTemplateName(tpl.name);
                                                }}
                                                className="text-[11px] opacity-60 hover:opacity-100 cursor-pointer p-0.5"
                                                title={lang === 'pt' ? 'Renomear modelo' : 'Renommer le gabarit'}
                                              >
                                                ✏️
                                              </button>
                                            </div>
                                          )}

                                          <span className="text-[9px] font-bold font-cactus bg-black/5 border border-black/20 px-1.5 py-0.5 rounded shrink-0">
                                            🔒 {lang === 'pt' ? 'Privado' : 'Privé'}
                                          </span>
                                        </div>

                                        {/* Date et Nombre de pistes */}
                                        <div className="flex items-center justify-between text-[10px] text-black/60">
                                          <span>
                                            {tpl.tracks.length} {lang === 'pt' ? 'faixas' : 'pistes'}
                                          </span>
                                          <span>
                                            {new Date(tpl.updatedAt).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'fr-FR')}
                                          </span>
                                        </div>

                                        {/* Chips des instruments enregistrés */}
                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto py-1">
                                          {tpl.tracks.map((tr, idx) => {
                                            const inst = instrumentsConfig[tr.instrumentIdx];
                                            const label = tr.customName || (inst ? inst.name : `Track ${idx + 1}`);
                                            return (
                                              <span
                                                key={idx}
                                                className="bg-[#f4ecd8] text-[#1a1a1a] border border-black/50 px-1.5 py-0.2 text-[9px] font-cactus font-bold rounded"
                                              >
                                                {tr.isBusFolder ? `📁 ${label}` : label}
                                              </span>
                                            );
                                          })}
                                        </div>

                                        {/* Options incluses */}
                                        <div className="flex flex-wrap gap-1 text-[9px] text-black/70">
                                          {tpl.options.includeVolumePan && (
                                            <span className="bg-gray-100 border border-gray-300 px-1 py-0.2 rounded">🎚️ Vol/Pan</span>
                                          )}
                                          {tpl.options.includeEQ && (
                                            <span className="bg-gray-100 border border-gray-300 px-1 py-0.2 rounded">🎛️ EQ</span>
                                          )}
                                          {tpl.options.includeFX && (
                                            <span className="bg-gray-100 border border-gray-300 px-1 py-0.2 rounded">✨ FX</span>
                                          )}
                                          {tpl.options.includeStructure && (
                                            <span className="bg-gray-100 border border-gray-300 px-1 py-0.2 rounded">🗂️ Bus/Liens</span>
                                          )}
                                          {tpl.options.includeDisplayOrder && (
                                            <span className="bg-gray-100 border border-gray-300 px-1 py-0.2 rounded">🔄 Roda</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Actions principales */}
                                      <div className="border-t border-black/10 pt-2 flex items-center justify-between gap-2">
                                        <button
                                          onClick={() => handleLoadTemplate(tpl)}
                                          className="flex-1 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 shadow-[2px_2px_0px_#000] hover:bg-[#8b2a1a] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                        >
                                          🚀 {lang === 'pt' ? 'Criar projeto com este modelo' : 'Créer un projet avec ce gabarit'}
                                        </button>

                                        {isConfirmingDelete ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleDeleteTemplate(tpl.id)}
                                              className="px-2 py-1 bg-red-700 text-white font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-red-800"
                                              title={lang === 'pt' ? 'Confirmar exclusão' : 'Confirmer la suppression'}
                                            >
                                              {lang === 'pt' ? 'Excluir' : 'Suppr.'}
                                            </button>
                                            <button
                                              onClick={() => setConfirmDeleteId(null)}
                                              className="px-2 py-1 bg-white text-black font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-gray-100"
                                              title={lang === 'pt' ? 'Cancelar' : 'Annuler'}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setConfirmDeleteId(tpl.id)}
                                            className="px-2 py-1 bg-white text-red-700 border-2 border-black font-cactus font-bold text-xs hover:bg-red-50 cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                            title={lang === 'pt' ? 'Excluir este modelo' : 'Supprimer ce gabarit'}
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {section.id === 'desktopLayouts' && (
                          <div className="flex flex-col gap-5 text-left">
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-black/10 pb-2">
                              <div>
                                <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-1.5">
                                  <span>🖥️</span>
                                  <span>{lang === 'pt' ? 'Espaços de Trabalho (Telas & Janelas)' : 'Espaces de Travail (Écrans & Fenêtres)'}</span>
                                </h3>
                                <p className="text-[10px] opacity-75 mt-0.5">
                                  {lang === 'pt'
                                    ? 'Memorize a organização física do seu espaço de trabalho (janelas destacadas, tela cheia ou janelas divididas) e restaure-a com um clique. Configuração 100% local.'
                                    : 'Mémorisez l\'organisation physique de votre espace de travail (fenêtres détachées, plein écran ou fenêtres scindées) et restaurez-la en un clic. Configuration 100% locale.'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setNewLayoutName(lang === 'pt' ? `Espaço ${desktopLayouts.length + 1}` : `Espace ${desktopLayouts.length + 1}`);
                                  setIsSavingLayoutModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-[11px] font-cactus font-bold uppercase border-2 border-black bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a83220] cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-all"
                                title={lang === 'pt' ? 'Memorizar o espaço de trabalho atual' : 'Mémoriser l\'espace de travail actuel'}
                              >
                                <span>💾</span>
                                <span>{lang === 'pt' ? 'Memorizar espaço atual' : 'Mémoriser l\'espace actuel'}</span>
                              </button>
                            </div>

                            {/* Notification d'application */}
                            {appliedLayoutNotification && (
                              <div className="bg-emerald-100 border-2 border-emerald-800 text-emerald-900 px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_#065f46]">
                                {appliedLayoutNotification}
                              </div>
                            )}

                            {/* Micro-modale Cordel d'enregistrement de nom */}
                            {isSavingLayoutModalOpen && (
                              <div className="border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_#000] flex flex-col gap-2 rounded-[2px_4px_3px_5px]">
                                <div className="flex items-center justify-between">
                                  <span className="font-cactus font-bold text-xs uppercase text-[#1a1a1a]">
                                    {lang === 'pt' ? 'Nome do espaço de trabalho :' : 'Nom de l\'espace de travail :'}
                                  </span>
                                  <button
                                    onClick={() => setIsSavingLayoutModalOpen(false)}
                                    className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newLayoutName}
                                    onChange={(e) => setNewLayoutName(e.target.value)}
                                    placeholder={lang === 'pt' ? 'ex: Studio 2 Telas - Mesa separada' : 'ex: Studio 2 Écrans - Mixeur déporté'}
                                    className="flex-1 border-2 border-black px-2 py-1 text-xs font-cactus font-bold bg-[#f4ecd8] text-[#1a1a1a] outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveNewLayout();
                                      if (e.key === 'Escape') setIsSavingLayoutModalOpen(false);
                                    }}
                                  />
                                  <button
                                    onClick={handleSaveNewLayout}
                                    className="px-3.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-[#a83220] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                  >
                                    {lang === 'pt' ? 'Salvar' : 'Enregistrer'}
                                  </button>
                                  <button
                                    onClick={() => setIsSavingLayoutModalOpen(false)}
                                    className="px-3 py-1 bg-white text-black border-2 border-black font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-gray-100 cursor-pointer"
                                  >
                                    {lang === 'pt' ? 'Cancelar' : 'Annuler'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Liste ou État vide */}
                            {desktopLayouts.length === 0 ? (
                              <div className="p-6 border-2 border-dashed border-black/40 bg-white/60 text-center flex flex-col items-center justify-center gap-2 rounded">
                                <span className="text-3xl">🖥️</span>
                                <span className="font-cactus font-bold text-sm uppercase text-black/80">
                                  {lang === 'pt' ? 'Nenhum espaço de trabalho salvo' : 'Aucun espace de travail enregistré'}
                                </span>
                                <p className="text-[11px] text-black/60 max-w-md">
                                  {lang === 'pt'
                                    ? 'Organize suas janelas (separe a mesa de mixagem, a roda ou o editor, divida suas janelas em uma ou várias telas) e clique em "Memorizar espaço atual" para salvá-lo.'
                                    : 'Organisez vos fenêtres (détachez la console de mixage, la roda ou l\'éditeur, scindez vos fenêtres sur un ou plusieurs écrans) puis cliquez sur "Mémoriser l\'espace actuel" pour l\'enregistrer.'}
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {desktopLayouts.map((layout) => {
                                  const isEditing = editingLayoutId === layout.id;
                                  const isConfirmingDelete = confirmDeleteLayoutId === layout.id;
                                  const isActiveLayout = activeDesktopLayoutId === layout.id;

                                  const { mixer, roda, detailEditor } = layout.detachedPanels;

                                  return (
                                    <div
                                      key={layout.id}
                                      className={`border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 rounded-[3px_6px_4px_8px] transition-all ${
                                        isActiveLayout ? 'ring-2 ring-[#8b2a1a] bg-[#fbf8f0]' : ''
                                      }`}
                                    >
                                      <div className="flex flex-col gap-2">
                                        {/* Header de la fiche : Titre & Renommage */}
                                        <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
                                          {isEditing ? (
                                            <div className="flex items-center gap-1.5 flex-1">
                                              <input
                                                type="text"
                                                value={editingLayoutName}
                                                onChange={(e) => setEditingLayoutName(e.target.value)}
                                                className="border-2 border-black px-2 py-0.5 text-xs font-cactus font-bold bg-[#f4ecd8] flex-1 outline-none"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleSaveLayoutRename(layout.id);
                                                  if (e.key === 'Escape') setEditingLayoutId(null);
                                                }}
                                              />
                                              <button
                                                onClick={() => handleSaveLayoutRename(layout.id)}
                                                className="px-2 py-0.5 bg-black text-[#f4ecd8] border border-black font-bold text-xs cursor-pointer hover:bg-green-700"
                                                title={lang === 'pt' ? 'Salvar' : 'Enregistrer'}
                                              >
                                                ✓
                                              </button>
                                              <button
                                                onClick={() => setEditingLayoutId(null)}
                                                className="px-2 py-0.5 bg-white text-black border border-black font-bold text-xs cursor-pointer hover:bg-gray-200"
                                                title={lang === 'pt' ? 'Cancelar' : 'Annuler'}
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <span className="font-cactus font-bold text-sm text-black truncate" title={layout.name}>
                                                {layout.name}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  setEditingLayoutId(layout.id);
                                                  setEditingLayoutName(layout.name);
                                                }}
                                                className="text-[11px] opacity-60 hover:opacity-100 cursor-pointer p-0.5"
                                                title={lang === 'pt' ? 'Renomear espaço' : 'Renommer l\'espace'}
                                              >
                                                ✏️
                                              </button>
                                              {isActiveLayout && (
                                                <span className="text-[9px] font-cactus font-bold px-1.5 py-0.2 bg-[#8b2a1a] text-[#f4ecd8] rounded-full">
                                                  {lang === 'pt' ? 'Ativo' : 'Actif'}
                                                </span>
                                              )}
                                              <span className="text-[9px] opacity-40 ml-auto font-mono">
                                                {new Date(layout.createdAt).toLocaleDateString()}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Badges des panneaux concernés */}
                                        <div className="flex flex-wrap gap-1.5 text-[9px] font-cactus font-bold">
                                          {/* Mixeur */}
                                          <span
                                            className={`px-1.5 py-0.5 border rounded flex items-center gap-1 ${
                                              mixer?.detached
                                                ? 'bg-[#8b2a1a]/10 text-[#8b2a1a] border-[#8b2a1a]/40'
                                                : 'bg-gray-100 text-black/60 border-gray-300'
                                            }`}
                                          >
                                            🎛️ {mixer?.detached
                                              ? (lang === 'pt' ? 'Mesa déportada' : 'Console déportée') + (mixer.bounds ? ` [${mixer.bounds.width}×${mixer.bounds.height} @ (${mixer.bounds.screenX}, ${mixer.bounds.screenY})]` : '')
                                              : (lang === 'pt' ? 'Mesa ancorada' : 'Console ancrée')}
                                          </span>

                                          {/* Roda */}
                                          <span
                                            className={`px-1.5 py-0.5 border rounded flex items-center gap-1 ${
                                              roda?.detached
                                                ? 'bg-[#8b2a1a]/10 text-[#8b2a1a] border-[#8b2a1a]/40'
                                                : 'bg-gray-100 text-black/60 border-gray-300'
                                            }`}
                                          >
                                            🥁 {roda?.detached
                                              ? (lang === 'pt' ? 'Roda déportada' : 'Roda déportée') + (roda.bounds ? ` [${roda.bounds.width}×${roda.bounds.height} @ (${roda.bounds.screenX}, ${roda.bounds.screenY})]` : '')
                                              : (lang === 'pt' ? 'Roda ancorada' : 'Roda ancrée')}
                                          </span>

                                          {/* Éditeur d'Instrument */}
                                          {detailEditor?.detached && (
                                            <span className="px-1.5 py-0.5 border rounded bg-[#8b2a1a]/10 text-[#8b2a1a] border-[#8b2a1a]/40 flex items-center gap-1">
                                              🔧 {lang === 'pt' ? 'Editor déportado' : 'Éditeur déporté'} {detailEditor.bounds ? `[${detailEditor.bounds.width}×${detailEditor.bounds.height}]` : ''}
                                            </span>
                                          )}

                                          {/* Pistes DAW */}
                                          {layout.uiState?.isTracksCollapsed === false && (
                                            <span className="px-1.5 py-0.5 border rounded bg-amber-50 text-amber-900 border-amber-300 flex items-center gap-1">
                                              🎼 {lang === 'pt' ? 'Pistas abertas' : 'Pistes ouvertes'}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Actions : Appliquer / Supprimer */}
                                      <div className="border-t border-black/10 pt-2 flex items-center justify-between gap-2">
                                        <button
                                          onClick={() => handleApplyLayout(layout.id, layout.name)}
                                          className={`flex-1 font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                                            isActiveLayout
                                              ? 'bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a83220]'
                                              : 'bg-black text-[#f4ecd8] hover:bg-[#8b2a1a]'
                                          }`}
                                        >
                                          🚀 {lang === 'pt' ? 'Aplicar espaço' : 'Appliquer l\'espace'}
                                        </button>

                                        {isConfirmingDelete ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleDeleteLayout(layout.id)}
                                              className="px-2 py-1 bg-red-700 text-white font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-red-800"
                                              title={lang === 'pt' ? 'Confirmar exclusão' : 'Confirmer la suppression'}
                                            >
                                              {lang === 'pt' ? 'Excluir' : 'Suppr.'}
                                            </button>
                                            <button
                                              onClick={() => setConfirmDeleteLayoutId(null)}
                                              className="px-2 py-1 bg-white text-black font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-gray-100"
                                              title={lang === 'pt' ? 'Cancelar' : 'Annuler'}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setConfirmDeleteLayoutId(layout.id)}
                                            className="px-2 py-1 bg-white text-red-700 border-2 border-black font-cactus font-bold text-xs hover:bg-red-50 cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                            title={lang === 'pt' ? 'Excluir este espaço' : 'Supprimer cet espace'}
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {section.id === 'midi' && (
                          <MidiManagerPanel />
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
                                        <SettingsSignalThumb name={sig.name} image={sig.image} />
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
                                  📝 {lang === 'fr' ? 'Informations de la Toada' : 'Informações da Toada'}
                                </h3>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Titre :' : 'Título :'}</label>
                                    <input 
                                      type="text"
                                      value={metadata.toada || ''}
                                      onChange={(e) => handleMetaChange('toada', e.target.value)}
                                      className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
                                      placeholder={lang === 'fr' ? 'Nom de la Toada' : 'Nome da Toada'}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Compositeur :' : 'Compositor :'}</label>
                                    <input 
                                      type="text"
                                      value={metadata.compositor || ''}
                                      onChange={(e) => handleMetaChange('compositor', e.target.value)}
                                      className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
                                      placeholder={lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Rythme :' : 'Ritmo :'}</label>
                                    <input 
                                      type="text"
                                      value={metadata.ritmo || ''}
                                      onChange={(e) => handleMetaChange('ritmo', e.target.value)}
                                      className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
                                      placeholder={lang === 'fr' ? 'Ex : Maracatu Nação' : 'Ex: Maracatu Nação'}
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 flex-grow">
                                  <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Paroles :' : 'Letras :'}</label>
                                  <textarea
                                    rows={5}
                                    value={letras}
                                    onChange={(e) => setLetras && setLetras(e.target.value)}
                                    className="bg-white border-2 border-black font-sans font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none resize-none custom-scrollbar flex-grow"
                                    placeholder={lang === 'fr' ? 'Entrez les paroles ici...' : 'Digite as letras aqui...'}
                                  />
                                </div>
                              </div>

                              {/* Colonne de Droite : Sélection d'instruments */}
                              <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
                                <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                  🥁 {lang === 'fr' ? 'Sélection des Instruments' : 'Seleção de Instrumentos'}
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
                                          <span className="font-cactus text-xs font-bold text-[#8b2a1a] uppercase truncate">
                                            {track.customName || useNomenclatureStore.getState().getInstrumentLabel(conf.id) || conf.name}
                                          </span>
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
                                 <div className="flex items-center gap-3 flex-wrap">
                                   {/* Curseur de réglage de taille brutaliste */}
                                   <div className="flex items-center gap-2 bg-[#f4ecd8] border-2 border-black px-2.5 py-1 shadow-[1.5px_1.5px_0px_#000] text-[9px] font-bold uppercase select-none">
                                     <span>{lang === 'fr' ? 'Taille :' : 'Tamanho :'} {bodyFontSize}px</span>
                                     <input 
                                       type="range" 
                                       min="11" 
                                       max="18" 
                                       value={bodyFontSize} 
                                       onChange={(e) => setBodyFontSize(Number(e.target.value))} 
                                       className="accent-black cursor-pointer w-20 h-1 bg-black/10"
                                     />
                                   </div>
                                   <button
                                     onClick={refreshPreviewText}
                                     className="px-3 py-1 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase cursor-pointer hover:bg-[#8b2a1a] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                                   >
                                     🔄 {lang === 'fr' ? "Régénérer depuis l'Atelier" : 'Gerar da Oficina'}
                                   </button>
                                 </div>
                               </div>
                               <p className="text-[10px] italic opacity-60 text-center border-b border-dashed border-black/15 pb-2">
                                 📋 {lang === 'fr' 
                                   ? "Consigne d'atelier : Vous pouvez modifier, aérer ou annoter directement la partition ci-dessous avant impression ou export."
                                   : "Instrução de oficina: Você pode editar, espaçar ou anotar diretamente a partitura abaixo antes de imprimir ou exportar."}
                               </p>
                               <div className="w-full p-4 md:p-8 bg-black/5 border border-black/10 rounded-md overflow-x-auto flex justify-center">
                                 <div className="w-[21cm] h-[29.7cm] shrink-0 bg-[#fbf8f0] p-12 md:p-16 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.15)] flex flex-col text-left overflow-hidden">
                                   {/* En-tête HTML fixe */}
                                   <div className="text-center mb-1">
                                     <h2 className="font-cactus text-3xl md:text-4xl font-bold text-black uppercase tracking-wider text-center">
                                       {metadata.toada || (lang === 'fr' ? 'PARTITION SANS TITRE' : 'PARTITURA SEM TÍTULO')}
                                     </h2>
                                   </div>
                                   {(metadata.compositor || metadata.ritmo) && (
                                     <div className="text-right text-[10px] md:text-xs text-gray-700 font-sans mb-3 border-b border-dashed border-black/20 pb-2">
                                       {metadata.compositor && <div>{lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'} : {metadata.compositor}</div>}
                                       {metadata.ritmo && <div>{lang === 'fr' ? 'Rythme' : 'Ritmo'} : {metadata.ritmo}</div>}
                                     </div>
                                   )}
                                   <textarea
                                     value={liveText}
                                     onChange={(e) => setLiveText(e.target.value)}
                                     style={{ fontSize: `${bodyFontSize}px`, whiteSpace: 'pre', overflowX: 'auto' }}
                                     className="w-full flex-grow h-0 min-h-0 bg-transparent text-black font-mono whitespace-pre overflow-x-auto overflow-y-auto leading-relaxed outline-none resize-none custom-scrollbar text-[#1a1a1a]"
                                     placeholder={lang === 'fr' ? "Générez ou tapez la partition ici..." : "Gere ou digite a partitura aqui..."}
                                   />
                                 </div>
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
                                      metadata,
                                      undefined,
                                      undefined,
                                      undefined,
                                      bodyFontSize
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
                                  ⚡ {lang === 'fr' ? 'Télémétrie en Temps Réel' : 'Telemetria em Tempo Real'}
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
                                🧹 {lang === 'fr' ? 'Purge de l\'Atelier' : 'Limpeza da Oficina'}
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
                                {lang === 'fr' ? 'Purger le Cache Local' : 'Limpar Cache Local'}
                              </button>
                            </div>

                          </div>
                        )}
                        {section.id === 'audio' && (
                          <div className="flex flex-col gap-6 text-left">
                            {/* 2.5 BLOC MATÉRIEL AUDIO (I/O) */}
                            <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000]">
                              <h3 className="font-cactus font-bold text-sm uppercase mb-3 flex items-center gap-1.5 border-b border-black/10 pb-1">
                                🎙️ {lang === 'fr' ? 'Matériel Audio (I/O)' : 'Hardware de Áudio (I/O)'}
                              </h3>
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={handleRequestAudioPermission}
                                    disabled={isAskingPermission}
                                    className="px-4 py-2 font-cactus font-bold text-xs uppercase border-2 border-black cursor-pointer transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none bg-[#8b2a1a] text-[#fdfaf2] hover:bg-[#1a1a1a] flex items-center gap-2"
                                  >
                                    {isAskingPermission 
                                      ? (lang === 'fr' ? "Détection..." : "Detectando...") 
                                      : (lang === 'fr' ? "Activer & Lister les Cartes Son" : "Ativar e Listar Placas")}
                                  </button>
                                  <span className="text-[10px] font-sans text-[#1a1a1a]/70">
                                    {lang === 'fr' 
                                      ? "Cliquez pour lister les entrées et sorties réelles." 
                                      : "Clique para listar as entradas e saídas reais."}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
                                  {/* Input */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]">
                                      {lang === 'fr' ? 'Entrée (Micro) :' : 'Entrada (Microfone) :'}
                                    </label>
                                    <select
                                      value={selectedDeviceId || ''}
                                      onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                                      className="bg-[#fbf8f0] border-2 border-black p-2 font-mono font-bold text-xs outline-none cursor-pointer focus:bg-white w-full truncate shadow-[1.5px_1.5px_0px_#000]"
                                    >
                                      <option value="">{lang === 'fr' ? '-- Par défaut --' : '-- Padrão --'}</option>
                                      {availableDevices.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                          {device.label || (lang === 'fr' ? `Entrée (${device.deviceId.slice(0, 6)}...)` : `Entrada (${device.deviceId.slice(0, 6)}...)`)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  {/* Output */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]">
                                      {lang === 'fr' ? 'Sortie (Haut-parleurs) :' : 'Saída (Alto-falantes) :'}
                                    </label>
                                    <select
                                      value={selectedOutputDeviceId || ''}
                                      onChange={(e) => setSelectedOutputDeviceId(e.target.value || null)}
                                      className="bg-[#fbf8f0] border-2 border-black p-2 font-mono font-bold text-xs outline-none cursor-pointer focus:bg-white w-full truncate shadow-[1.5px_1.5px_0px_#000]"
                                    >
                                      <option value="">{lang === 'fr' ? '-- Par défaut --' : '-- Padrão --'}</option>
                                      {availableOutputDevices.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                          {device.label || (lang === 'fr' ? `Sortie (${device.deviceId.slice(0, 6)}...)` : `Saída (${device.deviceId.slice(0, 6)}...)`)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
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
                                onClick={() => window.open('/tutorial.html', '_blank')}
                                className="w-full px-4 py-3 bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
                              >
                                {lang === 'fr' ? "Ouvrir le Mode d'Emploi" : 'Abrir o Manual'}
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
                                <React.Suspense fallback={<div className="p-4 text-xs font-mono opacity-50">{lang === 'fr' ? 'Chargement...' : 'Carregando...'}</div>}>
                                  <ShortcutsGuide 
                                    lang={lang} 
                                    t={t} 
                                    activeStrokesByInstrument={activeStrokesByInstrument} 
                                  />
                                </React.Suspense>
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
          <span className="font-cactus font-bold tracking-wider">{lang === 'fr' ? "L'ATELIER (PARAMÈTRES)" : 'A OFICINA (CONFIGURAÇÕES)'}</span>
        </div>

      </div>
    </div>,
    document.body
  );
};
