import { useSequencerStore } from '../stores/useSequencerStore';
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Play, Square, GripVertical } from 'lucide-react';
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackGroup, Pattern, RhythmSignal, CloudPattern, CatalogVisibility, Language, GlobalSwing } from '../types';
import { i18n, instrumentsConfig, ASSETS_BASE_URL, isDarkText, getVisualStrokeSymbol } from '../data';
import { useAuth } from '../contexts/AuthContext';
import { fetchCloudPatterns, savePatternToCloud, deleteCloudPattern, renameCloudPattern } from '../cloudPatterns';
import { AudioEngine } from '../AudioEngine';
import { CompactPatternRenderer } from './CompactPatternRenderer';
import { AudioFader } from './AudioFader';
import { useSequencer } from '../contexts/SequencerContext';

const SortablePatternWrapper = ({ id, children, className, style: propStyle }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { ...propStyle, transform: CSS.Transform.toString(transform), transition };
  return children({ setNodeRef, style, attributes, listeners });
};

const getGlobalClipboard = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__oGiradorRelativeClipboard || null;
  }
  return null;
};

interface InstrumentDetailEditorProps {
  lang: Language;
  isLeftHanded?: boolean;
  trackId: number;
  onClose: () => void;
  onStepValueChange: (
    patternId: number,
    stepIdx: number | number[],
    val: string | string[],
    lyrics?: string[],
    notes?: string[]
  ) => void;
  onStepKeyDown: (patternId: number, stepIdx: number, key: string, currentVal: string, targetEl: HTMLInputElement) => void;
  onStepsChange: (patternId: number, steps: number) => void;
  onVoiceTypeToggle: (patternId: number, stepIdx: number) => void;
  onVoiceSylChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteChange: (patternId: number, stepIdx: number, val: string) => void;
  onVoiceNoteBlur: (patternId: number, stepIdx: number, val: string) => void;
  onAddPattern: () => void;
  onDeletePattern: (patternId: number) => void;
  onSelectPattern: (patternId: number) => void;
  onReorderPatternsDnd?: (oldIndex: number, newIndex: number) => void;
  onAddPatternVariation?: (patternId: number) => void;
  onUpdatePatternVariationProbability?: (patternId: number, variationId: string, probability: number) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onTogglePatternVariationFirstTimeOnly?: (patternId: number, variationId: string, val: boolean) => void;
  onVariationStepValueChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => void;
  onDeletePatternVariation?: (patternId: number, variationId: string) => void;
  onPatternAssign: (patternId: number, measureIdx: number, val: boolean) => void;
  onVolumeChange: (val: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onStepVolumeChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onStepDecayChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onStepMicrotimingChange: (patternId: number, stepIdx: number | number[], val: number) => void;
  onVariationStepVolumeChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: number) => void;
  onVariationStepDecayChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: number) => void;
  onVariationStepMicrotimingChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: number) => void;
  globalSwing: GlobalSwing;
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  totalMeasures: number;
  isMobile: boolean;
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number,
    onSelect: (val: string) => void
  ) => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  onLoadLibraryPattern?: (targetPatternId: number, libraryPattern: any) => void;
  canPaste?: boolean;
  isRecordingVocal?: boolean;
  recordingVocalPatternId?: number | null;
  recordedPatternIds?: number[];
  onStartVocalRecording?: (patternId: number) => void;
  onStopVocalRecording?: () => void;
  onVocalModeChange?: (patternId: number, mode: 'synth' | 'micro') => void;
  onDeleteVocalRecording?: (patternId: number) => void;
  onVocalLatencyChange?: (patternId: number, latencyMs: number) => void;
  audioDevices?: MediaDeviceInfo[];
  selectedAudioDeviceId?: string;
  onAudioDeviceChange?: (deviceId: string) => void;
  onImportVocalFile?: (patternId: number, file: File) => void;
  isVocalGuideEnabled?: boolean;
  onVocalGuideToggle?: (enabled: boolean) => void;
  onVocalBpmSyncToggle?: (patternId: number, sync: boolean) => void;
  onPatternNameChange?: (patternId: number, name: string) => void;
  soloPatternPlayId?: number | null;
  soloPatternVariationId?: string | null;
  onPlaySoloPattern?: (patternId: number, variationId?: string) => void;
  onStopSoloPattern?: () => void;
}

/* ── Stroke legend definitions ─────────────────────────────── */

interface StrokeDef {
  symbol: string;
  label: string;
  shortcut: string;
  colorKey: string;
}

function getStrokesForInstrument(instId: string, instType: string, lang: string, isLeftHanded: boolean): StrokeDef[] {
  const isFr = lang === 'fr';
  let strokes: StrokeDef[] = [];
  if (instId === 'caixa') {
    strokes = [
      { symbol: 'D', label: isFr ? 'Main Droite Forte' : 'Mão Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'E', label: isFr ? 'Main Gauche Forte' : 'Mão Esquerda Forte', shortcut: 'E', colorKey: 'E' },

      { symbol: 'd', label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'e', label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca', shortcut: 'e', colorKey: 'e' },

      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'C', label: isFr ? 'Click' : 'Click', shortcut: 'C', colorKey: 'C' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
      { symbol: 'F', label: 'Fla', shortcut: 'F', colorKey: 'F' },
      { symbol: 'R', label: isFr ? 'Roulement court D' : 'Rufada Direita', shortcut: 'R', colorKey: 'R' },
      { symbol: 'r', label: isFr ? 'Roulement court G' : 'Rufada Esquerda', shortcut: 'r', colorKey: 'r' },
    ];
  }
  else if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    strokes = [

      { symbol: 'D', label: isFr ? 'Main Droite Forte' : 'Mão Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'E', label: isFr ? 'Main Gauche Forte' : 'Mão Esquerda Forte', shortcut: 'E', colorKey: 'E' },
      { symbol: 'd', label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'e', label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca', shortcut: 'e', colorKey: 'e' },

      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'C', label: isFr ? 'Click' : 'Click', shortcut: 'C', colorKey: 'C' },
      { symbol: 'I', label: isFr ? 'Bacalhau (Iguarassu)' : 'Bacalhau (Iguarassu)', shortcut: 'I', colorKey: 'I' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instType === 'gongue') {
    strokes = [
      { symbol: 'G', label: isFr ? 'Grave Forte' : 'Grave Forte', shortcut: 'G', colorKey: 'G' },
      { symbol: 'g', label: isFr ? 'Grave Faible' : 'Grave Fraco', shortcut: 'g', colorKey: 'g' },
      { symbol: 'A', label: isFr ? 'Aigu Forte' : 'Agudo Forte', shortcut: 'A', colorKey: 'A' },
      { symbol: 'a', label: isFr ? 'Aigu Faible' : 'Agudo Fraco', shortcut: 'a', colorKey: 'a' },
      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instId === 'tarol') {
    strokes = [
      { symbol: 'D', label: isFr ? 'Main Droite Forte' : 'Mão Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'E', label: isFr ? 'Main Gauche Forte' : 'Mão Esquerda Forte', shortcut: 'E', colorKey: 'E' },

      { symbol: 'd', label: isFr ? 'Main Droite Faible' : 'Mão Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'e', label: isFr ? 'Main Gauche Faible' : 'Mão Esquerda Fraca', shortcut: 'e', colorKey: 'e' },

      { symbol: 'X', label: isFr ? 'Cerclage' : 'Toque no aro', shortcut: 'X', colorKey: 'X' },
      { symbol: 'C', label: isFr ? 'Click' : 'Click', shortcut: 'C', colorKey: 'C' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
      { symbol: 'F', label: 'Fla', shortcut: 'F', colorKey: 'F' },
      { symbol: 'R', label: isFr ? 'Roulement court D' : 'Rufada Direita', shortcut: 'R', colorKey: 'R' },
      { symbol: 'r', label: isFr ? 'Roulement court G' : 'Rufada Esquerda', shortcut: 'r', colorKey: 'r' },
    ];
  }
  else if (instId === 'agbe') {
    strokes = [
      { symbol: 'E', label: isFr ? 'Gauche Forte' : 'Esquerda Forte', shortcut: 'E', colorKey: 'E' },
      { symbol: 'D', label: isFr ? 'Droite Forte' : 'Direita Forte', shortcut: 'D', colorKey: 'D' },
      { symbol: 'e', label: isFr ? 'Gauche Faible' : 'Esquerda Fraca', shortcut: 'e', colorKey: 'e' },
      { symbol: 'd', label: isFr ? 'Droite Faible' : 'Direita Fraca', shortcut: 'd', colorKey: 'd' },
      { symbol: 'S', label: isFr ? 'Salto' : 'Salto', shortcut: 'S', colorKey: 'S' },
      { symbol: 'V', label: isFr ? 'Volta' : 'Volta', shortcut: 'V', colorKey: 'V' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instId === 'mineiro') {
    strokes = [
      { symbol: 'P', label: isFr ? 'Haut Forte' : 'Push Forte (Cima)', shortcut: 'P', colorKey: 'P' },
      { symbol: 'T', label: isFr ? 'Bas Forte' : 'Pull Forte (Baixo)', shortcut: 'T', colorKey: 'T' },
      { symbol: 'p', label: isFr ? 'Haut Faible' : 'Push Fraco (Cima)', shortcut: 'p', colorKey: 'p' },
      { symbol: 't', label: isFr ? 'Bas Faible' : 'Pull Fraco (Baixo)', shortcut: 't', colorKey: 't' },
      { symbol: 'L', label: isFr ? 'Lado' : 'Lado', shortcut: 'L', colorKey: 'L' },
      { symbol: 'B', label: isFr ? 'Tremblement' : 'Tremor (Barulho)', shortcut: 'B', colorKey: 'B' },
    ];
  }
  else if (instType === 'voice') {
    strokes = [
      { symbol: 'P', label: 'Puxador', shortcut: 'Click top', colorKey: 'P' },
      { symbol: 'C', label: isFr ? 'Chœur' : 'Coro', shortcut: 'Click top', colorKey: 'C' },
    ];
  }

  if (isLeftHanded && ['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(instId)) {
    strokes = strokes.map(s => {
      const visualSymbol = String(getVisualStrokeSymbol(s.symbol, true, instId));
      const visualShortcut = String(getVisualStrokeSymbol(s.shortcut, true, instId));
      const visualColorKey = String(getVisualStrokeSymbol(s.colorKey, true, instId));

      let visualLabel = s.label;
      if (visualLabel.includes('Droite')) visualLabel = visualLabel.replace('Droite', 'Gauche');
      else if (visualLabel.includes('Gauche')) visualLabel = visualLabel.replace('Gauche', 'Droite');
      if (visualLabel.includes('Direita')) visualLabel = visualLabel.replace('Direita', 'Esquerda');
      else if (visualLabel.includes('Esquerda')) visualLabel = visualLabel.replace('Esquerda', 'Direita');

      return {
        symbol: visualSymbol,
        label: visualLabel,
        shortcut: visualShortcut,
        colorKey: visualColorKey
      };
    });
  }

  return strokes;
}



/* ── Step options ───────────────────────────────────────────── */
const STEP_OPTIONS = [4, 8, 12, 16, 24, 32];

/* ── Cycle step values helper on mobile ────────────────────────── */
export function getNextStepValue(instId: string, instType: string, currentVal: string | number): string | number {
  const norm = typeof currentVal === 'string' ? currentVal.trim() : currentVal;
  
  if (instId === 'mineiro') {
    if (norm === 0 || norm === '0' || !norm) return 'p';
    if (norm === 'p') return 'P';
    if (norm === 'P') return 't';
    if (norm === 't') return 'T';
    if (norm === 'T') return 'L';
    if (norm === 'L') return 'B';
    return 0;
  }
  if (instId === 'agbe') {
    if (norm === 0 || norm === '0' || !norm) return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'S';
    if (norm === 'S' || norm === 's') return 'V';
    if (norm === 'V' || norm === 'v') return 'B';
    return 0;
  }
  if (instType === 'gongue') {
    if (norm === 0 || norm === '0' || !norm) return 'g';
    if (norm === 'g') return 'G';
    if (norm === 'G') return 'a';
    if (norm === 'a') return 'A';
    if (norm === 'A') return 'X';
    if (norm === 'X') return 'B';
    return 0;
  }
  if (instId === 'caixa') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'R';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'X';
    if (norm === 'X') return 'C';
    if (norm === 'C') return 'F';
    if (norm === 'F') return 'B';
    return 0;
  }
  if (instId === 'tarol') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'R';
    if (norm === 'R') return 'r';
    if (norm === 'r') return 'X';
    if (norm === 'X') return 'C';
    if (norm === 'C') return 'F';
    if (norm === 'F') return 'B';
    return 0;
  }
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') {
    if (norm === 0 || norm === '0' || !norm) return 'd';
    if (norm === 'd') return 'D';
    if (norm === 'D') return 'e';
    if (norm === 'e') return 'E';
    if (norm === 'E') return 'X';
    if (norm === 'X') return 'I';
    if (norm === 'I') return 'C';
    if (norm === 'C') return 'B';
    return 0;
  }
  if (instId === 'apito') {
    if (norm === 0 || norm === '0' || !norm) return 'W';
    if (norm === 'W') return 'w';
    return 0;
  }
  // default
  if (norm === 0 || norm === '0' || !norm) return 'd';
  if (norm === 'd') return 'D';
  if (norm === 'D') return 'e';
  if (norm === 'e') return 'E';
  return 0;
}

const InstrumentDetailEditorComponent: React.FC<InstrumentDetailEditorProps> = ({
  lang,
  trackId,
  onClose,
  onStepValueChange,
  onStepKeyDown,
  onStepsChange,
  onVoiceTypeToggle,
  onVoiceSylChange,
  onVoiceNoteChange,
  onVoiceNoteBlur,
  onAddPattern,
  onDeletePattern,
  onSelectPattern,
  onReorderPatternsDnd,
  onAddPatternVariation,
  onUpdatePatternVariationProbability,
  onTogglePatternVariationFirstTimeOnly,
  onVariationStepValueChange,
  onVariationStepVolumeChange,
  onVariationStepDecayChange,
  onVariationStepMicrotimingChange,
  onDeletePatternVariation,
  onPatternAssign,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onStepVolumeChange,
  onStepDecayChange,
  onStepMicrotimingChange,
  globalSwing,
  isPlaying,
  currentStepIndex,
  currentMeasure,
  maxTicks,
  totalMeasures,
  isMobile,
  onStepTouchStart,
  onCopyPattern,
  onPastePattern,
  onLoadLibraryPattern,
  canPaste,
  isRecordingVocal = false,
  recordingVocalPatternId = null,
  recordedPatternIds = [],
  onStartVocalRecording,
  onStopVocalRecording,
  onVocalModeChange,
  onDeleteVocalRecording,
  onVocalLatencyChange,
  audioDevices = [],
  selectedAudioDeviceId = '',
  onAudioDeviceChange,
  onImportVocalFile,
  isVocalGuideEnabled = true,
  onVocalGuideToggle,
  onVocalBpmSyncToggle,
  onPatternNameChange,
  isLeftHanded = false,
  soloPatternPlayId,
  soloPatternVariationId,
  onPlaySoloPattern,
  onStopSoloPattern,
  onNavigatePrev,
  onNavigateNext,
}) => {
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const hasSolo = useSequencerStore(state => state.tracks.some(t => t.isSolo));
  const inst = track ? instrumentsConfig[track.instrumentIdx] : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };
  if (!track) return null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [liveMeasure, setLiveMeasure] = useState<number>(currentMeasure);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderPatternsDnd) {
      const oldIndex = track.patterns.findIndex(p => p.id === active.id);
      const newIndex = track.patterns.findIndex(p => p.id === over.id);
      onReorderPatternsDnd(oldIndex, newIndex);
    }
  };

  const patternIds = useMemo(() => track.patterns.map(p => p.id), [track.patterns]);

  // --- Pattern Cloud Logic ---
  const { currentUser, userProfile } = useAuth();
  const [cloudPatterns, setCloudPatterns] = useState<CloudPattern[]>([]);
  const [isSavingPattern, setIsSavingPattern] = useState(false);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  const [savePatternVisibility, setSavePatternVisibility] = useState<CatalogVisibility>('private');

  useEffect(() => {
    const loadPatterns = async () => {
      if (!userProfile) return;
      setIsLoadingPatterns(true);
      const patterns = await fetchCloudPatterns(userProfile.uid, userProfile.role, userProfile.mestreId || null);
      setCloudPatterns(patterns);
      setIsLoadingPatterns(false);
    };
    loadPatterns();
  }, [userProfile]);

  const existingLibraryPatterns = cloudPatterns.filter(p => p.instrumentId === inst.id);
  const existingFolders = Array.from(new Set(existingLibraryPatterns.map(p => p.folder))).filter(Boolean);

  const [saveModalPatternId, setSaveModalPatternId] = useState<number | null>(null);
  const [savePatternName, setSavePatternName] = useState('');
  const [savePatternFolder, setSavePatternFolder] = useState('');
  const [loadModalPatternId, setLoadModalPatternId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSavePatternToLibrary = async () => {
    if (saveModalPatternId === null || !savePatternName.trim() || !userProfile) return;
    const ptn = track.patterns.find(p => p.id === saveModalPatternId);
    if (!ptn) return;

    setIsSavingPattern(true);
    try {
      const savedPattern = {
        id: crypto.randomUUID(),
        instrumentId: inst.id,
        name: savePatternName.trim(),
        folder: savePatternFolder.trim() || 'Général',
        steps: [...ptn.activeSteps],
        variations: JSON.parse(JSON.stringify(ptn.variations || [])),
        volumes: ptn.volumes ? [...ptn.volumes] : undefined,
        decays: ptn.decays ? [...ptn.decays] : undefined,
        microtimings: ptn.microtimings ? [...ptn.microtimings] : undefined,
        createdAt: Date.now()
      };

      await savePatternToCloud(savedPattern, userProfile.uid, savePatternVisibility, userProfile.mestreId || undefined);
      
      // Refresh local list
      const updatedPatterns = await fetchCloudPatterns(userProfile.uid, userProfile.role, userProfile.mestreId || null);
      setCloudPatterns(updatedPatterns);

      setSaveModalPatternId(null);
      setToastMessage(lang === 'fr' ? 'Sauvegardé !' : 'Salvo !');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert(lang === 'fr' ? 'Erreur lors de la sauvegarde.' : 'Erro ao salvar.');
    } finally {
      setIsSavingPattern(false);
    }
  };

  const handleLoadPatternFromLibrary = (libraryPatternId: string) => {
    if (loadModalPatternId === null) return;
    const libPtn = existingLibraryPatterns.find(p => p.id === libraryPatternId);
    if (!libPtn) return;
    
    if (confirm(lang === 'fr' ? 'Attention, cela remplacera la phrase en cours. Continuer ?' : 'Atenção, isso substituirá o padrão atual. Continuar?')) {
      if (onLoadLibraryPattern) {
        onLoadLibraryPattern(loadModalPatternId, libPtn);
      }
      setLoadModalPatternId(null);
    }
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  // Ensure we always call the latest onStopSoloPattern, but ONLY on component unmount
  const stopSoloRef = useRef(onStopSoloPattern);
  useEffect(() => {
    stopSoloRef.current = onStopSoloPattern;
  }, [onStopSoloPattern]);

  useEffect(() => {
    return () => {
      if (stopSoloRef.current) {
        stopSoloRef.current();
      }
    };
  }, []);

  React.useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { measure } = customEvent.detail;
        setLiveMeasure((prev) => (prev !== measure ? measure : prev));
      }
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
    };
  }, []);

  React.useEffect(() => {
    if (!isPlaying) {
      setLiveMeasure(currentMeasure);
    }
  }, [isPlaying, currentMeasure]);

  const handleSave = (patternId: number) => {
    if (onPatternNameChange) {
      onPatternNameChange(patternId, editName);
    }
    setEditingPatternId(null);
  };
  const t = (key: string) => (i18n[lang] as any)[key] || key;

  const vocalT = (key: string) => {
    const dictionary: any = {
      fr: {
        vocalMode: 'Mode Vocal',
        synthMode: 'Synthétiseur',
        microMode: 'Microphone (Enregistrement)',
        recordVocal: '🎤 Enregistrer mon chant',
        recording: '🔴 Enregistrement en cours...',
        stopRecord: '⏹ Arrêter',
        deleteRecord: 'Supprimer',
        hasRecord: 'Chant enregistré (Local)',
        noRecordYet: 'Aucun enregistrement vocal pour ce motif.',
        reRecord: '🎤 Ré-enregistrer',
      },
      pt: {
        vocalMode: 'Modo Vocal',
        synthMode: 'Sintetizador',
        microMode: 'Microfone (Gravação)',
        recordVocal: '🎤 Gravar meu canto',
        recording: '🔴 Gravando...',
        stopRecord: '⏹ Parar',
        deleteRecord: 'Excluir',
        hasRecord: 'Canto gravado (Local)',
        noRecordYet: 'Nenhuma gravação vocal para este padrão.',
        reRecord: '🎤 Gravar novamente',
      }
    };
    return dictionary[lang]?.[key] || key;
  };

  const { handlePatternBeatResolutionChange } = useSequencer();
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [selectedStepIndices, setSelectedStepIndices] = useState<number[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<number>(track.patterns[0]?.id);
  const [isTupletEditMode, setIsTupletEditMode] = useState(false);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState<boolean>(false);

  const isMouseDownRef = React.useRef(false);
  const paintValueRef = React.useRef<string | number>(0);

  const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const wasSelectedRef = useRef(false);

  React.useEffect(() => {
    setHasClipboard(!!getGlobalClipboard());
    const handleChanged = () => {
      setHasClipboard(!!getGlobalClipboard());
    };
    window.addEventListener('oGiradorClipboardChanged', handleChanged);
    return () => window.removeEventListener('oGiradorClipboardChanged', handleChanged);
  }, []);

  React.useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isMultiSelectActive && isSelectingRef.current) {
        isSelectingRef.current = false;
        if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
          const tappedIdx = initialTouchIndexRef.current;
          
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            // Only toggle off if it was already selected before mousedown (handled via wasSelectedRef)
            if (wasSelectedRef.current) {
              setSelectedStepIndices(prev => prev.filter(idx => idx !== tappedIdx));
            }
          }
        }
      }
      isMouseDownRef.current = false;
      setIsDragSelecting(false);
      setDragStartIdx(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isMultiSelectActive, selectedStepIndices, selectedPatternId, track.patterns, inst.id, onStepTouchStart, onStepValueChange]);

  React.useEffect(() => {
    if (!isMultiSelectActive || selectedStepIndices.length === 0 || !selectedPatternId) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
        !(document.activeElement as HTMLInputElement).readOnly
      ) {
        return;
      }

      const key = e.key;

      if (key === 'Delete' || key === 'Backspace' || key === '0') {
        e.preventDefault();
        onStepValueChange(selectedPatternId, selectedStepIndices, '0');
        setSelectedStepIndices([]);
        return;
      }

      if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) {
        e.preventDefault();
        onStepValueChange(selectedPatternId, selectedStepIndices, key);
        setSelectedStepIndices([]);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMultiSelectActive, selectedStepIndices, selectedPatternId, onStepValueChange]);

  React.useEffect(() => {
    setSelectedPatternId(track.selectedPatternId);
    setSelectedStepIndices([]);
    setSelectedStepIdx(null);
    setSelectedVariationId(null);
    setIsMultiSelectActive(false);
  }, [track.id, track.selectedPatternId]);

  const strokes = getStrokesForInstrument(inst.id, inst.type, lang, isLeftHanded);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const handleStepTouchStartMulti = (e: React.TouchEvent, index: number) => {
    if (!isMultiSelectActive) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
  };

  const handleGridTouchMove = (e: React.TouchEvent, ptn: any) => {
    if (!isMultiSelectActive || !isSelectingRef.current || !touchStartPos.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (Math.abs(dx) > 10) {
        hasDraggedRef.current = true;
      }

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const stepInput = element.closest('[data-track-id][data-step-index]');
        if (stepInput) {
          const trackIdAttr = stepInput.getAttribute('data-track-id');
          const stepIdxAttr = stepInput.getAttribute('data-step-index');

          if (trackIdAttr === String(track.id) && stepIdxAttr !== null) {
            const stepIdx = parseInt(stepIdxAttr, 10);
            setSelectedStepIndices(prev => {
              if (prev.includes(stepIdx)) return prev;
              return [...prev, stepIdx];
            });
          }
        }
      }
    }
  };

  const handleGridTouchEnd = (e: React.TouchEvent, ptn: any) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    isSelectingRef.current = false;

    if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
      const tappedIdx = initialTouchIndexRef.current;
      if (selectedStepIndices.includes(tappedIdx) && selectedStepIndices.length > 0) {
        const stepVal = ptn.activeSteps[tappedIdx];
        if (onStepTouchStart) {
          onStepTouchStart(e, ptn.id, tappedIdx, inst.id, stepVal, (newVal) => {
            onStepValueChange(ptn.id, selectedStepIndices, newVal);
            setSelectedStepIndices([]);
          });
        }
      } else {
        setSelectedStepIndices(prev => {
          if (prev.includes(tappedIdx)) {
            return prev.filter(idx => idx !== tappedIdx);
          } else {
            return [...prev, tappedIdx];
          }
        });
      }
    }

    touchStartPos.current = null;
    initialTouchIndexRef.current = null;
  };

  const handleStepMouseDownMulti = (e: React.MouseEvent, index: number) => {
    if (!isMultiSelectActive) return;
    if (e.button !== 0) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;

    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      if (!wasSel) {
        setSelectedStepIndices(prev => [...prev, index]);
      }
    } else {
      setSelectedStepIndices([index]);
    }
  };

  const handleStepMouseEnterMulti = (index: number) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    hasDraggedRef.current = true;
    setSelectedStepIndices(prev => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
  };

  const handleCopyRelative = (ptn: any) => {
    if (selectedStepIndices.length === 0) return;
    const sorted = [...selectedStepIndices].sort((a, b) => a - b);
    const baseIdx = sorted[0];
    const copiedSteps = sorted.map(idx => ({
      offset: idx - baseIdx,
      val: ptn.activeSteps[idx],
      lyric: ptn.lyrics?.[idx] || '',
      note: ptn.notes?.[idx] || '',
    }));
    if (typeof window !== 'undefined') {
      (window as any).__oGiradorRelativeClipboard = { steps: copiedSteps };
      window.dispatchEvent(new CustomEvent('oGiradorClipboardChanged'));
    }
  };

  const handlePasteRelative = (ptn: any, targetIdx: number) => {
    const globalClipboard = getGlobalClipboard();
    if (!globalClipboard) return;
    const destIndices: number[] = [];
    const destValues: string[] = [];
    const destLyrics: string[] = [];
    const destNotes: string[] = [];

    globalClipboard.steps.forEach((item: any) => {
      const destIdx = targetIdx + item.offset;
      if (destIdx >= 0 && destIdx < ptn.steps) {
        destIndices.push(destIdx);
        destValues.push(String(item.val));
        destLyrics.push(item.lyric || '');
        destNotes.push(item.note || '');
      }
    });

    if (destIndices.length > 0) {
      onStepValueChange(ptn.id, destIndices, destValues, destLyrics, destNotes);
      setSelectedStepIndices([]);
    }
  };

  React.useEffect(() => {
    const handleGridShortcut = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      const { key } = customEvent.detail;
      const activePtn = track.patterns.find(p => p.id === selectedPatternId) || track.patterns[0];
      if (!activePtn) return;

      if (key === 'a') {
        setIsMultiSelectActive(true);
        setSelectedStepIndices(Array.from({ length: activePtn.steps }, (_, i) => i));
      } else if (key === 'c') {
        if (selectedStepIndices.length > 0) {
          handleCopyRelative(activePtn);
        } else {
          onCopyPattern && onCopyPattern(activePtn);
        }
      } else if (key === 'x') {
        if (selectedStepIndices.length > 0) {
          handleCopyRelative(activePtn);
          onStepValueChange(activePtn.id, selectedStepIndices, '0');
          setSelectedStepIndices([]);
        } else {
          onCopyPattern && onCopyPattern(activePtn);
          const allIndices = Array.from({ length: activePtn.steps }, (_, i) => i);
          onStepValueChange(activePtn.id, allIndices, '0');
        }
      } else if (key === 'v') {
        if (getGlobalClipboard()) {
          const targetIdx = (isMultiSelectActive && selectedStepIndices.length > 0) ? selectedStepIndices[0] : (selectedStepIdx !== null ? selectedStepIdx : 0);
          handlePasteRelative(activePtn, targetIdx);
        } else {
          if (canPaste && onPastePattern) {
            onPastePattern(activePtn.id);
          }
        }
      }
    };

    window.addEventListener('grid-shortcut', handleGridShortcut);
    return () => window.removeEventListener('grid-shortcut', handleGridShortcut);
  }, [track.patterns, selectedPatternId, isMultiSelectActive, selectedStepIndices, selectedStepIdx, onCopyPattern, onPastePattern, canPaste, onStepValueChange]);


  const renderSelectionToolbar = (ptn: any) => {
    return (
      <div className="flex justify-between items-center bg-[#f4ecd8] border-b border-[#1a1a1a]/20 pb-1.5 mb-2 text-[10px] font-bold w-full select-none">
        <span className="text-[#666] uppercase tracking-wider">
          {lang === 'fr' ? 'Multi-sélection' : 'Multi-selection'}
        </span>
        <div className="flex gap-1.5 items-center">
          {selectedStepIndices.length > 0 && (
            <>
              <button
                onClick={() => handleCopyRelative(ptn)}
                className="px-1.5 py-0.5 bg-[#8b2a1a] text-[#f4ecd8] rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#a63d2d] transition-colors"
              >
                {lang === 'fr' ? 'Copier' : 'Copy'} ({selectedStepIndices.length})
              </button>
              <button
                onClick={() => setSelectedStepIndices([])}
                className="px-1.5 py-0.5 bg-[#8b2a1a] text-[#f4ecd8] rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#a63d2d] transition-colors"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
            </>
          )}
          {hasClipboard && selectedStepIndices.length === 1 && (
            <button
              onClick={() => handlePasteRelative(ptn, selectedStepIndices[0])}
              className="px-1.5 py-0.5 bg-[#1e824c] text-white rounded border border-[#1a1a1a] text-[8px] cursor-pointer font-bold hover:bg-[#27ae60] transition-colors"
            >
              {lang === 'fr' ? 'Coller' : 'Paste'}
            </button>
          )}
          <button
            onClick={() => {
              setIsMultiSelectActive(!isMultiSelectActive);
              setSelectedStepIndices([]);
            }}
            className={`px-1.5 py-0.5 rounded border border-[#1a1a1a] text-[9px] cursor-pointer font-bold ${
              isMultiSelectActive ? 'bg-blue-600 text-white' : 'bg-transparent text-[#1a1a1a]'
            }`}
          >
            {isMultiSelectActive 
              ? (lang === 'fr' ? 'Mode Normal' : 'Normal Mode') 
              : (lang === 'fr' ? 'Multi-sél. Off' : 'Multi-sel. Off')}
          </button>
        </div>
      </div>
    );
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent, patternId: number, stepIdx: number, currentVal: string | number) => {
    if ('shiftKey' in e && e.shiftKey) return;
    if (onStepTouchStart) {
      if (e.type === 'touchstart') {
        onStepTouchStart(e, patternId, stepIdx, inst.id, currentVal, (newVal) => {
          console.log("2️⃣ CALLBACK TACTILE : Valeur reçue de la boîte :", newVal);
          onStepValueChange(patternId, stepIdx, newVal);
        });
      } else {
        if ('button' in e && e.button !== 0) return;
        onStepTouchStart(e, patternId, stepIdx, inst.id, currentVal, (newVal) => {
          console.log("2️⃣ CALLBACK TACTILE : Valeur reçue de la boîte :", newVal);
          onStepValueChange(patternId, stepIdx, newVal);
        });
      }
    }
  };

  /* Voice input navigation helper */
  const handleVoiceNav = useCallback((el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
    if (key === 'Tab') return;
    const parentContainer = el.closest('.step-boxes');
    if (!parentContainer) return;
    const cards = Array.from(parentContainer.querySelectorAll('.v-card'));
    const currentCard = el.closest('.v-card');
    if (!currentCard) return;
    const idx = cards.indexOf(currentCard);

    if ((key === 'ArrowRight' || key === 'Enter') && idx < cards.length - 1) {
      const nextCard = cards[idx + 1] as HTMLElement;
      const input = nextCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    } else if (key === 'ArrowLeft' && idx > 0) {
      const prevCard = cards[idx - 1] as HTMLElement;
      const input = prevCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  }, []);

  /* Compute current playing step for a given pattern */
  const getCurrentStep = (patternSteps: number) => {
    if (!isPlaying || currentStepIndex < 0) return -1;
    return Math.floor((currentStepIndex / maxTicks) * patternSteps);
  };

  /* Compute global swing offset for a step index */
  const getStepSwingPercent = (stepIdx: number, steps: number, beatResolutions?: number[]) => {
    if (globalSwing.mode === 'off') return 0;
    
    let posInGroup = 0;
    if (beatResolutions && beatResolutions.length > 0) {
      let accumulated = 0;
      for (const res of beatResolutions) {
        if (stepIdx >= accumulated && stepIdx < accumulated + res) {
          if (res === 3 || res === 6) return 0;
          posInGroup = stepIdx - accumulated;
          break;
        }
        accumulated += res;
      }
    } else {
      const posInBeat = ((stepIdx / (steps / 4)) % 1) * 4;
      posInGroup = Math.round(posInBeat) % 4;
    }

    if (globalSwing.mode === 'custom') {
      return globalSwing.customOffsets[posInGroup] || 0;
    }

    // Default 'maracatu' mode
    if (posInGroup === 0) return 0;
    if (posInGroup === 1) return 8;
    if (posInGroup === 2) return -29;
    if (posInGroup === 3) return -58;
    return 0;
  };

  /* Gongue display value mapping */
  const getDisplayVal = (val: string | number): string => {
    if (val === 0 || val === '0') return '';
    return String(val);
  };

  /* Secure backdrop clicks by validating where mousedown started */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  /* Close on Escape */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        className="bg-[#f4ecd8] cordel-border-sm text-[#1a1a1a] flex flex-col relative overflow-hidden"
        style={{
          maxWidth: isMobile ? '100%' : '1600px',
          width: isMobile ? '98vw' : '96vw',
          maxHeight: isMobile ? 'calc(100dvh - 180px)' : 'calc(100vh - 160px)',
          boxShadow: '8px 8px 0px 0px #1a1a1a',
        }}
      >

        {/* ═══════════════════ HEADER BAR ═══════════════════ */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-b-[3px] border-[#1a1a1a] shrink-0"
          style={{ backgroundColor: inst.mixerBg, color: inst.colors.text }}
        >
          {/* Instrument icon + name */}
          <img
            src={`${ASSETS_BASE_URL}${inst.iconImg}`}
            alt={inst.name}
            className="w-8 h-8 object-contain"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="flex items-center gap-2 mr-auto">
            {onNavigatePrev && (
              <button 
                onClick={onNavigatePrev} 
                className="w-6 h-6 flex items-center justify-center bg-[#1a1a1a]/20 hover:bg-[#1a1a1a]/40 rounded-full cursor-pointer transition-colors"
              >
                ◀
              </button>
            )}
            <span className="font-cactus font-bold text-lg tracking-wide">
              {inst.name}
            </span>
            {onNavigateNext && (
              <button 
                onClick={onNavigateNext} 
                className="w-6 h-6 flex items-center justify-center bg-[#1a1a1a]/20 hover:bg-[#1a1a1a]/40 rounded-full cursor-pointer transition-colors"
              >
                ▶
              </button>
            )}
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase opacity-70">Vol</span>
            <AudioFader
              type="range"
              min="0"
              max="100"
              audioTarget="trackVolume"
              trackId={track.id}
              value={track.volumeVal}
              onChange={(val) => onVolumeChange(val)}
              className="w-24 h-2 bg-[#1a1a1a] border border-[#f4ecd8] rounded-none outline-none cursor-pointer accent-[#f4ecd8]"
            />
            <span className="text-[11px] font-bold w-7 text-right">{track.volumeVal}</span>
          </div>

          {/* Mute */}
          <button
            onClick={onMuteToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isMute
                ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            M
          </button>

          {/* Solo */}
          <button
            onClick={onSoloToggle}
            className={`w-8 h-8 cordel-border-sm cordel-button text-xs font-bold cursor-pointer transition-all flex items-center justify-center ${
              track.isSolo
                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            S
          </button>


          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm cordel-button font-bold text-sm flex items-center justify-center hover:bg-[#1a1a1a] cursor-pointer transition-colors ml-2"
          >
            ✕
          </button>
        </div>

        {/* ═══════════════════ BODY: Content + Legend sidebar ═══════════════════ */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* ─── Main scrollable content ─── */}
          <div className="flex-1 md:overflow-y-auto p-3 md:p-5 flex flex-col gap-6" style={{ minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
              <SortableContext items={patternIds} strategy={verticalListSortingStrategy}>

            {track.patterns.map((ptn, ptnIdx) => {
              const isSelected = track.selectedPatternId === ptn.id;
              const currentStep = getCurrentStep(ptn.steps);
              const livePattern = track.patterns.find(p => p.measureAssignments[liveMeasure]) || track.patterns[0];
              const isCurrentPlaying = isPlaying && ptn.id === livePattern.id;

              return (
                <SortablePatternWrapper key={ptn.id} id={ptn.id}>
                  {({ setNodeRef, style, attributes, listeners }: any) => (
                <div
                  ref={setNodeRef}
                  className={`cordel-border-sm p-4 flex flex-col gap-3 transition-colors ${
                    isSelected ? 'bg-[#f4ecd8]' : 'bg-[#ece4d0]'
                  }`}
                  style={{
                    ...style,
                    boxShadow: isCurrentPlaying ? '4px 4px 0px 0px #8b2a1a' : (isSelected ? '4px 4px 0px 0px #1a1a1a' : '2px 2px 0px 0px #bbb'),
                    borderColor: isCurrentPlaying ? '#8b2a1a' : (isSelected ? '#1a1a1a' : '#999'),
                    borderWidth: isCurrentPlaying ? '3px' : '2px',
                  }}
                >
                  {/* Pattern header */}
                  <div className="flex items-center gap-3 border-b-[2px] border-[#1a1a1a] pb-2">
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => onSelectPattern(ptn.id)}
                      className="w-4 h-4 accent-[#1a1a1a] cursor-pointer"
                    />
                    {editingPatternId === ptn.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSave(ptn.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(ptn.id);
                          if (e.key === 'Escape') setEditingPatternId(null);
                        }}
                        className="font-cactus font-bold text-sm bg-transparent border-b border-[#1a1a1a] outline-none text-[#1a1a1a] px-1 py-0.5"
                        autoFocus
                        onFocus={(e) => e.target.select()}
                      />
                    ) : (
                      <span
                        className={`font-cactus font-bold cursor-pointer select-none ${
                          isSelected ? 'text-[#1a1a1a] text-base' : 'text-[#666] text-sm'
                        }`}
                        onClick={() => onSelectPattern(ptn.id)}
                        onDoubleClick={() => {
                          setEditingPatternId(ptn.id);
                          setEditName(ptn.name || '');
                        }}
                        title={lang === 'fr' ? 'Double-cliquez pour renommer' : 'Double clique para renomear'}
                      >
                        {ptn.name ? ptn.name : `${lang === 'fr' ? 'Motif' : 'Padrão'} ${ptnIdx + 1}`}
                      </span>
                    )}

                    {editingPatternId !== ptn.id && isMobile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPatternId(ptn.id);
                          setEditName(ptn.name || '');
                        }}
                        className="text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer flex items-center justify-center"
                        title={lang === 'fr' ? 'Renommer' : 'Renomear'}
                      >
                        ✏️
                      </button>
                    )}

                    {isCurrentPlaying && (
                      <span className="bg-[#8b2a1a] text-[#f4ecd8] text-[9px] uppercase px-1.5 py-0.5 cordel-border-sm font-bold flex items-center gap-1 animate-pulse select-none">
                        ▶ {lang === 'fr' ? 'Actif' : 'Ativo'}
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble') {
                          onStopSoloPattern && onStopSoloPattern();
                        } else {
                          onPlaySoloPattern && onPlaySoloPattern(ptn.id, 'ensemble');
                        }
                      }}
                      className={`p-1 rounded-sm transition-colors ml-2 ${
                        soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble'
                          ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                          : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                      }`}
                      title={soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble' ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter ce motif complet en solo (Base + Variations)' : 'Ouvir este padrão completo em solo')}
                    >
                      {soloPatternPlayId === ptn.id && soloPatternVariationId === 'ensemble' ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>

                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          setSaveModalPatternId(ptn.id);
                          setSavePatternName(ptn.name || '');
                          setSavePatternFolder(existingFolders[0] || 'Général');
                        }}
                        className="p-1 rounded-sm transition-colors ml-4 text-[#1a1a1a] hover:bg-[#1a1a1a]/10"
                        title={lang === 'fr' ? 'Sauvegarder la phrase dans le catalogue' : 'Salvar o padrão no catálogo'}
                      >
                        💾
                      </button>

                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          setLoadModalPatternId(ptn.id);
                        }}
                        className="p-1 rounded-sm transition-colors ml-1 text-[#1a1a1a] hover:bg-[#1a1a1a]/10"
                        title={lang === 'fr' ? 'Ouvrir le catalogue' : 'Abrir o catálogo'}
                      >
                        📂
                      </button>

                      {/* Copy/Paste buttons */}
                      <div className="flex gap-1 ml-4">
                        <button
                          onClick={() => onCopyPattern && onCopyPattern(ptn)}
                          className="px-1.5 py-0.5 bg-[#eaddcf] text-[#1a1a1a] text-[10px] font-bold cordel-border-sm hover:bg-[#1a1a1a] hover:text-[#f4ecd8] cursor-pointer"
                          title={lang === 'fr' ? 'Copier le motif' : 'Copiar o padrão'}
                        >
                          📋 {lang === 'fr' ? 'Copier' : 'Copiar'}
                        </button>
                      <button
                        onClick={() => onPastePattern && onPastePattern(ptn.id)}
                        disabled={!canPaste}
                        className={`px-1.5 py-0.5 text-[10px] font-bold cordel-border-sm cursor-pointer ${
                          canPaste 
                            ? 'bg-[#eaddcf] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                        title={lang === 'fr' ? 'Coller le motif copié' : 'Colar o padrão copiado'}
                      >
                        📥 {lang === 'fr' ? 'Coller' : 'Colar'}
                      </button>
                    </div>

                    {/* Reorder handle */}
                    {onReorderPatternsDnd && (
                      <div
                        {...attributes}
                        {...listeners}
                        className="ml-2 flex items-center justify-center p-1 cursor-grab active:cursor-grabbing text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors touch-none"
                        title="Drag to reorder patterns"
                      >
                        <GripVertical size={16} />
                      </div>
                    )}

                    {/* Steps selector */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] font-bold uppercase">{t('stepsNum')}</span>
                      <select
                        value={ptn.steps}
                        onChange={(e) => onStepsChange(ptn.id, parseInt(e.target.value))}
                        className="bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm px-2 py-0.5 text-xs font-bold cursor-pointer outline-none font-cactus"
                      >
                        {STEP_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    {/* Delete pattern */}
                    {track.patterns.length > 1 && (
                      <button
                        onClick={() => onDeletePattern(ptn.id)}
                        className="text-[#8b2a1a] font-bold text-xs px-2 py-1 cordel-border-sm cordel-button hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors cursor-pointer"
                      >
                        ✕ {lang === 'fr' ? 'Suppr.' : 'Excluir'}
                      </button>
                    )}
                  </div>

                  {/* Vocal recording controls (only for voice instruments) */}
                  {inst.type === 'voice' && (
                    <div className="bg-[#ece4d0] border border-[#1a1a1a]/25 cordel-border-sm p-3 mb-2 flex flex-col md:flex-row items-start md:items-center gap-4 text-[#1a1a1a] shrink-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold uppercase">{vocalT('vocalMode')} :</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onVocalModeChange && onVocalModeChange(ptn.id, 'synth')}
                            className={`px-3 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
                              ptn.vocalMode !== 'micro'
                                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                            }`}
                          >
                            🎹 {vocalT('synthMode')}
                          </button>
                          <button
                            onClick={() => onVocalModeChange && onVocalModeChange(ptn.id, 'micro')}
                            className={`px-3 py-1 font-bold text-xs cordel-border-sm cursor-pointer transition-colors ${
                              ptn.vocalMode === 'micro'
                                ? 'bg-[#1a1a1a] text-[#f4ecd8]'
                                : 'bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                            }`}
                          >
                            🎤 {vocalT('microMode')}
                          </button>
                        </div>
                      </div>

                      {ptn.vocalMode === 'micro' && (
                        <div className="flex flex-col gap-2 flex-grow w-full border-t md:border-t-0 md:border-l border-[#1a1a1a]/20 pt-3 md:pt-0 md:pl-4">
                          
                          {/* Microphone selection dropdown */}
                          <div className="flex flex-col gap-1 w-full border-b border-[#1a1a1a]/10 pb-2 mb-1">
                            <label className="text-[10px] font-bold opacity-80 flex items-center gap-1">
                              🎙️ {lang === 'fr' ? "Carte son / Entrée micro :" : "Placa de som / Entrada de microfone :"}
                            </label>
                            <select
                              value={selectedAudioDeviceId}
                              onChange={(e) => onAudioDeviceChange && onAudioDeviceChange(e.target.value)}
                              className="text-xs bg-[#f4ecd8] cordel-border-sm p-1 outline-none text-[#1a1a1a] w-full max-w-xs font-semibold cursor-pointer"
                            >
                              {audioDevices.length === 0 ? (
                                <option value="">{lang === 'fr' ? "Périphérique par défaut" : "Dispositivo padrão"}</option>
                              ) : (
                                audioDevices.map((dev) => (
                                  <option key={dev.deviceId} value={dev.deviceId}>
                                    {dev.label || `${lang === 'fr' ? 'Micro' : 'Microfone'} (${dev.deviceId.slice(0, 5)})`}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          {/* Melodic guide option */}
                          <div className="flex items-center gap-2 w-full mb-1">
                            <input
                              type="checkbox"
                              id={`vocal-guide-toggle-${ptn.id}`}
                              checked={isVocalGuideEnabled}
                              onChange={(e) => onVocalGuideToggle && onVocalGuideToggle(e.target.checked)}
                              className="accent-green-700 cursor-pointer w-3.5 h-3.5"
                            />
                            <label
                              htmlFor={`vocal-guide-toggle-${ptn.id}`}
                              className="text-[10px] font-bold opacity-80 cursor-pointer select-none"
                            >
                              🎵 {lang === 'fr' 
                                ? "Jouer le guide mélodique (synthétiseur) pendant l'enregistrement" 
                                : "Tocar guia melódico (sintetizador) durante a gravação"}
                            </label>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 w-full">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-[#b89f74] text-[#1a1a1a] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[#a68e64] transition-colors flex items-center gap-1.5 font-semibold"
                                title={lang === 'fr' ? "Importer un fichier audio existant" : "Importar um arquivo de áudio existente"}
                              >
                                📥 {lang === 'fr' ? 'Importer' : 'Importar'}
                              </button>
                              <input
                                type="file"
                                accept="audio/*"
                                ref={fileInputRef}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && onImportVocalFile) {
                                    onImportVocalFile(ptn.id, file);
                                  }
                                }}
                                className="hidden"
                              />
                            </div>

                            {recordedPatternIds.includes(ptn.id) ? (
                              <div className="flex items-center gap-3 ml-auto flex-wrap">
                                <span className="text-xs font-bold text-green-800 flex items-center gap-1">
                                  ✅ {vocalT('hasRecord')}
                                </span>
                                <button
                                  onClick={() => onDeleteVocalRecording && onDeleteVocalRecording(ptn.id)}
                                  className="px-2 py-1 text-[#8b2a1a] font-bold text-[11px] cordel-border-sm cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] transition-colors"
                                >
                                  {vocalT('deleteRecord')}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[#666] italic ml-auto">
                                {vocalT('noRecordYet')}
                              </span>
                            )}
                          </div>

                          {/* Latency adjustment slider */}
                          {recordedPatternIds.includes(ptn.id) && (
                            <div className="flex flex-col gap-1 w-full border-t border-[#1a1a1a]/10 pt-2 mt-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span>⏱️ {lang === 'fr' ? "Calage temporel (Compensation de la latence)" : "Ajuste de atraso (Compensação de latência)"}</span>
                                <span>{ptn.vocalLatency > 0 ? '+' : ''}{ptn.vocalLatency || 0} ms</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold opacity-60 shrink-0">-300 ms</span>
                                <input
                                  type="range"
                                  min="-300"
                                  max="800"
                                  step="5"
                                  value={ptn.vocalLatency || 0}
                                  onChange={(e) => onVocalLatencyChange && onVocalLatencyChange(ptn.id, parseInt(e.target.value) || 0)}
                                  className="flex-grow accent-green-700 cursor-pointer h-1 bg-[#1a1a1a]/10"
                                />
                                <span className="text-[8px] font-bold opacity-60 shrink-0">800 ms</span>
                              </div>
                              <span className="text-[8px] text-[#666] font-medium leading-normal">
                                {lang === 'fr' 
                                  ? "Décale le début de la voix vers la gauche (plus tôt) pour compenser le retard du micro, du smartphone ou du Bluetooth."
                                  : "Desloca o início da voz para a esquerda (mais cedo) para compensar o atraso do microfone, celular ou Bluetooth."}
                              </span>
                            </div>
                          )}


                          {/* Sync Tempo (Time-stretch) toggle */}
                          {recordedPatternIds.includes(ptn.id) && (
                            <div className="flex flex-col gap-1 w-full border-t border-[#1a1a1a]/10 pt-2 mt-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`vocal-sync-toggle-${ptn.id}`}
                                  checked={ptn.vocalBpmSync !== false}
                                  onChange={(e) => onVocalBpmSyncToggle && onVocalBpmSyncToggle(ptn.id, e.target.checked)}
                                  className="accent-green-700 cursor-pointer w-3.5 h-3.5"
                                />
                                <label
                                  htmlFor={`vocal-sync-toggle-${ptn.id}`}
                                  className="text-[10px] font-bold opacity-80 cursor-pointer select-none"
                                >
                                  🔄 {lang === 'fr' 
                                    ? "Sync Tempo / Time-stretch (Conserver la hauteur)" 
                                    : "Sync Tempo / Time-stretch (Manter o tom)"}
                                </label>
                              </div>
                              <span className="text-[8px] text-[#666] font-medium leading-normal pl-5">
                                {lang === 'fr' 
                                  ? `Ajuste automatiquement la vitesse de la voix si le tempo change, sans changer sa hauteur. Tempo d'origine détecté : ${ptn.vocalBaseBpm || '?'} BPM.`
                                  : `Ajusta automaticamente a velocidade da voz se o tempo mudar, sem alterar o tom. Tempo original detectado: ${ptn.vocalBaseBpm || '?'} BPM.`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step grid */}
                  {ptn.id === selectedPatternId && isTouchDevice && renderSelectionToolbar(ptn)}
                  {(() => {
                    const totalVarProb = (ptn.variations || [])
                      .filter(v => !v.playFirstTimeOnly)
                      .reduce((acc, v) => acc + v.probability, 0);
                    const baseProb = Math.max(0, 100 - totalVarProb);
                    return (
                      <div className="text-xs font-bold text-[#666] mb-2 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span>{lang === 'fr' ? 'Probabilité de base (Base Track) :' : 'Probabilidade base (Pista Base) :'} {baseProb}%</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (soloPatternPlayId === ptn.id && soloPatternVariationId === 'base') {
                                onStopSoloPattern && onStopSoloPattern();
                              } else {
                                onPlaySoloPattern && onPlaySoloPattern(ptn.id, 'base');
                              }
                            }}
                            className={`p-1 rounded-sm transition-colors ${
                              soloPatternPlayId === ptn.id && soloPatternVariationId === 'base'
                                ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                                : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                            }`}
                            title={soloPatternPlayId === ptn.id && soloPatternVariationId === 'base' ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter ce motif de base en solo (sans variations)' : 'Ouvir este padrão base em solo (sem variações)')}
                          >
                            {soloPatternPlayId === ptn.id && soloPatternVariationId === 'base' ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsTupletEditMode(!isTupletEditMode)}
                            className={`px-2 py-1 text-[10px] rounded-sm transition-colors border ${
                              isTupletEditMode
                                ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]'
                                : 'bg-transparent text-[#1a1a1a] border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/5'
                            }`}
                            title={lang === 'fr' ? 'Éditer les divisions (Triolet, Sextolet...)' : 'Editar divisões (Tercina, Sextina...)'}
                          >
                            {lang === 'fr' ? '⚙️ Divisions (Triolets...)' : '⚙️ Divisões (Tercinas...)'}
                          </button>
                          {(ptn.variations?.length || 0) > 0 && totalVarProb > 100 && (
                            <span className="text-[#8b2a1a] text-[10px]">⚠️ {lang === 'fr' ? 'Somme > 100%' : 'Soma > 100%'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {inst.type === 'voice' ? (
                    /* ──── Voice step grid ──── */
                    <div
                      className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
                      id={`detail-voice-${track.id}-${ptn.id}`}
                      onTouchMove={(e) => handleGridTouchMove(e, ptn)}
                      onTouchEnd={(e) => handleGridTouchEnd(e, ptn)}
                    >
                      {(() => {
                        const groups = [];
                        let accumulated = 0;
                        const defaultBeats = 4;
                        const beatRes = ptn.beatResolutions || Array(Math.ceil(ptn.steps / defaultBeats)).fill(defaultBeats);
                        for (let b = 0; b < beatRes.length; b++) {
                          const res = beatRes[b];
                          const group = [];
                          for (let i = 0; i < res; i++) {
                            if (accumulated + i < ptn.steps) {
                              group.push(accumulated + i);
                            }
                          }
                          if (group.length > 0) groups.push(group);
                          accumulated += res;
                        }
                        return groups.map((group, groupIdx) => (
                          <div key={groupIdx} className="flex gap-4 p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                            {group.map((i) => {
                              const state = ptn.activeSteps[i];
                              const isActive = state !== 0;
                              const isPux = state === 'P';
                              const syl = ptn.lyrics?.[i] || '';
                              const note = ptn.notes?.[i] || '';
                              const typeText = isActive ? (isPux ? 'PUX' : 'CORO') : '---';
                              const typeClass = isActive ? '' : 'bg-transparent text-[#666]';
                              const typeStyle = isActive
                                ? { backgroundColor: isPux ? inst.colors['P'] : inst.colors['C'], color: '#1a1a1a' }
                                : {};

                              const isCurrentStep = currentStep === i;
                              const isSelected = ptn.id === selectedPatternId && selectedStepIndices.includes(i);

                              // Calculate total micro-timing shift (manual + global swing)
                              const manualMicro = ptn.microtimings?.[i] ?? 0;
                              const swingOffset = getStepSwingPercent(i, ptn.steps, ptn.beatResolutions);
                              const totalShift = Math.max(-100, Math.min(100, manualMicro + swingOffset));
                              const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                              return (
                                <div key={i} className="relative" style={{ width: '56px' }}>
                                  {/* Axis vertical centerline (0%) behind steps */}
                                  <div className="absolute top-[20px] bottom-[10px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />
                                  
                                  <div
                                    className={`v-card flex flex-col bg-[#f4ecd8] cordel-border-sm overflow-hidden z-10 relative transition-all duration-100 ${
                                      isCurrentStep 
                                        ? 'border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.5)]' 
                                        : isSelected
                                          ? 'border-[#f1c40f] bg-[#f1c40f]/20 shadow-[0_0_8px_#f1c40f]'
                                          : 'border-[#1a1a1a]'
                                    }`}
                                    style={{
                                      width: '56px',
                                      transform: `translateX(${shiftPx}px)`,
                                    }}
                                    data-track-id={track.id}
                                    data-step-index={i}
                                    data-step-type="voice"
                                    onTouchStart={(e) => {
                                      if (isMultiSelectActive) {
                                        handleStepTouchStartMulti(e, i);
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      if (isMultiSelectActive) {
                                        handleStepMouseDownMulti(e, i);
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      if (isMultiSelectActive) {
                                        handleStepMouseEnterMulti(i);
                                      }
                                    }}
                                  >
                                    {/* Step number */}
                                    <div className="text-[8px] text-[#999] text-center font-bold bg-[#ece4d0] leading-tight py-0.5">
                                      {i + 1}
                                    </div>

                                    {/* PUX / CORO toggle */}
                                    <div
                                      onClick={() => {
                                        if (!isMultiSelectActive) {
                                          onVoiceTypeToggle(ptn.id, i);
                                        }
                                      }}
                                      className={`text-[9px] font-bold text-center py-0.5 cursor-pointer select-none uppercase ${typeClass}`}
                                      style={typeStyle}
                                    >
                                      {typeText}
                                    </div>

                                    {/* Syllable input */}
                                    <input
                                      type="text"
                                      value={syl}
                                      readOnly={isMultiSelectActive}
                                      onChange={(e) => onVoiceSylChange(ptn.id, i, e.target.value)}
                                      placeholder="-"
                                      className="v-syl w-full text-center text-xs font-bold py-1 bg-transparent border-0 border-b border-[#1a1a1a]/30 text-[#1a1a1a] outline-none"
                                      onFocus={() => {
                                        if (!isMultiSelectActive) {
                                          setSelectedStepIdx(i);
                                          setSelectedPatternId(ptn.id);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Tab') {
                                          e.preventDefault();
                                          handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'syl');
                                        } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                                          handleVoiceNav(e.target as HTMLInputElement, e.key, 'syl');
                                        }
                                      }}
                                    />

                                    {/* Note input */}
                                    <input
                                      type="text"
                                      value={note}
                                      readOnly={isMultiSelectActive}
                                      onChange={(e) => onVoiceNoteChange(ptn.id, i, e.target.value)}
                                      onBlur={(e) => onVoiceNoteBlur(ptn.id, i, e.target.value)}
                                      placeholder="C4"
                                      className="v-note w-full text-center text-[10px] py-1 bg-transparent border-0 text-[#1a1a1a] uppercase outline-none"
                                      onFocus={() => {
                                        if (!isMultiSelectActive) {
                                          setSelectedStepIdx(i);
                                          setSelectedPatternId(ptn.id);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Tab') {
                                          e.preventDefault();
                                          handleVoiceNav(e.target as HTMLInputElement, 'ArrowRight', 'note');
                                        } else if (['ArrowRight', 'ArrowLeft', 'Enter'].includes(e.key)) {
                                          handleVoiceNav(e.target as HTMLInputElement, e.key, 'note');
                                        }
                                      }}
                                    />
                                    {/* Sculpting micro-bars */}
                                    <div className="w-full flex flex-col gap-[2px] p-[2px] bg-[#ece4d0] border-t border-[#1a1a1a]/20 shrink-0">
                                      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                        <div className="h-[2px] bg-green-600 rounded-none transition-all" style={{ width: `${ptn.volumes?.[i] ?? 100}%` }} />
                                      </div>
                                      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                        <div className="h-[2px] bg-amber-500 rounded-none transition-all" style={{ width: `${ptn.decays?.[i] ?? 100}%` }} />
                                      </div>
                                      <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                        {totalShift !== 0 && (
                                          <div
                                            className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                            style={{
                                              left: totalShift > 0 ? '50%' : 'auto',
                                              right: totalShift < 0 ? '50%' : 'auto',
                                              width: `${Math.min(50, Math.abs(totalShift) / 2)}%`
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    /* ──── Instrument step grid ──── */
                    <div
                      className="step-boxes flex flex-wrap gap-y-4 gap-x-6"
                      id={`detail-steps-${track.id}-${ptn.id}`}
                      onTouchMove={(e) => handleGridTouchMove(e, ptn)}
                      onTouchEnd={(e) => handleGridTouchEnd(e, ptn)}
                    >
                      {(() => {
                        const groups = [];
                        let accumulated = 0;
                        const defaultBeats = 4;
                        const beatRes = ptn.beatResolutions || Array(Math.ceil(ptn.steps / defaultBeats)).fill(defaultBeats);
                        for (let b = 0; b < beatRes.length; b++) {
                          const res = beatRes[b];
                          const group = [];
                          for (let i = 0; i < res; i++) {
                            if (accumulated + i < ptn.steps) {
                              group.push(accumulated + i);
                            }
                          }
                          if (group.length > 0) groups.push(group);
                          accumulated += res;
                        }
                        return groups.map((group, groupIdx) => {
                          const isTriplet = group.length === 3;
                          const isSextuplet = group.length === 6;
                          
                          return (
                          <div key={groupIdx} className="flex flex-col gap-1 shrink-0">
                            {isTupletEditMode && (
                              <div className="flex justify-center mb-1">
                                <select 
                                  value={group.length}
                                  onChange={(e) => handlePatternBeatResolutionChange(ptn.id, groupIdx, parseInt(e.target.value))}
                                  className="text-[10px] bg-[#ece4d0] border border-[#1a1a1a]/20 rounded-sm outline-none px-1 py-0.5 font-bold cursor-pointer hover:bg-[#ece4d0]/80 transition-colors"
                                >
                                  <option value="3">3 (Triolet)</option>
                                  <option value="4">4 (D.Croches)</option>
                                  <option value="6">6 (Sextolet)</option>
                                </select>
                              </div>
                            )}
                            <div className={`p-1.5 bg-[#ece4d0]/40 border border-[#1a1a1a]/10 rounded-sm relative ${isSextuplet ? 'h-[72px]' : isTriplet ? 'flex justify-between' : 'flex gap-4'}`} style={{ width: '204px' }}>
                            {group.map((i, indexInGroup) => {
                              const val = ptn.activeSteps[i];
                              const displayVal = getDisplayVal(val);
                              const isActive = val !== 0 && val !== '';
                              const isCurrentStep = currentStep === i;

                              const isSelected = ptn.id === selectedPatternId && selectedStepIndices.includes(i);
                              const isSingleSelected = selectedStepIdx === i;

                              let colorStyle: React.CSSProperties = {};
                              if (isActive) {
                                const bgColor = inst.colors[val as string] || '#111';
                                let txtColor = inst.colors.text || '#f4ecd8';
                                if (isDarkText(inst.id, val as string)) {
                                  txtColor = '#1a1a1a';
                                }
                                colorStyle = {
                                  backgroundColor: bgColor,
                                  borderColor: (isSelected || isSingleSelected) ? undefined : bgColor,
                                  color: txtColor,
                                };
                              }

                              // Calculate total micro-timing shift (manual + global swing)
                              const manualMicro = ptn.microtimings?.[i] ?? 0;
                              const swingOffset = getStepSwingPercent(i, ptn.steps, ptn.beatResolutions);
                              const totalShift = Math.max(-100, Math.min(100, manualMicro + swingOffset));
                              const shiftPx = (totalShift / 100) * 8; // Max 8px shift

                              const isMultiSelected = ptn.id === selectedPatternId && selectedStepIndices.includes(i) && selectedStepIndices.length > 1;

                              let wrapperClasses = "relative flex flex-col items-center";
                              let wrapperStyle: React.CSSProperties = { width: '36px' };
                              
                              if (isSextuplet) {
                                wrapperClasses = "absolute flex flex-col items-center justify-center top-1.5 z-10 hover:z-20";
                                wrapperStyle = { 
                                  width: '54.8px', 
                                  left: `${6 + indexInGroup * 27.4}px`
                                };
                              } else if (isTriplet) {
                                wrapperStyle = { width: '48px' };
                              }

                              return (
                                <div key={i} className={wrapperClasses} style={wrapperStyle}>
                                  {/* Axis vertical centerline (0%) behind steps */}
                                  <div className="absolute top-[12px] bottom-[15px] left-1/2 w-0 border-l border-dashed border-[#1a1a1a]/30 -translate-x-1/2 pointer-events-none z-0" />

                                  <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                                  <input
                                    type="text"
                                    maxLength={['caixa', 'tarol'].includes(inst.id) ? 2 : 1}
                                    value={displayVal}
                                    readOnly={isMultiSelectActive}
                                    inputMode={isTouchDevice ? 'none' : undefined}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => {
                                      if (!isTouchDevice) {
                                        e.target.select();
                                      }
                                      setSelectedPatternId(ptn.id);
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      if (e.button !== 0) return;
                                      setSelectedPatternId(ptn.id);
                                      setSelectedVariationId(null);

                                      if (isMultiSelectActive) {
                                        handleStepMouseDownMulti(e, i);
                                        return;
                                      }

                                      // 1. Alt Key Paint Editing
                                      if (e.altKey) {
                                        isMouseDownRef.current = true;
                                        const nextVal = getNextStepValue(inst.id, inst.type, val);
                                        paintValueRef.current = nextVal;
                                        onStepValueChange(ptn.id, i, String(nextVal));
                                        return;
                                      }

                                      // 2. Shift + Clic (Selection Range)
                                      if (e.shiftKey) {
                                        e.preventDefault();
                                        if (selectedStepIdx !== null) {
                                          const start = Math.min(selectedStepIdx, i);
                                          const end = Math.max(selectedStepIdx, i);
                                          const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                          setSelectedStepIndices(rangeIndices);
                                        } else {
                                          setSelectedStepIdx(i);
                                          setSelectedStepIndices([i]);
                                        }
                                        return;
                                      }

                                      // 3. Ctrl/Cmd + Clic (Toggle individual step selection)
                                      if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        setSelectedStepIndices(prev => {
                                          if (prev.includes(i)) {
                                            const next = prev.filter(idx => idx !== i);
                                            if (next.length > 0) {
                                              setSelectedStepIdx(next[next.length - 1]);
                                            } else {
                                              setSelectedStepIdx(null);
                                            }
                                            return next;
                                          } else {
                                            setSelectedStepIdx(i);
                                            return [...prev, i];
                                          }
                                        });
                                        return;
                                      }

                                      // 4. Normal click -> Start Drag selection
                                      setIsDragSelecting(true);
                                      setDragStartIdx(i);
                                      setSelectedStepIdx(i);
                                      setSelectedStepIndices([i]);
                                      handleStart(e, ptn.id, i, val);
                                    }}
                                    onMouseEnter={() => {
                                      if (isMultiSelectActive) {
                                        handleStepMouseEnterMulti(i);
                                      } else {
                                        if (isMouseDownRef.current) {
                                          onStepValueChange(ptn.id, i, String(paintValueRef.current));
                                        }
                                        if (isDragSelecting && dragStartIdx !== null) {
                                          const start = Math.min(dragStartIdx, i);
                                          const end = Math.max(dragStartIdx, i);
                                          const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                                          setSelectedStepIndices(rangeIndices);
                                          setSelectedStepIdx(i);
                                        }
                                      }
                                    }}
                                    onTouchStart={(e) => {
                                      e.stopPropagation();
                                      setSelectedPatternId(ptn.id);
                                      setSelectedVariationId(null);
                                      if (isMultiSelectActive) {
                                        handleStepTouchStartMulti(e, i);
                                      } else {
                                        setSelectedStepIdx(i);
                                        setSelectedStepIndices([i]);
                                        handleStart(e, ptn.id, i, val);
                                      }
                                    }}
                                    onChange={(e) => onStepValueChange(ptn.id, i, e.target.value)}
                                    onKeyDown={(e) => {

                                      if (e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
                                      
                                      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
                                      if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
                                        e.preventDefault();
                                        if (selectedStepIndices.length > 0) {
                                          handleCopyRelative(ptn);
                                        } else {
                                          onCopyPattern && onCopyPattern(ptn);
                                        }
                                        return;
                                      }
                                      if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
                                        e.preventDefault();
                                        if (hasClipboard) {
                                          handlePasteRelative(ptn, i);
                                        } else {
                                          if (canPaste && onPastePattern) {
                                            onPastePattern(ptn.id);
                                          }
                                        }
                                        return;
                                      }
                                      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === ' ') {
                                        e.preventDefault();
                                        if (selectedStepIndices.length > 1) {
                                          onStepValueChange(ptn.id, selectedStepIndices, '0');
                                          setSelectedStepIndices([]);
                                        } else {
                                          onStepValueChange(ptn.id, i, '0');
                                          if (e.key === 'Backspace') {
                                            const inputEl = e.currentTarget as HTMLInputElement;
                                            onStepKeyDown(ptn.id, i, e.key, '', inputEl);
                                          }
                                        }
                                        return;
                                      }
                                      
                                      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
                                        e.preventDefault();
                                        if (selectedStepIndices.length > 1) {
                                          onStepValueChange(ptn.id, selectedStepIndices, e.key);
                                          setSelectedStepIndices([]);
                                        } else {
                                          onStepValueChange(ptn.id, i, e.key);
                                          // Also trigger next step navigation if needed
                                          const inputEl = e.currentTarget as HTMLInputElement;
                                          if (inputEl.parentElement?.nextElementSibling) {
                                            const nextInput = inputEl.parentElement.nextElementSibling.querySelector('input');
                                            if (nextInput) {
                                              nextInput.focus();
                                              nextInput.select();
                                            }
                                          }
                                        }
                                        return;
                                      }

                                      const inputEl = e.currentTarget as HTMLInputElement;
                                      onStepKeyDown(ptn.id, i, e.key, inputEl.value, inputEl);
                                    }}
                                    className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
                                      isCurrentStep
                                        ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#8b2a1a] scale-110 shadow-[0_0_8px_rgba(139,42,26,0.6)]'
                                        : val === 0
                                          ? 'bg-[#f4ecd8] text-[#1a1a1a] focus:border-[#8b2a1a]'
                                          : ''
                                    } ${
                                      isMultiSelected
                                        ? '!border-[2px] !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                        : (ptn.id === selectedPatternId && selectedStepIdx === i)
                                          ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                          : 'outline-none'
                                    }`}
                                    style={{
                                      ...colorStyle,
                                      width: isSextuplet || isTriplet ? '100%' : '36px',
                                      height: isSextuplet || isTriplet ? '48px' : '36px',
                                      transform: `translateX(${shiftPx}px)`,
                                      clipPath: isSextuplet 
                                        ? (indexInGroup % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(0% 0%, 100% 0%, 50% 100%)')
                                        : isTriplet ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                                      borderStyle: isSextuplet || isTriplet ? 'none' : undefined,
                                      borderRadius: isSextuplet || isTriplet ? '0' : undefined
                                    }}
                                  />
                                  {/* Sculpting micro-bars */}
                                  <div className="w-full flex flex-col gap-[2px] mt-1 z-10 relative">
                                    {/* Volume bar (Green) */}
                                    <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                      <div className="h-full bg-green-600 transition-all" style={{ width: `${ptn.volumes?.[i] ?? 100}%` }} />
                                    </div>
                                    {/* Decay bar (Amber) */}
                                    <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${ptn.decays?.[i] ?? 100}%` }} />
                                    </div>
                                    {/* Micro-timing bar (Blue bi-directional) */}
                                    <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                      {totalShift !== 0 && (
                                        <div
                                          className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                          style={{
                                            left: totalShift > 0 ? '50%' : 'auto',
                                            right: totalShift < 0 ? '50%' : 'auto',
                                            width: `${Math.min(50, Math.abs(totalShift) / 2)}%`
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {/* Variations */}
                  {inst.type !== 'voice' && inst.id !== 'apito' && (
                    <div className="flex flex-col gap-3 mt-2 mb-2 pl-4 border-l-[3px] border-dashed border-[#1a1a1a]/20">
                      {(ptn.variations || []).map((variation, vIdx) => {
                        return (
                          <div key={variation.id} className="flex flex-col gap-1.5 p-2 bg-[#ece4d0]/60 cordel-border-sm border-dashed">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-cactus font-bold text-[#1a1a1a]">{variation.name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id) {
                                    onStopSoloPattern && onStopSoloPattern();
                                  } else {
                                    onPlaySoloPattern && onPlaySoloPattern(ptn.id, variation.id);
                                  }
                                }}
                                className={`p-1 rounded-sm transition-colors ml-2 ${
                                  soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id
                                    ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                                    : 'text-[#1a1a1a] hover:bg-[#1a1a1a]/10'
                                }`}
                                title={soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id ? (lang === 'fr' ? 'Arrêter la lecture' : 'Parar leitura') : (lang === 'fr' ? 'Écouter cette variation en solo' : 'Ouvir esta variação em solo')}
                              >
                                {soloPatternPlayId === ptn.id && soloPatternVariationId === variation.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                              </button>
                              <div className="flex items-center gap-1 ml-4">
                                <label className="flex items-center gap-1 mr-3 cursor-pointer" title={lang === 'fr' ? 'Forcer cette variation à jouer uniquement la première fois (levée d\'entrée)' : 'Forçar esta variação a tocar apenas na primeira vez'}>
                                  <input 
                                    type="checkbox"
                                    checked={!!variation.playFirstTimeOnly}
                                    onChange={(e) => onTogglePatternVariationFirstTimeOnly && onTogglePatternVariationFirstTimeOnly(ptn.id, variation.id, e.target.checked)}
                                    className="accent-[#8b2a1a] cursor-pointer"
                                  />
                                  <span className="text-[10px] uppercase font-bold text-[#666]">{lang === 'fr' ? '1ère fois' : '1ª vez'}</span>
                                </label>

                                {!variation.playFirstTimeOnly ? (
                                  <>
                                    <span className="text-[10px] uppercase font-bold text-[#666]">Prob:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={variation.probability}
                                      onChange={(e) => onUpdatePatternVariationProbability && onUpdatePatternVariationProbability(ptn.id, variation.id, parseInt(e.target.value) || 0)}
                                      className="w-12 text-xs bg-[#f4ecd8] border border-[#1a1a1a] p-0.5 text-center font-bold"
                                    />
                                    <span className="text-[10px] font-bold text-[#666]">%</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-bold text-[#8b2a1a] bg-[#8b2a1a]/10 px-1.5 py-0.5 rounded-sm">100% ({lang === 'fr' ? 'Entrée' : 'Entrada'})</span>
                                )}
                              </div>
                              <button
                                onClick={() => onDeletePatternVariation && onDeletePatternVariation(ptn.id, variation.id)}
                                className="text-[#8b2a1a] text-[10px] font-bold hover:underline cursor-pointer ml-auto"
                              >
                                ✕ {lang === 'fr' ? 'Supprimer' : 'Excluir'}
                              </button>
                            </div>
                            
                            {/* Variation Grid */}
                            <div className="step-boxes flex flex-wrap gap-y-2 gap-x-4 scale-[0.9] origin-top-left mt-1">
                              {(() => {
                                const groups = [];
                                for (let g = 0; g < variation.steps.length; g += 4) {
                                  groups.push(Array.from({ length: Math.min(4, variation.steps.length - g) }, (_, idx) => g + idx));
                                }
                                return groups.map((group, groupIdx) => (
                                  <div key={groupIdx} className="flex gap-4 p-1 bg-[#f4ecd8]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
                                    {group.map((i) => {
                                      const val = variation.steps[i];
                                      const displayVal = getDisplayVal(val);
                                      const isActive = val !== 0 && val !== '0' && val !== '';
                                      
                                      const isSelected = selectedStepIdx === i && selectedVariationId === variation.id;
                                      
                                      let colorStyle: React.CSSProperties = {};
                                      if (isActive) {
                                        const bgColor = inst.colors[val as string] || '#111';
                                        let txtColor = inst.colors.text || '#f4ecd8';
                                        if (isDarkText(inst.id, val as string)) {
                                          txtColor = '#1a1a1a';
                                        }
                                        colorStyle = {
                                          backgroundColor: bgColor,
                                          borderColor: isSelected ? undefined : bgColor,
                                          color: txtColor,
                                        };
                                      }
                                      
                                      return (
                                        <div key={i} className="relative flex flex-col items-center" style={{ width: '36px' }}>
                                          <div className="text-[8px] text-[#999] font-bold mb-0.5 z-10 relative">{i + 1}</div>
                                          <input
                                            type="text"
                                            maxLength={['caixa', 'tarol'].includes(inst.id) ? 2 : 1}
                                            value={displayVal}
                                            readOnly={false}
                                            inputMode={isTouchDevice ? 'none' : undefined}
                                            onClick={(e) => e.stopPropagation()}
                                            onFocus={(e) => {
                                              if (!isTouchDevice) {
                                                e.target.select();
                                              }
                                              setSelectedPatternId(ptn.id);
                                            }}
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              if (e.button !== 0) return;
                                              setSelectedPatternId(ptn.id);
                                              setSelectedStepIdx(i);
                                              setSelectedVariationId(variation.id);
                                              setSelectedStepIndices([]);
                                              if ('shiftKey' in e && e.shiftKey) return;
                                              if (onStepTouchStart) {
                                                onStepTouchStart(e, ptn.id, i, inst.id, val, (newVal) => {
                                                  onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, newVal);
                                                });
                                              }
                                            }}
                                            onTouchStart={(e) => {
                                              e.stopPropagation();
                                              setSelectedPatternId(ptn.id);
                                              setSelectedVariationId(variation.id);

                                              if (isMultiSelectActive) {
                                                handleStepMouseDownMulti(e as any, i);
                                                return;
                                              }

                                              setSelectedStepIdx(i);
                                              setSelectedStepIndices([]);
                                              if ('shiftKey' in e && e.shiftKey) return;
                                              if (onStepTouchStart) {
                                                onStepTouchStart(e, ptn.id, i, inst.id, val, (newVal) => {
                                                  onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, newVal);
                                                });
                                              }
                                            }}
                                            onChange={(e) => {
                                              onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, e.target.value.toUpperCase());
                                            }}
                                            onKeyDown={(e) => {
                                              const inputEl = e.currentTarget;
                                              const cardGrid = inputEl.closest('.step-boxes');
                                              const inputs = cardGrid ? Array.from(cardGrid.querySelectorAll('input')) : [];
                                              const indexInGrid = inputs.indexOf(inputEl);

                                              if (e.key === 'Delete' || e.key === 'Backspace' || e.key === ' ') {
                                                e.preventDefault();
                                                onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, '0');
                                                if (e.key === 'Backspace' && indexInGrid > 0) {
                                                  const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
                                                  prevEl.focus();
                                                  prevEl.select();
                                                }
                                                return;
                                              }

                                              if (e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Enter') {
                                                e.preventDefault();
                                                if (indexInGrid < inputs.length - 1) {
                                                  const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
                                                  nextEl.focus();
                                                  nextEl.select();
                                                }
                                                return;
                                              }
                                              
                                              if (e.key === 'ArrowLeft') {
                                                e.preventDefault();
                                                if (indexInGrid > 0) {
                                                  const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
                                                  prevEl.focus();
                                                  prevEl.select();
                                                }
                                                return;
                                              }

                                              const upper = e.key.toUpperCase();
                                              const isAlphaNum = upper.length === 1 && upper.match(/^[A-Z0-9]$/);
                                              if (isAlphaNum && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                                e.preventDefault();
                                                onVariationStepValueChange && onVariationStepValueChange(ptn.id, variation.id, i, upper);
                                                if (indexInGrid < inputs.length - 1) {
                                                  const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
                                                  nextEl.focus();
                                                  nextEl.select();
                                                }
                                              }
                                            }}
                                            className={`text-center text-sm font-bold cordel-border-sm outline-none p-0 box-border z-10 relative transition-all duration-200 ${
                                              (val === 0 || val === '0') ? 'bg-[#ece4d0] text-[#1a1a1a]' : ''
                                            } ${
                                              selectedStepIdx === i && selectedVariationId === variation.id
                                                ? '!border-2 !border-[#8b2a1a] shadow-[0_0_8px_rgba(139,42,26,0.6)] scale-110 z-20'
                                                : 'focus:border-[#8b2a1a]'
                                            }`}
                                            style={{
                                              width: '36px',
                                              height: '36px',
                                              ...colorStyle,
                                            }}
                                          />
                                          {/* Sculpting micro-bars */}
                                          <div className="w-full flex flex-col gap-[2px] mt-1 z-10 relative">
                                            {/* Volume bar (Green) */}
                                            <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                              <div className="h-full bg-green-600 transition-all" style={{ width: `${variation.volumes?.[i] ?? 100}%` }} />
                                            </div>
                                            {/* Decay bar (Amber) */}
                                            <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
                                              <div className="h-full bg-amber-500 transition-all" style={{ width: `${variation.decays?.[i] ?? 100}%` }} />
                                            </div>
                                            {/* Micro-timing bar (Blue bi-directional) */}
                                            {(() => {
                                              const manualVal = variation.microtimings?.[i] ?? 0;
                                              const swingOffset = getStepSwingPercent(i, variation.steps.length, ptn.beatResolutions);
                                              const totalShift = Math.max(-100, Math.min(100, manualVal + swingOffset));
                                              return (
                                                <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
                                                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
                                                  {totalShift !== 0 && (
                                                    <div
                                                      className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
                                                      style={{
                                                        left: totalShift > 0 ? '50%' : 'auto',
                                                        right: totalShift < 0 ? '50%' : 'auto',
                                                        width: `${Math.min(50, Math.abs(totalShift) / 2)}%`
                                                      }}
                                                    />
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add Variation Button */}
                      <button
                        onClick={() => onAddPatternVariation && onAddPatternVariation(ptn.id)}
                        className="text-xs font-bold text-[#1a1a1a] bg-transparent border-2 border-dashed border-[#1a1a1a]/40 px-3 py-1.5 self-start hover:border-[#1a1a1a] hover:bg-[#1a1a1a]/5 transition-colors"
                      >
                        + {lang === 'fr' ? 'Ajouter une variation probabiliste' : 'Adicionar variação probabilística'}
                      </button>
                    </div>
                  )}

                  {/* Step Sculptor Panel for this pattern */}
                  {selectedPatternId === ptn.id && selectedStepIdx !== null && (
                    <div className="bg-[#ece4d0] cordel-border-sm p-3 mt-3 flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between text-xs border-b border-[#1a1a1a]/20 pb-1.5 text-[#1a1a1a]">
                        <span className="font-bold">
                          🎛️ {lang === 'fr' ? 'Sculpteur' : 'Escultor'} — {
                            selectedStepIndices.length > 1
                              ? (lang === 'fr' ? `${selectedStepIndices.length} pas sélectionnés` : `${selectedStepIndices.length} passos selecionados`)
                              : (lang === 'fr' ? `Pas ${selectedStepIdx + 1}` : `Passo ${selectedStepIdx + 1}`)
                          }
                          {(() => {
                            const activeVarObj = selectedVariationId ? ptn.variations?.find(v => v.id === selectedVariationId) : null;
                            if (activeVarObj) {
                              return ` (Var: ${activeVarObj.name})`;
                            }
                            return '';
                          })()}
                          {selectedStepIndices.length <= 1 && (() => {
                            const activeVarObj = selectedVariationId ? ptn.variations?.find(v => v.id === selectedVariationId) : null;
                            const effectiveSteps = activeVarObj ? activeVarObj.steps : ptn.activeSteps;
                            const stepVal = effectiveSteps[selectedStepIdx];
                            return ` (${stepVal === 0 ? (lang === 'fr' ? 'Silence' : 'Silêncio') : `${lang === 'fr' ? 'Coup' : 'Golpe'}: ${stepVal}`})`;
                          })()}
                        </span>
                        <button 
                          onClick={() => {
                            const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
                            if (selectedVariationId && onVariationStepVolumeChange && onVariationStepDecayChange && onVariationStepMicrotimingChange) {
                              onVariationStepVolumeChange(ptn.id, selectedVariationId, targets, 80);
                              onVariationStepDecayChange(ptn.id, selectedVariationId, targets, 100);
                              onVariationStepMicrotimingChange(ptn.id, selectedVariationId, targets, 0);
                            } else {
                              onStepVolumeChange(ptn.id, targets, 80);
                              onStepDecayChange(ptn.id, targets, 100);
                              onStepMicrotimingChange(ptn.id, targets, 0);
                            }
                          }}
                          className="text-[#8b2a1a] font-bold text-[10px] uppercase hover:underline cursor-pointer"
                        >
                          {lang === 'fr' ? 'Réinitialiser' : 'Resetar'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#1a1a1a]">
                        {/* Volume slider */}
                        <div className="flex flex-col gap-0.5">
                          {(() => {
                            const activeVarObj = selectedVariationId ? ptn.variations?.find(v => v.id === selectedVariationId) : null;
                            const effectiveVolumes = activeVarObj ? activeVarObj.volumes : ptn.volumes;
                            const currVol = effectiveVolumes?.[selectedStepIdx] ?? 80;
                            return (
                              <>
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span>🔊 Volume</span>
                                  <span>{currVol}%</span>
                                </div>
                                <input 
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={currVol}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
                                    if (selectedVariationId && onVariationStepVolumeChange) {
                                      onVariationStepVolumeChange(ptn.id, selectedVariationId, targets, val);
                                    } else {
                                      onStepVolumeChange(ptn.id, targets, val);
                                    }
                                  }}
                                  className="w-full accent-green-600 cursor-pointer h-2 bg-[#1a1a1a]/10"
                                />
                              </>
                            );
                          })()}
                        </div>

                        {/* Decay slider */}
                        <div className="flex flex-col gap-0.5">
                          {(() => {
                            const activeVarObj = selectedVariationId ? ptn.variations?.find(v => v.id === selectedVariationId) : null;
                            const effectiveDecays = activeVarObj ? activeVarObj.decays : ptn.decays;
                            const currDecay = effectiveDecays?.[selectedStepIdx] ?? 100;
                            return (
                              <>
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span>⏳ {lang === 'fr' ? 'Résonance' : 'Ressonância'} (Decay)</span>
                                  <span>{currDecay}%</span>
                                </div>
                                <input 
                                  type="range"
                                  min="10"
                                  max="100"
                                  value={currDecay}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
                                    if (selectedVariationId && onVariationStepDecayChange) {
                                      onVariationStepDecayChange(ptn.id, selectedVariationId, targets, val);
                                    } else {
                                      onStepDecayChange(ptn.id, targets, val);
                                    }
                                  }}
                                  className="w-full accent-amber-500 cursor-pointer h-2 bg-[#1a1a1a]/10"
                                />
                              </>
                            );
                          })()}
                        </div>

                        {/* Micro-timing slider */}
                        <div className="flex flex-col gap-0.5">
                          {(() => {
                            const activeVarObj = selectedVariationId ? ptn.variations?.find(v => v.id === selectedVariationId) : null;
                            const effectiveMicros = activeVarObj ? activeVarObj.microtimings : ptn.microtimings;
                            const manualVal = effectiveMicros?.[selectedStepIdx] ?? 0;
                            const swingOffset = getStepSwingPercent(selectedStepIdx, ptn.steps, ptn.beatResolutions);
                            const totalVal = manualVal + swingOffset;
                            const clampedTotalVal = Math.max(-100, Math.min(100, totalVal));

                            return (
                              <>
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span>⏱️ Micro-timing ({lang === 'fr' ? 'Décalage' : 'Desvio'})</span>
                                  <span>
                                    {totalVal > 0 ? `+${totalVal}` : totalVal}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 relative h-6">
                                  <span className="text-[8px] font-bold opacity-60 shrink-0">-100%</span>
                                  <div className="flex-grow h-2 relative flex items-center">
                                    {/* Background track with a center notch */}
                                    <div className="absolute inset-x-0 h-1 bg-[#1a1a1a]/15 rounded" />
                                    <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-3 bg-[#1a1a1a]/40 z-10" />
                                    
                                    {/* Bi-directional Blue track representing offset from center */}
                                    {totalVal !== 0 && (() => {
                                      const widthPercent = Math.min(50, Math.abs(totalVal) / 2); // half-width is 50%, range is 100
                                      return (
                                        <div
                                          className="absolute h-1 bg-[#2980b9]"
                                          style={{
                                            left: totalVal > 0 ? '50%' : 'auto',
                                            right: totalVal < 0 ? '50%' : 'auto',
                                            width: `${widthPercent}%`
                                          }}
                                        />
                                      );
                                    })()}

                                    <input
                                      type="range"
                                      min="-100"
                                      max="100"
                                      value={clampedTotalVal}
                                      onChange={(e) => {
                                        const newTotal = parseInt(e.target.value);
                                        const newManual = newTotal - swingOffset;
                                        const clampedManual = Math.max(-100, Math.min(100, newManual));
                                        const targets = selectedStepIndices.length > 0 ? selectedStepIndices : [selectedStepIdx];
                                        if (selectedVariationId && onVariationStepMicrotimingChange) {
                                          onVariationStepMicrotimingChange(ptn.id, selectedVariationId, targets, clampedManual);
                                        } else {
                                          onStepMicrotimingChange(ptn.id, targets, clampedManual);
                                        }
                                      }}
                                      className="absolute inset-x-0 w-full h-4 opacity-100 cursor-pointer slider-transparent-track"
                                    />
                                  </div>
                                  <span className="text-[8px] font-bold opacity-60 shrink-0">+50%</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
                  )}
                </SortablePatternWrapper>
              );
            })}
              </SortableContext>
            </DndContext>

          {/* Add pattern button */}
          <button
            onClick={onAddPattern}
            className="self-start bg-[#f4ecd8] text-[#1a1a1a] cordel-border-sm cordel-button px-4 py-2 font-cactus font-bold text-sm cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors"
          >
            + {lang === 'fr' ? 'Ajouter un motif' : 'Adicionar padrão'}
          </button>
        </div>

          {/* ─── Right sidebar: Stroke legend ─── */}
          <div
            className="border-t-[3px] md:border-t-0 md:border-l-[3px] border-[#1a1a1a] bg-[#ece4d0] p-4 shrink-0 flex flex-col gap-4 w-full md:w-[240px] md:overflow-y-auto"
          >
            {/* Legend title */}
            <div className="border-b-[2px] border-[#1a1a1a] pb-2">
              <h3 className="font-cactus font-bold text-sm uppercase tracking-wide">
                {t('legend')}
              </h3>
              <p className="text-[10px] text-[#666] mt-0.5">{inst.name}</p>
            </div>

            {/* Sculpting Legend */}
            <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] flex flex-col gap-1.5 text-[#1a1a1a]">
              <p className="font-bold">🎛️ {lang === 'fr' ? 'Sculpture du son' : 'Escultura do som'}:</p>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 bg-green-600 shrink-0" />
                <span>{lang === 'fr' ? 'Volume du pas (0-100%)' : 'Volume do passo (0-100%)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1 bg-amber-500 shrink-0" />
                <span>{lang === 'fr' ? 'Résonance/Decay (10-100%)' : 'Ressonância/Decay (10-100%)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1.5 bg-[#2980b9] shrink-0" />
                <span>
                  {lang === 'fr'
                    ? 'Micro-timing (Gauche: Avance, Droite: Retard)'
                    : 'Micro-timing (Esquerda: Avanço, Direita: Atraso)'}
                </span>
              </div>
              <p className="text-[9px] text-[#666] mt-0.5 leading-tight">
                {lang === 'fr' 
                  ? 'Cliquez sur un pas pour afficher ses curseurs sous le motif.' 
                  : 'Clique em um passo para exibir seus controles sob o padrão.'}
              </p>
            </div>

            {/* Voice-specific instructions */}
            {inst.type === 'voice' && (
              <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] flex flex-col gap-1">
                <p className="font-bold">🎤 {lang === 'fr' ? 'Voix / Chœur' : 'Voz / Coro'}</p>
                <p>{lang === 'fr'
                  ? 'Cliquez en haut de la case (PUX/CORO) pour changer qui chante.'
                  : 'Clique no topo da caixa (PUX/CORO) para alterar quem canta.'
                }</p>
                <p>{lang === 'fr'
                  ? 'Puxador: Orange (Aigu). Chœur: Cyan (Grave).'
                  : 'Puxador: Laranja (Agudo). Coro: Ciano (Grave).'
                }</p>
              </div>
            )}

            {/* Stroke list */}
            <div className="flex flex-col gap-2">
              {strokes.map((stroke, sIdx) => {
                const bgColor = inst.colors[stroke.colorKey] || '#666';
                let txtColor = inst.colors.text || '#f4ecd8';
                if (isDarkText(inst.id, stroke.colorKey)) {
                  txtColor = '#1a1a1a';
                }

                return (
                  <div key={sIdx} className="flex items-center gap-2.5">
                    {/* Color swatch with symbol */}
                    <div
                      className="flex items-center justify-center cordel-border-sm font-bold text-xs shrink-0"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: bgColor,
                        color: txtColor,
                        borderColor: '#1a1a1a',
                      }}
                    >
                      {stroke.symbol.length <= 2 ? stroke.symbol : stroke.symbol.charAt(0)}
                    </div>

                    {/* Label + shortcut */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-[#1a1a1a] leading-tight">{stroke.label}</span>
                      <span className="text-[9px] text-[#666] leading-tight">
                        {lang === 'fr' ? 'Touche' : 'Tecla'}: {stroke.shortcut}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Keyboard navigation tips */}
            <div className="bg-[#f4ecd8] cordel-border-sm p-2.5 text-[10px] mt-auto flex flex-col gap-1">
              <p className="font-bold">⌨️ {lang === 'fr' ? 'Astuces' : 'Dicas'}:</p>
              <p>{lang === 'fr'
                ? 'Espace pour avancer et laisser un silence.'
                : 'Espaço para avançar e deixar um silêncio.'
              }</p>
              <p>{lang === 'fr'
                ? 'Flèches (←/→) pour naviguer.'
                : 'Setas (←/→) para navegar.'
              }</p>
            </div>
          </div>
        </div>
      </div>

      {/* Load Pattern Modal */}
      {loadModalPatternId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLoadModalPatternId(null)}>
          <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b-2 border-[#1a1a1a] pb-2">
              <h3 className="font-cactus text-3xl font-bold text-[#1a1a1a]">
                {lang === 'fr' ? 'Catalogue - ' : 'Catálogo - '}{inst.name}
              </h3>
              <button onClick={() => setLoadModalPatternId(null)} className="text-[#1a1a1a] font-bold text-xl hover:text-[#8b2a1a]">
                ✕
              </button>
            </div>
            
            {existingFolders.length === 0 ? (
              <div className="text-center py-8 text-[#666] font-bold text-sm italic">
                {lang === 'fr' ? 'Aucune phrase sauvegardée pour cet instrument.' : 'Nenhum padrão salvo para este instrumento.'}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {existingFolders.map(folder => {
                  const isExpanded = expandedFolders[folder] ?? true;
                  const folderPatterns = existingLibraryPatterns.filter(p => p.folder === folder);
                  return (
                    <div key={folder} className="border border-[#1a1a1a] rounded-sm bg-[#eaddcf]">
                      <button 
                        onClick={() => toggleFolder(folder as string)}
                        className="w-full flex items-center justify-between p-3 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 transition-colors font-bold text-[#1a1a1a] text-lg font-cactus text-left"
                      >
                        <span className="flex items-center gap-2">
                          {isExpanded ? '📂' : '📁'} {folder} <span className="text-xs opacity-60">({folderPatterns.length})</span>
                        </span>
                        <span>{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="flex flex-col divide-y divide-[#1a1a1a]/20">
                          {folderPatterns.map(libPtn => (
                            <div key={libPtn.id} className="flex items-center justify-between p-3 hover:bg-white/50 transition-colors">
                              <div className="flex flex-col">
                                <span className="font-bold text-[#1a1a1a]">{libPtn.name}</span>
                                <span className="text-xs text-[#666]">{new Date(libPtn.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleLoadPatternFromLibrary(libPtn.id)}
                                  className="px-3 py-1 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-xs hover:bg-[#6b1e11] transition-colors cordel-border-sm"
                                >
                                  {lang === 'fr' ? 'Charger' : 'Carregar'}
                                </button>
                                <button
                                    onClick={async () => {
                                      if (confirm(lang === 'fr' ? 'Supprimer définitivement cette phrase du catalogue ?' : 'Excluir permanentemente este padrão do catálogo?')) {
                                        try {
                                          await deleteCloudPattern(libPtn.id);
                                          setCloudPatterns(prev => prev.filter(p => p.id !== libPtn.id));
                                        } catch (err) {
                                          console.error(err);
                                          alert(lang === 'fr' ? 'Erreur lors de la suppression.' : 'Erro ao excluir.');
                                        }
                                      }
                                    }}
                                  className="p-1 hover:bg-[#1a1a1a]/10 rounded transition-colors text-xl"
                                  title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Pattern Modal */}
      {saveModalPatternId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSaveModalPatternId(null)}>
          <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a] mb-4">
              {lang === 'fr' ? 'Sauvegarder dans le catalogue' : 'Salvar no catálogo'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
                {lang === 'fr' ? 'Nom de la phrase' : 'Nome do padrão'}
              </label>
              <input
                type="text"
                value={savePatternName}
                onChange={(e) => setSavePatternName(e.target.value)}
                className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
                placeholder={lang === 'fr' ? 'Ex: Groovy Break' : 'Ex: Groovy Break'}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
                {lang === 'fr' ? 'Dossier / Répertoire' : 'Pasta / Diretório'}
              </label>
              <input
                type="text"
                list="folder-suggestions"
                value={savePatternFolder}
                onChange={(e) => setSavePatternFolder(e.target.value)}
                className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
                placeholder={lang === 'fr' ? 'Ex: Général' : 'Ex: Geral'}
              />
              <datalist id="folder-suggestions">
                {existingFolders.map(folder => (
                  <option key={folder} value={folder} />
                ))}
              </datalist>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-[#1a1a1a] mb-1">
                {lang === 'fr' ? 'Visibilité' : 'Visibilidade'}
              </label>
              <select
                value={savePatternVisibility}
                onChange={(e) => setSavePatternVisibility(e.target.value as CatalogVisibility)}
                className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]"
              >
                <option value="private">{lang === 'fr' ? 'Privé (Uniquement moi)' : 'Privado (Somente eu)'}</option>
                {userProfile?.role === 'mestre' && (
                  <option value="mestre_group">{lang === 'fr' ? 'Mon groupe' : 'Meu grupo'}</option>
                )}
                {userProfile?.role === 'admin' && (
                  <option value="admin_global">{lang === 'fr' ? 'Global (Tout le monde)' : 'Global (Todos)'}</option>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveModalPatternId(null)}
                className="px-4 py-2 border border-[#1a1a1a] text-[#1a1a1a] font-bold text-sm hover:bg-[#eaddcf] transition-colors"
                disabled={isSavingPattern}
              >
                {lang === 'fr' ? 'Annuler' : 'Cancelar'}
              </button>
              <button
                onClick={handleSavePatternToLibrary}
                disabled={!savePatternName.trim() || isSavingPattern}
                className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm disabled:opacity-50 hover:bg-[#6b1e11] transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                {isSavingPattern ? '...' : (lang === 'fr' ? 'Enregistrer' : 'Salvar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-[#8b2a1a] text-[#f4ecd8] font-cactus font-bold text-lg px-6 py-3 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>,
    document.body
  );
};

export const InstrumentDetailEditor = React.memo(InstrumentDetailEditorComponent, (prevProps, nextProps) => {
  const storeState = useSequencerStore.getState();
  const prevTrack = storeState.tracks.find(t => t.id === prevProps.trackId);
  const nextTrack = storeState.tracks.find(t => t.id === nextProps.trackId);

  const prevStepsSig = prevTrack?.patterns.map(p => {
    const prevStep = (prevProps.isPlaying && prevProps.currentStepIndex >= 0)
      ? Math.floor((prevProps.currentStepIndex / prevProps.maxTicks) * p.steps)
      : -1;
    return `${p.id}:${prevStep}`;
  }).join(',') || '';

  const nextStepsSig = nextTrack?.patterns.map(p => {
    const nextStep = (nextProps.isPlaying && nextProps.currentStepIndex >= 0)
      ? Math.floor((nextProps.currentStepIndex / nextProps.maxTicks) * p.steps)
      : -1;
    return `${p.id}:${nextStep}`;
  }).join(',') || '';

  if (prevStepsSig !== nextStepsSig) {
    return false;
  }

  // CORRECTION FADERS : Forcer la mise à jour si le parent a muté les volumes/décays
  if (prevProps.trackId !== nextProps.trackId) {
    return false;
  }

  const keys = Object.keys(prevProps) as Array<keyof InstrumentDetailEditorProps>;
  for (const key of keys) {
    if (key === 'trackId') continue;
    if (key === 'currentStepIndex' || key === 'currentMeasure') continue;

    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
});
