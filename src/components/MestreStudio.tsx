import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Trash2, 
  Plus, 
  Download, 
  Clipboard, 
  ArrowLeft, 
  Image as ImageIcon, 
  Music, 
  FileText, 
  Sparkles, 
  Award, 
  HelpCircle,
  Eye,
  Sliders,
  Settings,
  Cloud
} from 'lucide-react';
const CircleSequencer = React.lazy(() => import('./CircleSequencer').then(m => ({ default: m.CircleSequencer })));
import { TrackGroup, Language } from '../types';
import { useGameData } from '../contexts/GameDataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  saveExerciseToCloud, 
  saveProgressionToCloud, 
  saveOrUpdateProgressionToCloud,
  fetchMestreProgressions,
  deleteProgressionFromCloud,
  GameType, 
  CloudExercise, 
  CloudProgression,
  fetchAllMestreExercises 
} from '../cloudExercises';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { instrumentsConfig } from '../data';
import LZString from 'lz-string';
import { getLocalLibrary } from '../library';
import { QuizTab, QuizQuestionStudio } from './mestre-studio/QuizTab';
import { DicteeTab } from './mestre-studio/DicteeTab';
import { InspecteurTab } from './mestre-studio/InspecteurTab';
import { SablierTab } from './mestre-studio/SablierTab';
import { RythmeLiveTab } from './mestre-studio/RythmeLiveTab';
import { VaralTab } from './mestre-studio/VaralTab';

let sharedAudioCtx: AudioContext | null = null;
const getSharedAudioCtx = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
};
interface MestreStudioProps {
  lang: Language;
  onExit: () => void;
  presetFiles?: string[];
  localPresets?: string[];
}

// 1. Config Varal Types
export interface GameSlot {
  id: string; // unique ID for React keys
  source: 'cloud' | 'local' | 'empty';
  cloudExerciseId?: string;
  cloudExerciseName?: string;
  localExerciseData?: any;
  localExerciseName?: string;
}

export interface CordeRewardStudio {
  text: string;
  type: 'image' | 'video' | 'pdf' | 'json' | 'none';
  url: string;
  base64: string;
}

export interface CordeConfig {
  requiredCount: number;
  gameType?: 'quiz' | 'dictee' | 'inspecteur' | 'sablier_mestre' | 'rythme_live' | 'random';
  games: GameSlot[];
  reward: CordeRewardStudio;
  oeuvreToniBraga: string; // Base64 (legacy fallback)
  rewardData: string; // legacy fallback
}

export const MestreStudio: React.FC<MestreStudioProps> = ({ 
  lang, 
  onExit,
  presetFiles = [],
  localPresets = []
}) => {
  // 6 Specialized Tabs
  type TabType = 'varal' | 'quiz' | 'dictee' | 'inspecteur' | 'sablier' | 'rythmelive';
  const [activeTab, setActiveTab] = useState<TabType>('varal');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const { userProfile } = useAuth();
  const mestreUid = userProfile?.uid || 'local';

  // Multi-Varal State
  const [cloudProgressionsList, setCloudProgressionsList] = useState<CloudProgression[]>([]);
  const [activeProgressionIds, setActiveProgressionIds] = useState<string[]>([]);
  const [varalName, setVaralName] = useState('Mon Varal');
  const [editingVaralId, setEditingVaralId] = useState<string | null>(null);

  const loadProgressions = useCallback(() => {
    if (mestreUid && mestreUid !== 'local') {
      fetchMestreProgressions(mestreUid).then((res: any) => {
        setCloudProgressionsList(res.progressions);
        
        const varalDocRef = doc(db, 'varals', `mestre_${mestreUid}`);
        getDoc(varalDocRef).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.activeVarals && Array.isArray(data.activeVarals)) {
              const activeIds = data.activeVarals.map((v: any) => v.id).filter(Boolean);
              setActiveProgressionIds(activeIds);
            }
          }
        });
      }).catch((err: any) => console.error("Failed to fetch progressions:", err));
    }
  }, [mestreUid]);

  useEffect(() => {
    loadProgressions();
  }, [loadProgressions]);

  useEffect(() => {
    return () => {
      // 🛡️ FIX (Audit): Reset playhead to clear highlights on unmount
      window.dispatchEvent(new CustomEvent('o-girador-tick', { 
        detail: { step: -1, measure: 0, maxTicks: 16 } 
      }));
    };
  }, []);

  // Cloud States
  const [cloudSaveModalOpen, setCloudSaveModalOpen] = useState(false);
  const [cloudSaveName, setCloudSaveName] = useState('');
  const [cloudSaveError, setCloudSaveError] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudSaveSuccess, setCloudSaveSuccess] = useState('');

  // Consume GameData Context
  const { loadVaralConfig, addExercise, removeExercise, clearAllData, customExercises } = useGameData();
  const [importMessages, setImportMessages] = useState<string[]>([]);

  // Universal Playback States
  const [studioPlaying, setStudioPlaying] = useState(false);
  const [studioStep, setStudioStep] = useState(-1);

  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportMessages([]);
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.module === 'varal_config') {
            loadVaralConfig(json);
            setImportMessages(prev => [...prev, `Configuration Varal chargée avec succès (${file.name}) !`]);
          } else if (['quiz', 'dictee', 'inspecteur', 'sablier_mestre', 'rythme_live'].includes(json.module)) {
            addExercise(json);
            setImportMessages(prev => [...prev, `Exercice "${json.folheto_titre || json.module}" importé avec succès (${file.name}) !`]);
          } else {
            setImportMessages(prev => [...prev, `Erreur : Le fichier ${file.name} n'est pas un module O Girador valide.`]);
          }
        } catch (err) {
          setImportMessages(prev => [...prev, `Erreur de lecture de ${file.name} : format JSON invalide.`]);
        }
      };
      reader.readAsText(file);
    });
  };

  // Helper for generating initial tracks (Alfaia, Caixa, Gongue, Agbe)
  function createInitialTracks(prefix = 'track'): TrackGroup[] {
    const instruments = [
      { idx: 0, name: 'Alfaia' },
      { idx: 3, name: 'Caixa' },
      { idx: 5, name: 'Gonguê' },
      { idx: 6, name: 'Agbê' },
    ];
    const initial = instruments.map((inst, index) => {
      const patternId = Date.now() + index * 100 + Math.floor(Math.random() * 50);
      return {
        id: index + 1,
        instrumentIdx: inst.idx,
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 80,
        selectedPatternId: patternId,
        radius: 0,
        reverbVal: 0,
        panVal: 0,
        patterns: [
          {
            id: patternId,
            name: `${prefix}_${inst.name}`,
            steps: 16,
            activeSteps: Array(16).fill(0),
            lyrics: Array(16).fill(''),
            notes: Array(16).fill(''),
            measureAssignments: [true],
          }
        ]
      };
    });

    // Compute radii
    const minRadius = 180;
    const maxRadius = 495;
    const gap = (maxRadius - minRadius) / (initial.length - 1);
    initial.forEach((t, idx) => {
      t.radius = minRadius + idx * gap;
    });

    return initial;
  }

  // Helper for generating single track (used for target/sabotaged tracks)
  function createInitialSingleTrack(instIdx: number, label: string): TrackGroup[] {
    const patternId = Date.now() + Math.floor(Math.random() * 1000);
    return [
      {
        id: 1,
        instrumentIdx: instIdx,
        isMute: false,
        isSolo: false,
        isHidden: false,
        volumeVal: 80,
        selectedPatternId: patternId,
        radius: 337, // middle radius (180 + 495) / 2
        reverbVal: 0,
        panVal: 0,
        patterns: [
          {
            id: patternId,
            name: label,
            steps: 16,
            activeSteps: Array(16).fill(0),
            lyrics: Array(16).fill(''),
            notes: Array(16).fill(''),
            measureAssignments: [true],
          }
        ]
      }
    ];
  }

  // Instrument helpers
  const getInstrumentIdxFromName = (name: string): number => {
    if (name === 'alfaia') return 0;
    if (name === 'caixa') return 3;
    if (name === 'gongue') return 5;
    if (name === 'agbe') return 6;
    return 3;
  };

  // --- STATE DECLARATIONS ---

  // 1. Config Varal State
  const [varalCordes, setVaralCordes] = useState<CordeConfig[]>([
    { requiredCount: 3, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 2, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
  ]);
  
  const [diplomaText, setDiplomaText] = useState('');
  const [diplomaSignature, setDiplomaSignature] = useState(''); // Base64
  const [cloudExercisesList, setCloudExercisesList] = useState<CloudExercise[]>([]);
  const [copiedJsonText, setCopiedJsonText] = useState('');
  const [varalActiveCordesCount, setVaralActiveCordesCount] = useState<number>(5);

  useEffect(() => {
    if (mestreUid && mestreUid !== 'local') {
      fetchAllMestreExercises(mestreUid).then(exercises => {
        setCloudExercisesList(exercises);
      }).catch(err => console.error("Failed to fetch mestre exercises:", err));
    }
  }, [mestreUid]);

  // 2. Quiz State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizRewardText, setQuizRewardText] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionStudio[]>([
    {
      id: 'q_1',
      type: 'image',
      questionTextFr: '',
      questionTextPt: '',
      mediaUrl: '',
      mediaFile: '',
      optionsFr: ['', '', '', ''],
      optionsPt: ['', '', '', ''],
      correctIndex: 0,
      explanationFr: '',
      explanationPt: ''
    }
  ]);

  // 3. Dictée de Blocs State
  const [dicteeTitle, setDicteeTitle] = useState('');
  const [dicteeRewardVideoUrl, setDicteeRewardVideoUrl] = useState('');
  const [rythmeLiveRewardVideoUrl, setRythmeLiveRewardVideoUrl] = useState('');
  const [rythmeLiveCordeCible, setRythmeLiveCordeCible] = useState<number>(0);
  const [rythmeLiveTotalMeasures, setRythmeLiveTotalMeasures] = useState<number>(1);
  const [dicteeBpm, setDicteeBpm] = useState(83);
  const [dicteeBlocksCount, setDicteeBlocksCount] = useState<4 | 8 | 16>(4);
  const [dicteeTotalMeasures, setDicteeTotalMeasures] = useState<number>(1);
  const [dicteeTracks, setDicteeTracks] = useState<TrackGroup[]>(() => createInitialTracks('dictee'));
  const [dicteeTargetInstrumentId, setDicteeTargetInstrumentId] = useState<string>('');
  const [dicteeCordeCible, setDicteeCordeCible] = useState<number>(0);
  const [dicteeMeasureIndex, setDicteeMeasureIndex] = useState<number>(0);
  const [dicteeBlockTags, setDicteeBlockTags] = useState<string[]>(Array(8).fill(''));

  // 4. L'Inspecteur State
  const [inspecteurTitle, setInspecteurTitle] = useState('');
  const [inspecteurDescription, setInspecteurDescription] = useState('');
  const [inspecteurBpm, setInspecteurBpm] = useState(83);
  const [inspecteurGuiltyInstrument, setInspecteurGuiltyInstrument] = useState<'alfaia' | 'caixa' | 'gongue' | 'agbe'>('caixa');
  const [inspecteurTotalMeasures, setInspecteurTotalMeasures] = useState<number>(1);
  const [inspecteurCordeCible, setInspecteurCordeCible] = useState<number>(0);
  const [inspecteurLoopStart, setInspecteurLoopStart] = useState<number>(1);
  const [inspecteurLoopEnd, setInspecteurLoopEnd] = useState<number>(1);
  const [inspecteurCurrentMeasure, setInspecteurCurrentMeasure] = useState<number>(0);
  const [inspecteurPerfectTracks, setInspecteurPerfectTracks] = useState<TrackGroup[]>(() => createInitialTracks('ins_perf'));
  const [inspecteurSabotagedTracks, setInspecteurSabotagedTracks] = useState<TrackGroup[]>(() => createInitialSingleTrack(3, 'SABOTAGED_CAIXA'));

  // Sync dictee measures count
  useEffect(() => {
    setDicteeTracks(prev => prev.map(t => {
      const patterns = [...t.patterns];
      while (patterns.length < dicteeTotalMeasures) {
        const lastPattern = patterns[patterns.length - 1];
        patterns.push({
          id: Date.now() + Math.random(),
          name: `${lastPattern.name}_copy`,
          steps: 16,
          activeSteps: [...lastPattern.activeSteps],
          lyrics: [...lastPattern.lyrics],
          notes: [...lastPattern.notes],
          measureAssignments: [true]
        });
      }
      return { ...t, patterns: patterns.slice(0, dicteeTotalMeasures) };
    }));
  }, [dicteeTotalMeasures]);

  // Sync inspecteur measures count
  useEffect(() => {
    const resizeTracks = (tracks: TrackGroup[]) => {
      return tracks.map(t => {
        const patterns = [...t.patterns];
        while (patterns.length < inspecteurTotalMeasures) {
          const lastPattern = patterns[patterns.length - 1];
          patterns.push({
            id: Date.now() + Math.random(),
            name: `${lastPattern.name}_copy`,
            steps: 16,
            activeSteps: [...lastPattern.activeSteps],
            lyrics: [...lastPattern.lyrics],
            notes: [...lastPattern.notes],
            measureAssignments: [true]
          });
        }
        return { ...t, patterns: patterns.slice(0, inspecteurTotalMeasures) };
      });
    };
    setInspecteurPerfectTracks(prev => resizeTracks(prev));
    setInspecteurSabotagedTracks(prev => resizeTracks(prev));
  }, [inspecteurTotalMeasures]);

  // Sync inspecteur sabotaged track type with selected guilty instrument
  useEffect(() => {
    const instIdx = getInstrumentIdxFromName(inspecteurGuiltyInstrument);
    setInspecteurSabotagedTracks(prev => {
      const copy = [...prev];
      copy[0].instrumentIdx = instIdx;
      copy[0].patterns[0].name = `SABOTAGED_${inspecteurGuiltyInstrument.toUpperCase()}`;
      return copy;
    });
  }, [inspecteurGuiltyInstrument]);

  // 5. Sablier du Mestre State
  const [sablierTitle, setSablierTitle] = useState('');
  const [sablierRewardVideoUrl, setSablierRewardVideoUrl] = useState('');
  const [sablierBpm, setSablierBpm] = useState(83);
  const [sablierCordeCible, setSablierCordeCible] = useState<number>(0);
  const [sablierMeasures, setSablierMeasures] = useState<1 | 2>(2);
  const [sablierTotalMeasures, setSablierTotalMeasures] = useState<number>(1);
  const [sablierHandImageType, setSablierHandImageType] = useState<'url' | 'upload'>('upload');
  const [sablierHandImageUrl, setSablierHandImageUrl] = useState('');
  const [sablierHandImageFile, setSablierHandImageFile] = useState('');

  const [sablierSeqFond, setSablierSeqFond] = useState<TrackGroup[]>([]);
  const [sablierSeqFondName, setSablierSeqFondName] = useState<string>('');
  
  const [sablierSeqCible, setSablierSeqCible] = useState<TrackGroup[]>([]);
  const [sablierSeqCibleName, setSablierSeqCibleName] = useState<string>('');
  
  const [sablierSeqPiege1, setSablierSeqPiege1] = useState<TrackGroup[]>([]);
  const [sablierSeqPiege1Name, setSablierSeqPiege1Name] = useState<string>('');
  
  const [sablierSeqPiege2, setSablierSeqPiege2] = useState<TrackGroup[]>([]);
  const [sablierSeqPiege2Name, setSablierSeqPiege2Name] = useState<string>('');
  
  const [sablierSeqPiege3, setSablierSeqPiege3] = useState<TrackGroup[]>([]);
  const [sablierSeqPiege3Name, setSablierSeqPiege3Name] = useState<string>('');

  // 6. Rythme Live State
  const [rythmeLiveTitle, setRythmeLiveTitle] = useState('');
  const [rythmeLiveRewardSignatory, setRythmeLiveRewardSignatory] = useState('');
  const [rythmeLiveBpm, setRythmeLiveBpm] = useState(83);
  const [rythmeLiveLoopsRequired, setRythmeLiveLoopsRequired] = useState(2);
  const [rythmeLiveToleranceMs, setRythmeLiveToleranceMs] = useState<30 | 80>(80);
  const [rythmeLiveStudentInstrument, setRythmeLiveStudentInstrument] = useState<'alfaia' | 'caixa' | 'gongue' | 'agbe'>('caixa');
  const [rythmeLivePlaybackTracks, setRythmeLivePlaybackTracks] = useState<TrackGroup[]>(() => createInitialTracks('live_play'));
  const [rythmeLiveTargetTracks, setRythmeLiveTargetTracks] = useState<TrackGroup[]>(() => createInitialSingleTrack(3, 'TARGET_CAIXA'));

  const allStudioTracks = useMemo(() => [
    ...dicteeTracks,
    ...inspecteurPerfectTracks,
    ...inspecteurSabotagedTracks,
    ...rythmeLivePlaybackTracks,
    ...rythmeLiveTargetTracks,
    ...sablierSeqFond,
    ...sablierSeqCible,
    ...sablierSeqPiege1,
    ...sablierSeqPiege2,
    ...sablierSeqPiege3
  ], [dicteeTracks, inspecteurPerfectTracks, inspecteurSabotagedTracks, rythmeLivePlaybackTracks, rythmeLiveTargetTracks, sablierSeqFond, sablierSeqCible, sablierSeqPiege1, sablierSeqPiege2, sablierSeqPiege3]);

  useEffect(() => {
    let previousTick: number | null = null;
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number }>;
      const { step } = customEvent.detail;
      
      if (previousTick !== null) {
        const prevH = document.getElementsByClassName('step-active-highlight');
        while (prevH.length > 0) prevH[0].classList.remove('step-active-highlight', 'border-[#8b2a1a]');
        const prevV = document.getElementsByClassName('step-active-highlight-v');
        while (prevV.length > 0) prevV[0].classList.remove('step-active-highlight-v', 'border-[#8b2a1a]');
      }
      
      if (step >= 0) {
        allStudioTracks.forEach(t => {
          t.patterns.forEach(ptn => {
            let el = document.getElementById(`step-cell-${t.id}-${ptn.id}-${step}`);
            if (el) el.classList.add('step-active-highlight', 'border-[#8b2a1a]');
            el = document.getElementById(`step-cell-v-${t.id}-${ptn.id}-${step}`);
            if (el) el.classList.add('step-active-highlight-v', 'border-[#8b2a1a]');
          });
        });
      }
      
      previousTick = step;
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => window.removeEventListener('o-girador-tick', handleTick);
  }, [allStudioTracks]);


  // Sync rythme live target track type with selected student instrument
  useEffect(() => {
    const instIdx = getInstrumentIdxFromName(rythmeLiveStudentInstrument);
    setRythmeLiveTargetTracks(prev => {
      const copy = [...prev];
      copy[0].instrumentIdx = instIdx;
      copy[0].patterns[0].name = `TARGET_${rythmeLiveStudentInstrument.toUpperCase()}`;
      return copy;
    });
  }, [rythmeLiveStudentInstrument]);


  // Clean play loop when leaving page or tab changes
  useEffect(() => {
    setStudioPlaying(false);
    setStudioStep(-1);
  }, [activeTab]);

  // Determine current active BPM based on active tab
  const activeBpm = useMemo(() => {
    if (activeTab === 'dictee') return dicteeBpm;
    if (activeTab === 'inspecteur') return inspecteurBpm;
    if (activeTab === 'sablier') return sablierBpm;
    if (activeTab === 'rythmelive') return rythmeLiveBpm;
    return 83;
  }, [activeTab, dicteeBpm, inspecteurBpm, sablierBpm, rythmeLiveBpm]);

  // Determine active tracks list for play synth triggers
  const activeTracksList = useMemo(() => {
    if (activeTab === 'dictee') return dicteeTracks;
    if (activeTab === 'inspecteur') return inspecteurPerfectTracks;
    if (activeTab === 'rythmelive') return rythmeLivePlaybackTracks;
    return [];
  }, [activeTab, dicteeTracks, inspecteurPerfectTracks, rythmeLivePlaybackTracks]);

  // Universal Playhead Loop
  useEffect(() => {
    if (!studioPlaying) {
      setStudioStep(-1);
      window.dispatchEvent(new CustomEvent('o-girador-tick', {
        detail: { step: -1, measure: 0, maxTicks: 16, ratio: 0 }
      }));
      return;
    }

    const stepDurationMs = (60 / activeBpm) * 1000 / 4;
    let currentStep = -1;

    const playSynthTick = (freq: number, duration: number) => {
      try {
        // 🛡️ FIX (Audit): Reuse shared AudioContext and resume if suspended
        const audioCtx = getSharedAudioCtx();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {
        // Ignored
      }
    };

    const intervalId = setInterval(() => {
      currentStep = (currentStep + 1) % 16;
      setStudioStep(currentStep);

      // Play click beep on beats (0, 4, 8, 12)
      if (currentStep === 0) {
        playSynthTick(700, 0.06);
      } else if (currentStep % 4 === 0) {
        playSynthTick(500, 0.04);
      }

      // Play instrument triggers in sequencers
      activeTracksList.forEach(track => {
        if (!track.isMute) {
          const activePattern = track.patterns.find(p => p.id === track.selectedPatternId);
          if (activePattern) {
            const hit = activePattern.activeSteps[currentStep];
            if (hit && hit !== 0 && hit !== '0') {
              const freq = track.instrumentIdx === 0 ? 150 : // Alfaia
                           track.instrumentIdx === 3 ? 400 : // Caixa
                           track.instrumentIdx === 5 ? 800 : // Gongue
                           300; // Agbe
              playSynthTick(freq, 0.05);
            }
          }
        }
      });

      // Dispatch event to animate canvas playheads
      window.dispatchEvent(new CustomEvent('o-girador-tick', {
        detail: {
          step: currentStep,
          measure: 0,
          maxTicks: 16,
          ratio: currentStep / 16
        }
      }));
    }, stepDurationMs);

    return () => clearInterval(intervalId);
  }, [studioPlaying, activeBpm, activeTracksList]);


  // --- SEQUENCER PROP HELPERS ---

  const getActivePatternMap = (list: TrackGroup[]) => {
    const map: Record<number, number | null> = {};
    list.forEach(t => {
      map[t.id] = t.selectedPatternId;
    });
    return map;
  };

  const handleStepChangeGeneric = (
    list: TrackGroup[],
    setList: React.Dispatch<React.SetStateAction<TrackGroup[]>>,
    trackId: number,
    patternId: number,
    stepIdx: number,
    newState: string | number,
    lyric?: string,
    note?: string
  ) => {
    setList(prev => prev.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            if (p.id === patternId) {
              const activeSteps = [...p.activeSteps];
              activeSteps[stepIdx] = newState;

              const lyrics = [...(p.lyrics || Array(p.steps).fill(''))];
              if (lyric !== undefined) lyrics[stepIdx] = lyric;

              const notes = [...(p.notes || Array(p.steps).fill(''))];
              if (note !== undefined) notes[stepIdx] = note;

              return { ...p, activeSteps, lyrics, notes };
            }
            return p;
          })
        };
      }
      return t;
    }));
  };

  // --- UPLOAD HELPERS ---

  const handleCordeImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setVaralCordes(prev => prev.map((c, idx) => {
          if (idx === index) return { ...c, oeuvreToniBraga: event.target!.result as string };
          return c;
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuizMediaUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setQuizQuestions(prev => prev.map((q, idx) => {
          if (idx === index) return { ...q, mediaFile: event.target!.result as string };
          return q;
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSablierImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSablierHandImageFile(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- PRESET LOADING HELPER ---
  const handleLoadPresetToGame = async (presetName: string, moduleName: string) => {
    if (!presetName) return;
    try {
      let presetData: any = null;
      if (presetName.endsWith('.json')) {
        const response = await fetch(`/presets/${presetName}`);
        if (response.ok) {
          const dataStr = await response.text();
          presetData = JSON.parse(dataStr);
        }
      } else {
        const library = await getLocalLibrary();
        presetData = library[presetName];
      }

      if (!presetData) {
        alert('Impossible de charger le preset.');
        return;
      }

      const loadedTracks = presetData.tracks || [];
      const bpm = presetData.measureBpms && presetData.measureBpms.length > 0
        ? presetData.measureBpms[0]
        : (presetData.bpm || 83);

      if (moduleName === 'inspecteur') {
        setInspecteurBpm(bpm);
        setInspecteurPerfectTracks(loadedTracks);
        // Automatically clone the guilty instrument to sabotaged tracks
        const targetIdx = getInstrumentIdxFromName(inspecteurGuiltyInstrument);
        const guiltyTrack = loadedTracks.find((t: any) => t.instrumentIdx === targetIdx);
        if (guiltyTrack) {
          setInspecteurSabotagedTracks([JSON.parse(JSON.stringify(guiltyTrack))]);
        }
      } else if (moduleName === 'dictee') {
        setDicteeBpm(bpm);
        setDicteeTracks(loadedTracks);
      } else if (moduleName === 'rythme_live') {
        setRythmeLiveBpm(bpm);
        setRythmeLivePlaybackTracks(loadedTracks);
      } else if (moduleName === 'sablier_mestre') {
        setSablierBpm(bpm);
        setSablierSeqFond(loadedTracks);
        setSablierSeqFondName(presetName);
      }
    } catch (err) {
      console.error('Error loading preset:', err);
      alert('Erreur lors du chargement du preset.');
    }
  };

  const handleLoadSablierSequence = (e: React.ChangeEvent<HTMLInputElement>, targetSequence: 'fond' | 'cible' | 'piege1' | 'piege2' | 'piege3') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // On accepte un export de séquence live ou tout autre module qui a des 'playback_audio' ou des 'sequence_audio'
        // ou on accepte n'importe quel fichier valide avec des pistes. Mais souvent les fichiers exportés ont un tableau différent.
        // Si c'est un fichier "Dictée" par exemple, la partition est dans `sequence_audio`.
        // Simplifions: on suppose que le Mestre a composé dans le `Rythme Live` (playback_audio) ou l'Inspecteur.
        // On va juste chercher s'il y a un tableau de pistes et le convertir grossièrement.
        // Pour être sûr, disons qu'on charge un JSON d'exercice, on prend les pistes du `playback_audio` ou de `sequence_audio`.
        let tracks: any[] = [];
        if (json.playback_audio) tracks = json.playback_audio;
        else if (json.sequence_audio) tracks = json.sequence_audio;
        else if (json.partition_parfaite) tracks = json.partition_parfaite;
        else if (Array.isArray(json)) tracks = json;

        if (tracks && tracks.length > 0) {
          const formattedTracks = tracks.map((t: any, idx: number) => ({
             id: t.id || idx,
             instrumentIdx: t.instrumentIdx,
             patterns: t.patterns ? t.patterns : [{ activeSteps: t.activeSteps || Array(16).fill(0) }]
          }));

          const name = file.name;
          if (targetSequence === 'fond') {
             setSablierSeqFond(formattedTracks);
             setSablierSeqFondName(name);
          } else if (targetSequence === 'cible') {
             setSablierSeqCible(formattedTracks);
             setSablierSeqCibleName(name);
          } else if (targetSequence === 'piege1') {
             setSablierSeqPiege1(formattedTracks);
             setSablierSeqPiege1Name(name);
          } else if (targetSequence === 'piege2') {
             setSablierSeqPiege2(formattedTracks);
             setSablierSeqPiege2Name(name);
          } else if (targetSequence === 'piege3') {
             setSablierSeqPiege3(formattedTracks);
             setSablierSeqPiege3Name(name);
          }
        } else {
          alert("Erreur: Le fichier JSON ne semble pas contenir de partition musicale.");
        }
      } catch (err) {
        alert("Erreur de lecture du fichier JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveToCloudSubmit = async () => {
    if (!cloudSaveName.trim()) {
      setCloudSaveError(lang === 'fr' ? "Veuillez entrer un nom." : "Por favor, insira um nome.");
      return;
    }
    
    setIsSavingCloud(true);
    setCloudSaveError('');
    setCloudSaveSuccess('');
    
    try {
      const exportData = getExportDataForCurrentTab(activeTab);
      if (!exportData) throw new Error("No data");

      if (activeTab === 'varal') {
        await saveProgressionToCloud(cloudSaveName, exportData, mestreUid);
      } else {
        await saveExerciseToCloud(cloudSaveName, activeTab as GameType, exportData, mestreUid);
      }
      
      setCloudSaveSuccess(lang === 'fr' ? "Sauvegardé avec succès !" : "Salvo com sucesso !");
      setTimeout(() => {
        setCloudSaveModalOpen(false);
        setCloudSaveName('');
        setCloudSaveSuccess('');
      }, 1500);
    } catch (err: any) {
      if (err.message === 'NAME_EXISTS') {
        setCloudSaveError(lang === 'fr' ? "Un élément avec ce nom existe déjà." : "Um item com este nome já existe.");
      } else {
        setCloudSaveError(lang === 'fr' ? "Erreur de sauvegarde." : "Erro ao salvar.");
      }
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleSaveVaralToCloud = async () => {
    if (!varalName.trim()) {
      alert(lang === 'fr' ? "Veuillez entrer un nom pour le Varal." : "Por favor, insira um nome para o Varal.");
      return;
    }
    setIsSavingCloud(true);
    try {
      const exportData = getExportDataForCurrentTab('varal');
      if (!exportData) throw new Error("No data");

      const savedId = await saveOrUpdateProgressionToCloud(editingVaralId, varalName, exportData, mestreUid);
      setEditingVaralId(savedId);
      alert(lang === 'fr' ? "Varal sauvegardé avec succès dans le Cloud !" : "Varal salvo com sucesso no Cloud !");
      
      // Update local list
      fetchMestreProgressions(mestreUid).then((res: any) => {
        setCloudProgressionsList(res.progressions);
        // If it was already active, update the active config in Firestore
        if (activeProgressionIds.includes(savedId)) {
          const updatedList = res.progressions;
          updateActiveVaralsInFirestore(activeProgressionIds, updatedList);
        }
      });
    } catch (err: any) {
      if (err.message === 'NAME_EXISTS') {
        alert(lang === 'fr' ? "Un Varal avec ce nom existe déjà." : "Um Varal com este nome já existe.");
      } else {
        alert(lang === 'fr' ? "Erreur de sauvegarde." : "Erro ao salvar.");
      }
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleDeleteVaral = async (id: string) => {
    if (!window.confirm(lang === 'fr' ? "Voulez-vous vraiment supprimer ce Varal ?" : "Deseja realmente excluir este Varal ?")) return;
    try {
      await deleteProgressionFromCloud(id);
      if (editingVaralId === id) {
        setEditingVaralId(null);
        setVaralName('Mon Varal');
      }
      const nextActiveIds = activeProgressionIds.filter(activeId => activeId !== id);
      setActiveProgressionIds(nextActiveIds);
      await updateActiveVaralsInFirestore(nextActiveIds, cloudProgressionsList.filter(p => p.id !== id));
      
      alert(lang === 'fr' ? "Varal supprimé." : "Varal excluído.");
      loadProgressions();
    } catch(e) {
      alert("Erreur de suppression");
    }
  };

  const handleToggleVaralActive = async (progId: string) => {
    let nextActiveIds = [...activeProgressionIds];
    if (nextActiveIds.includes(progId)) {
      nextActiveIds = nextActiveIds.filter(id => id !== progId);
    } else {
      nextActiveIds.push(progId);
    }
    setActiveProgressionIds(nextActiveIds);
    await updateActiveVaralsInFirestore(nextActiveIds, cloudProgressionsList);
  };

  const updateActiveVaralsInFirestore = async (newActiveIds: string[], updatedProgressions: CloudProgression[]) => {
    try {
      if (mestreUid === 'local') return;
      const docRef = doc(db, 'varals', `mestre_${mestreUid}`);
      
      const activeConfigs = newActiveIds.map(id => {
        const prog = updatedProgressions.find(p => p.id === id);
        if (!prog) return null;
        try {
          const decompressed = LZString.decompressFromBase64(prog.data);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            return {
              id: prog.id,
              name: prog.name,
              ...parsed
            };
          }
        } catch(e) { console.error("Error parsing progression for activation:", e); }
        return null;
      }).filter(Boolean);
      
      await setDoc(docRef, {
        activeVarals: activeConfigs,
        lastUpdatedAt: Date.now()
      }, { merge: true });
      
    } catch (err) {
      console.error("Failed to update active varals in Firestore:", err);
    }
  };

  // --- RENDER ---QUESTION EDITING HELPERS ---

  const handleLoadDraft = (e: React.ChangeEvent<HTMLInputElement>, moduleName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.module !== moduleName && !(moduleName === 'varal_config' && json.module === 'varal_config')) {
          alert(`Erreur : Le fichier importé n'est pas un module "${moduleName}".`);
          return;
        }

        if (moduleName === 'varal_config') {
          if (json.diplomaText) setDiplomaText(json.diplomaText);
          if (json.diplomaSignature) setDiplomaSignature(json.diplomaSignature);
          if (json.cordes && Array.isArray(json.cordes)) {
            setVaralActiveCordesCount(Math.min(5, Math.max(1, json.cordes.length)));
            setVaralCordes(prev => prev.map((c, idx) => {
              const loadedCorde = json.cordes[idx];
              if (loadedCorde) {
                return {
                  requiredCount: loadedCorde.requiredCount || 1,
                  gameType: loadedCorde.gameType || 'random',
                  games: loadedCorde.games || [],
                  reward: loadedCorde.reward || { text: '', type: 'none', url: '', base64: '' },
                  oeuvreToniBraga: loadedCorde.oeuvreToniBraga || '',
                  rewardData: loadedCorde.rewardData || ''
                };
              }
              return c;
            }));
          }
        } else if (moduleName === 'quiz') {
          setQuizTitle(json.folheto_titre || '');
          setQuizRewardText(json.recompense_texte || '');
          if (json.questions && Array.isArray(json.questions)) {
            const mappedQs: QuizQuestionStudio[] = json.questions.map((q: any, i: number) => ({
              id: q.id || `q_${i+1}`,
              type: q.type || 'text',
              questionTextFr: q.questionText?.fr || '',
              questionTextPt: q.questionText?.pt || '',
              mediaUrl: q.mediaUrl || '',
              mediaFile: q.mediaUrl?.startsWith('data:') ? q.mediaUrl : '',
              optionsFr: q.options?.fr || ['', '', '', ''],
              optionsPt: q.options?.pt || ['', '', '', ''],
              correctIndex: q.options?.fr?.indexOf(q.correctAnswer?.fr) >= 0 
                              ? q.options?.fr?.indexOf(q.correctAnswer?.fr) 
                              : 0,
              explanationFr: q.explanation?.fr || '',
              explanationPt: q.explanation?.pt || ''
            }));
            setQuizQuestions(mappedQs);
          }
        } else if (moduleName === 'dictee') {
          setDicteeTitle(json.folheto_titre || '');
          setDicteeRewardVideoUrl(json.recompense_video_url || '');
          setDicteeBpm(json.bpm || 83);
          if (json.nombre_de_blocs) setDicteeBlocksCount(json.nombre_de_blocs as 4 | 8);
          if (json.blocs_a_ordonner) {
            setDicteeBlockTags(Array.from({length: 8}).map((_, i) => json.blocs_a_ordonner[i]?.label || ''));
          }
          if (json.sequence_audio && Array.isArray(json.sequence_audio)) {
            setDicteeTracks(prev => prev.map(t => {
               const saved = json.sequence_audio.find((st: any) => st.instrumentIdx === t.instrumentIdx);
               if (saved) {
                 const savedActiveSteps = saved.patterns?.[0]?.activeSteps || saved.activeSteps || Array(16).fill(0);
                 const savedLyrics = saved.patterns?.[0]?.lyrics || saved.lyrics || Array(16).fill('');
                 const savedNotes = saved.patterns?.[0]?.notes || saved.notes || Array(16).fill('');
                 return {
                   ...t,
                   patterns: [{ ...t.patterns[0], activeSteps: savedActiveSteps, lyrics: savedLyrics, notes: savedNotes }]
                 };
               }
               return t;
            }));
          }
        } else if (moduleName === 'inspecteur') {
          setInspecteurTitle(json.folheto_titre || '');
          setInspecteurDescription(json.description || '');
          setInspecteurBpm(json.bpm || 83);
          setInspecteurGuiltyInstrument(json.instrument_coupable || 'caixa');
          if (json.partition_parfaite && Array.isArray(json.partition_parfaite)) {
             setInspecteurPerfectTracks(prev => prev.map(t => {
               const saved = json.partition_parfaite.find((st: any) => st.instrumentIdx === t.instrumentIdx);
               if (saved) {
                 return {
                   ...t,
                   patterns: [{ ...t.patterns[0], activeSteps: saved.activeSteps || Array(16).fill(0) }]
                 };
               }
               return t;
            }));
          }
          if (json.piste_sabotee && Array.isArray(json.piste_sabotee)) {
             setInspecteurSabotagedTracks(prev => {
                const copy = [...prev];
                const saved = json.piste_sabotee[0];
                if (saved) {
                   copy[0].patterns[0].activeSteps = saved.activeSteps || Array(16).fill(0);
                }
                return copy;
             });
          }
        } else if (moduleName === 'sablier_mestre') {
          setSablierTitle(json.folheto_titre || '');
          setSablierRewardVideoUrl(json.recompense_video_url || '');
          setSablierBpm(json.bpm || 83);
          setSablierMeasures(json.nombre_de_mesures as 1 | 2 || 2);
          if (json.image_main) {
            if (json.image_main.startsWith('data:')) {
              setSablierHandImageType('upload');
              setSablierHandImageFile(json.image_main);
            } else {
              setSablierHandImageType('url');
              setSablierHandImageUrl(json.image_main);
            }
          }
          if (json.sequence_fond) setSablierSeqFond(json.sequence_fond);
          if (json.sequence_cible) setSablierSeqCible(json.sequence_cible);
          if (json.sequence_piege_1) setSablierSeqPiege1(json.sequence_piege_1);
          if (json.sequence_piege_2) setSablierSeqPiege2(json.sequence_piege_2);
          if (json.sequence_piege_3) setSablierSeqPiege3(json.sequence_piege_3);
        } else if (moduleName === 'rythme_live') {
          setRythmeLiveTitle(json.folheto_titre || '');
          setRythmeLiveRewardSignatory(json.recompense_diplome_signataire || '');
          setRythmeLiveBpm(json.bpm || 83);
          setRythmeLiveLoopsRequired(json.boucles_requises || 2);
          setRythmeLiveToleranceMs(json.tolerance_ms as 30 | 80 || 80);
          setRythmeLiveStudentInstrument(json.instrument_eleve || 'caixa');
          if (json.playback_audio && Array.isArray(json.playback_audio)) {
             setRythmeLivePlaybackTracks(prev => prev.map(t => {
               const saved = json.playback_audio.find((st: any) => st.instrumentIdx === t.instrumentIdx);
               if (saved) {
                 return {
                   ...t,
                   patterns: [{ ...t.patterns[0], activeSteps: saved.activeSteps || Array(16).fill(0) }]
                 };
               }
               return t;
            }));
          }
          if (json.partition_cible && Array.isArray(json.partition_cible)) {
             setRythmeLiveTargetTracks(prev => {
                const copy = [...prev];
                const saved = json.partition_cible[0];
                if (saved) {
                   copy[0].patterns[0].activeSteps = saved.activeSteps || Array(16).fill(0);
                }
                return copy;
             });
          }
        }
        
        alert(`Brouillon chargé avec succès !`);
      } catch (err) {
        alert("Erreur de lecture du fichier JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const addQuestion = () => {
    if (quizQuestions.length >= 10) return;
    setQuizQuestions(prev => [
      ...prev,
      {
        id: `q_${prev.length + 1}`,
        type: 'image',
        questionTextFr: '',
        questionTextPt: '',
        mediaUrl: '',
        mediaFile: '',
        optionsFr: ['', '', '', ''],
        optionsPt: ['', '', '', ''],
        correctIndex: 0,
        explanationFr: '',
        explanationPt: ''
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateQuestionField = (index: number, field: keyof QuizQuestionStudio, value: any) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const updateQuestionOption = (index: number, optIndex: number, textLang: 'fr' | 'pt', val: string) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx === index) {
        if (textLang === 'fr') {
          const next = [...q.optionsFr];
          next[optIndex] = val;
          return { ...q, optionsFr: next };
        } else {
          const next = [...q.optionsPt];
          next[optIndex] = val;
          return { ...q, optionsPt: next };
        }
      }
      return q;
    }));
  };

  // --- EXPORT COMPILER ---

  const getExportDataForCurrentTab = (tab: TabType) => {
    let exportData: any = null;
    const uniqueId = `custom_${Date.now()}`;

    if (tab === 'varal') {
      exportData = {
        module: 'varal_config',
        id: editingVaralId || uniqueId,
        name: varalName,
        diplomaText,
        diplomaSignature,
        cordes: varalCordes.slice(0, varalActiveCordesCount).map((c, idx) => ({
          cordeIndex: idx + 1,
          requiredCount: Number(c.requiredCount) || 1,
          gameType: c.gameType || 'random',
          games: Array.from({ length: Number(c.requiredCount) || 1 }).map((_, slotIdx) => {
            const g = c.games[slotIdx];
            if (g && g.source === 'local' && g.localExerciseData) return g.localExerciseData;
            if (g && g.source === 'cloud' && g.cloudExerciseId) {
              const ce = cloudExercisesList.find(x => x.id === g.cloudExerciseId);
              if (ce) {
                try {
                  const decompressed = LZString.decompressFromBase64(ce.data);
                  if (decompressed) return JSON.parse(decompressed);
                } catch(e) { console.error("Failed to parse cloud data", e); }
              }
            }
            const targetMod = c.gameType && c.gameType !== 'random' ? c.gameType : 'quiz';
            return {
              id: `random_${idx + 1}_${slotIdx + 1}_${Math.random().toString(36).substring(2, 9)}`,
              module: targetMod,
              folheto_titre: `Défi Aléatoire ${idx + 1}.${slotIdx + 1}`,
              isRandom: true
            };
          }),
          reward: c.reward,
          oeuvreToniBraga: c.oeuvreToniBraga,
          rewardData: c.rewardData
        }))
      };
    } else if (tab === 'quiz') {
      exportData = {
        id: uniqueId,
        module: 'quiz',
        folheto_titre: quizTitle,
        recompense_texte: quizRewardText,
        questions: quizQuestions.map((q, idx) => ({
          id: `q_${idx + 1}`,
          type: q.type,
          mediaUrl: q.mediaFile ? q.mediaFile : q.mediaUrl,
          questionText: {
            fr: q.questionTextFr || q.questionTextPt,
            pt: q.questionTextPt || q.questionTextFr
          },
          options: {
            fr: q.optionsFr.map((o, oIdx) => o || q.optionsPt[oIdx] || `Option ${oIdx + 1}`),
            pt: q.optionsPt.map((o, oIdx) => o || q.optionsFr[oIdx] || `Opção ${oIdx + 1}`)
          },
          correctAnswer: {
            fr: q.optionsFr[q.correctIndex] || q.optionsPt[q.correctIndex] || '',
            pt: q.optionsPt[q.correctIndex] || q.optionsFr[q.correctIndex] || ''
          },
          explanation: {
            fr: q.explanationFr || q.explanationPt || '',
            pt: q.explanationPt || q.explanationFr || ''
          }
        }))
      };
    } else if (tab === 'dictee') {
      exportData = {
        id: uniqueId,
        module: 'dictee',
        folheto_titre: dicteeTitle,
        recompense_video_url: dicteeRewardVideoUrl,
        bpm: Number(dicteeBpm) || 83,
        nombre_de_blocs: Number(dicteeBlocksCount) || 4,
        instrument_cible: dicteeTargetInstrumentId,
        sequence_audio: dicteeTracks.map(t => ({
          id: t.id,
          instrumentIdx: t.instrumentIdx,
          patterns: [{
            activeSteps: t.patterns[dicteeMeasureIndex]?.activeSteps || t.patterns[0]?.activeSteps,
            lyrics: t.patterns[dicteeMeasureIndex]?.lyrics || t.patterns[0]?.lyrics,
            notes: t.patterns[dicteeMeasureIndex]?.notes || t.patterns[0]?.notes,
            volumes: t.patterns[dicteeMeasureIndex]?.volumes || t.patterns[0]?.volumes
          }]
        }))
      };
    } else if (tab === 'inspecteur') {
      exportData = {
        id: uniqueId,
        module: 'inspecteur',
        folheto_titre: inspecteurTitle,
        description: inspecteurDescription,
        bpm: Number(inspecteurBpm) || 83,
        loop_start: Math.max(0, inspecteurLoopStart - 1),
        loop_end: Math.max(0, inspecteurLoopEnd - 1),
        instrument_coupable: inspecteurGuiltyInstrument,
        partition_parfaite: inspecteurPerfectTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          patterns: t.patterns.map(p => ({ activeSteps: p.activeSteps }))
        })),
        piste_sabotee: inspecteurSabotagedTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          patterns: t.patterns.map(p => ({ activeSteps: p.activeSteps }))
        }))
      };
    } else if (tab === 'sablier') {
      const exportTrack = (t: any) => ({
        instrumentIdx: t.instrumentIdx,
        patterns: t.patterns.map((p: any) => ({ activeSteps: p.activeSteps }))
      });
      exportData = {
        id: uniqueId,
        module: 'sablier_mestre',
        folheto_titre: sablierTitle,
        bpm: Number(sablierBpm) || 83,
        nombre_de_mesures: Number(sablierMeasures) || 1,
        image_main: sablierHandImageType === 'upload' ? sablierHandImageFile : sablierHandImageUrl,
        sequence_fond: sablierSeqFond.map(exportTrack),
        sequence_cible: sablierSeqCible.map(exportTrack),
        sequence_piege_1: sablierSeqPiege1.map(exportTrack),
        sequence_piege_2: sablierSeqPiege2.map(exportTrack),
        sequence_piege_3: sablierSeqPiege3.map(exportTrack)
      };
    } else if (tab === 'rythmelive') {
      exportData = {
        id: uniqueId,
        module: 'rythme_live',
        folheto_titre: rythmeLiveTitle,
        recompense_diplome_signataire: rythmeLiveRewardSignatory,
        bpm: Number(rythmeLiveBpm) || 83,
        boucles_requises: Number(rythmeLiveLoopsRequired) || 2,
        tolerance_ms: Number(rythmeLiveToleranceMs) || 80,
        instrument_eleve: rythmeLiveStudentInstrument,
        playback_audio: rythmeLivePlaybackTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          activeSteps: t.patterns[0].activeSteps
        })),
        partition_cible: rythmeLiveTargetTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          activeSteps: t.patterns[0].activeSteps
        }))
      };
    }

    return exportData;
  };

  const handleGenerateExercise = () => {
    const exportData = getExportDataForCurrentTab(activeTab);
    if (!exportData) return;

    const jsonString = JSON.stringify(exportData, null, 2);
    setCopiedJsonText(jsonString);
    setShowCopyModal(true);

    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exercice_${activeTab}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Auto-download blocked, showing modal instead", err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(copiedJsonText);
    alert(lang === 'fr' ? 'Copié dans le presse-papier !' : 'Copiado para a área de transferência !');
  };

  return (
    <div className="w-full h-full overflow-y-auto cordel-bg select-none font-sans custom-scrollbar">
      <div className="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-4">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'fr' ? 'Retour' : 'Voltar'}
        </button>
        <h2 className="font-cactus text-2xl md:text-3xl uppercase tracking-wider text-[var(--cordel-text)] font-extrabold flex items-center gap-2">
          👑 {lang === 'fr' ? 'Studio du mestre' : 'Studio do mestre'}
        </h2>
        <div className="text-[10px] uppercase font-bold text-[var(--cordel-wood)] border-2 border-[var(--cordel-wood)] px-2 py-0.5 rotate-[-2deg]">
          Générateur JSON
        </div>
      </div>

      {/* Main Tabbed Menu */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[var(--cordel-border)] pb-2 justify-center lg:justify-start">
        {[
          { id: 'varal', label: '1. Config Varal', icon: <Settings className="w-4 h-4" /> },
          { id: 'quiz', label: '2. Quiz', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'dictee', label: '3. Dictée de blocs', icon: <Music className="w-4 h-4" /> },
          { id: 'inspecteur', label: "4. L'Inspecteur", icon: <Sliders className="w-4 h-4" /> },
          { id: 'sablier', label: '5. Sablier du Mestre', icon: <HelpCircle className="w-4 h-4" /> },
          { id: 'rythmelive', label: '6. Rythme Live', icon: <Award className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={`flex items-center gap-2 px-3 py-2 font-bold text-xs uppercase cordel-border-sm cursor-pointer transition-transform ${
              activeTab === t.id
                ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] scale-105'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/15'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Playback controls (visible on tabs containing sequencers) */}
      {(activeTab === 'dictee' || activeTab === 'inspecteur' || activeTab === 'rythmelive') && (
        <div className="flex items-center gap-4 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-3 cordel-border-sm w-full max-w-sm self-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]/70">Tempo:</span>
            <input
              type="number"
              value={activeBpm}
              min={50}
              max={200}
              onChange={(e) => {
                const val = Math.max(50, Math.min(200, Number(e.target.value) || 83));
                if (activeTab === 'dictee') setDicteeBpm(val);
                if (activeTab === 'inspecteur') setInspecteurBpm(val);
                if (activeTab === 'rythmelive') setRythmeLiveBpm(val);
              }}
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded w-16 text-center font-bold text-sm focus:outline-none"
            />
            <span className="font-bold text-xs text-[var(--cordel-text)]/50">BPM</span>
          </div>

          <button
            onClick={() => setStudioPlaying(!studioPlaying)}
            className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-base cordel-border-sm cordel-button cursor-pointer ${
              studioPlaying
                ? 'bg-[var(--cordel-wood)] text-white animate-pulse'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
            }`}
          >
            {studioPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        </div>
      )}

      {/* Onglet Content Box */}
      <div className="min-h-[450px]">

        {/* 1. CONFIG VARAL */}
        {activeTab === 'varal' && (
          <VaralTab
            lang={lang}
            cloudProgressionsList={cloudProgressionsList}
            activeProgressionIds={activeProgressionIds}
            editingVaralId={editingVaralId}
            setEditingVaralId={setEditingVaralId}
            varalName={varalName}
            setVaralName={setVaralName}
            varalCordes={varalCordes}
            setVaralCordes={setVaralCordes}
            varalActiveCordesCount={varalActiveCordesCount}
            setVaralActiveCordesCount={setVaralActiveCordesCount}
            diplomaText={diplomaText}
            setDiplomaText={setDiplomaText}
            diplomaSignature={diplomaSignature}
            setDiplomaSignature={setDiplomaSignature}
            handleToggleVaralActive={handleToggleVaralActive}
            handleDeleteVaral={handleDeleteVaral}
            cloudExercisesList={cloudExercisesList}
            handleLoadDraft={handleLoadDraft}
          />
        )}

        {/* 2. CORDE 1: QUIZ */}
        {activeTab === 'quiz' && (
          <QuizTab
            lang={lang}
            quizTitle={quizTitle}
            setQuizTitle={setQuizTitle}
            quizRewardText={quizRewardText}
            setQuizRewardText={setQuizRewardText}
            quizQuestions={quizQuestions}
            onLoadDraft={(e) => handleLoadDraft(e, 'quiz')}
            addQuestion={addQuestion}
            removeQuestion={removeQuestion}
            updateQuestionField={updateQuestionField}
            handleQuizMediaUpload={handleQuizMediaUpload}
            updateQuestionOption={updateQuestionOption}
          />
        )}

        {/* 3. CORDE 2: DICTÉE DE BLOCS */}
        {activeTab === 'dictee' && (
          <DicteeTab
            lang={lang}
            dicteeCordeCible={dicteeCordeCible}
            setDicteeCordeCible={setDicteeCordeCible}
            dicteeTitle={dicteeTitle}
            setDicteeTitle={setDicteeTitle}
            dicteeRewardVideoUrl={dicteeRewardVideoUrl}
            setDicteeRewardVideoUrl={setDicteeRewardVideoUrl}
            dicteeTargetInstrumentId={dicteeTargetInstrumentId}
            setDicteeTargetInstrumentId={setDicteeTargetInstrumentId}
            dicteeTracks={dicteeTracks}
            setDicteeTracks={setDicteeTracks}
            dicteeTotalMeasures={dicteeTotalMeasures}
            setDicteeTotalMeasures={setDicteeTotalMeasures}
            dicteeBpm={dicteeBpm}
            setDicteeBpm={setDicteeBpm}
            dicteeBlocksCount={dicteeBlocksCount}
            setDicteeBlocksCount={setDicteeBlocksCount}
            dicteeMeasureIndex={dicteeMeasureIndex}
            setDicteeMeasureIndex={setDicteeMeasureIndex}
            presetFiles={presetFiles}
            localPresets={localPresets}
            handleLoadPresetToGame={handleLoadPresetToGame}
            handleLoadDraft={handleLoadDraft}
            studioPlaying={studioPlaying}
            setStudioPlaying={setStudioPlaying}
            handleStepChangeGeneric={handleStepChangeGeneric}
            getActivePatternMap={getActivePatternMap}
          />
        )}

        {/* 4. CORDE 3: L'INSPECTEUR */}
        {activeTab === 'inspecteur' && (
          <InspecteurTab
            lang={lang}
            inspecteurCordeCible={inspecteurCordeCible}
            setInspecteurCordeCible={setInspecteurCordeCible}
            inspecteurTitle={inspecteurTitle}
            setInspecteurTitle={setInspecteurTitle}
            inspecteurDescription={inspecteurDescription}
            setInspecteurDescription={setInspecteurDescription}
            inspecteurGuiltyInstrument={inspecteurGuiltyInstrument}
            setInspecteurGuiltyInstrument={setInspecteurGuiltyInstrument}
            inspecteurTotalMeasures={inspecteurTotalMeasures}
            setInspecteurTotalMeasures={setInspecteurTotalMeasures}
            inspecteurBpm={inspecteurBpm}
            setInspecteurBpm={setInspecteurBpm}
            inspecteurCurrentMeasure={inspecteurCurrentMeasure}
            setInspecteurCurrentMeasure={setInspecteurCurrentMeasure}
            inspecteurPerfectTracks={inspecteurPerfectTracks}
            setInspecteurPerfectTracks={setInspecteurPerfectTracks}
            inspecteurSabotagedTracks={inspecteurSabotagedTracks}
            setInspecteurSabotagedTracks={setInspecteurSabotagedTracks}
            presetFiles={presetFiles}
            localPresets={localPresets}
            handleLoadPresetToGame={handleLoadPresetToGame}
            handleLoadDraft={handleLoadDraft}
            studioPlaying={studioPlaying}
            setStudioPlaying={setStudioPlaying}
            handleStepChangeGeneric={handleStepChangeGeneric}
            getActivePatternMap={getActivePatternMap}
          />
        )}

        {/* 5. CORDE 4: SABLIER DU MESTRE */}
        {activeTab === 'sablier' && (
          <SablierTab
            lang={lang}
            sablierCordeCible={sablierCordeCible}
            setSablierCordeCible={setSablierCordeCible}
            sablierTitle={sablierTitle}
            setSablierTitle={setSablierTitle}
            sablierMeasures={sablierMeasures}
            setSablierMeasures={setSablierMeasures}
            sablierBpm={sablierBpm}
            setSablierBpm={setSablierBpm}
            sablierSeqFondName={sablierSeqFondName}
            sablierSeqCibleName={sablierSeqCibleName}
            sablierSeqPiege1Name={sablierSeqPiege1Name}
            sablierSeqPiege2Name={sablierSeqPiege2Name}
            sablierSeqPiege3Name={sablierSeqPiege3Name}
            sablierHandImageType={sablierHandImageType}
            setSablierHandImageType={setSablierHandImageType}
            sablierHandImageUrl={sablierHandImageUrl}
            setSablierHandImageUrl={setSablierHandImageUrl}
            sablierHandImageFile={sablierHandImageFile}
            handleSablierImageUpload={handleSablierImageUpload}
            handleLoadSablierSequence={handleLoadSablierSequence}
            handleLoadDraft={handleLoadDraft}
            handleLoadPresetToGame={handleLoadPresetToGame}
            presetFiles={presetFiles}
            localPresets={localPresets}
          />
        )}

        {/* 6. CORDE 5: RYTHME LIVE */}
        {activeTab === 'rythmelive' && (
          <RythmeLiveTab
            lang={lang}
            rythmeLiveCordeCible={rythmeLiveCordeCible}
            setRythmeLiveCordeCible={setRythmeLiveCordeCible}
            rythmeLiveTitle={rythmeLiveTitle}
            setRythmeLiveTitle={setRythmeLiveTitle}
            rythmeLiveLoopsRequired={rythmeLiveLoopsRequired}
            setRythmeLiveLoopsRequired={setRythmeLiveLoopsRequired}
            rythmeLiveToleranceMs={rythmeLiveToleranceMs}
            setRythmeLiveToleranceMs={setRythmeLiveToleranceMs}
            rythmeLiveStudentInstrument={rythmeLiveStudentInstrument}
            setRythmeLiveStudentInstrument={setRythmeLiveStudentInstrument}
            rythmeLiveRewardSignatory={rythmeLiveRewardSignatory}
            setRythmeLiveRewardSignatory={setRythmeLiveRewardSignatory}
            rythmeLivePlaybackTracks={rythmeLivePlaybackTracks}
            setRythmeLivePlaybackTracks={setRythmeLivePlaybackTracks}
            rythmeLiveTargetTracks={rythmeLiveTargetTracks}
            setRythmeLiveTargetTracks={setRythmeLiveTargetTracks}
            rythmeLiveBpm={rythmeLiveBpm}
            setRythmeLiveBpm={setRythmeLiveBpm}
            presetFiles={presetFiles}
            localPresets={localPresets}
            handleLoadPresetToGame={handleLoadPresetToGame}
            handleLoadDraft={handleLoadDraft}
            studioPlaying={studioPlaying}
            setStudioPlaying={setStudioPlaying}
            handleStepChangeGeneric={handleStepChangeGeneric}
            getActivePatternMap={getActivePatternMap}
          />
        )}
      </div>

        {/* Sticky action bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--cordel-bg)] border-t-4 border-[var(--cordel-border)] shadow-[0_-8px_16px_rgba(0,0,0,0.2)] flex justify-center z-[100]">
          <div className="flex gap-4 max-w-xl w-full flex-wrap sm:flex-nowrap">
            {activeTab === 'varal' ? (
              <>
                <button
                  onClick={handleSaveVaralToCloud}
                  className="px-4 py-3.5 bg-blue-600 text-white border-2 border-blue-800 text-base font-black tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:bg-blue-500 transition-colors flex-1"
                >
                  <Cloud className="w-5 h-5" />
                  {lang === 'fr' ? 'Sauvegarder dans le Cloud' : 'Salvar no Cloud'}
                </button>
                <button
                  onClick={handleGenerateExercise}
                  className="px-4 py-3.5 cordel-wood cordel-button text-base font-black tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg flex-1 justify-center transition-transform hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  JSON
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCloudSaveModalOpen(true)}
                  className="px-4 py-3.5 bg-blue-600 text-white border-2 border-blue-800 text-base font-black tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:bg-blue-500 transition-colors flex-1"
                >
                  <Cloud className="w-5 h-5" />
                  {lang === 'fr' ? 'Sauvegarder dans le Cloud' : 'Salvar no Cloud'}
                </button>
                <button
                  onClick={handleGenerateExercise}
                  className="px-4 py-3.5 cordel-wood cordel-button text-base font-black tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg flex-1 justify-center transition-transform hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  JSON
                </button>
              </>
            )}
          </div>
        </div>

      {/* Cloud Save Modal */}
      {cloudSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-md p-6 relative flex flex-col gap-4">
            <button onClick={() => setCloudSaveModalOpen(false)} className="absolute top-2 right-2 text-[var(--cordel-text)]/50 hover:text-[var(--cordel-text)]"><Trash2 className="w-5 h-5"/></button>
            <h3 className="font-cactus text-2xl font-black text-[var(--cordel-wood)] text-center uppercase">
              {lang === 'fr' ? 'Enregistrer sur le Cloud' : 'Salvar na Nuvem'}
            </h3>
            
            <p className="text-sm text-center text-[var(--cordel-text)]/80 mb-4 font-bold">
              {activeTab === 'varal' ? (lang === 'fr' ? 'Nommez cette progression (ex: "Débutant 2026")' : 'Nomeie esta progressão (ex: "Iniciante 2026")') : (lang === 'fr' ? 'Nommez cet exercice (ex: "Quiz Difficile")' : 'Nomeie este exercício (ex: "Quiz Difícil")')}
            </p>

            <input
              type="text"
              placeholder={lang === 'fr' ? 'Nom...' : 'Nome...'}
              value={cloudSaveName}
              onChange={(e) => setCloudSaveName(e.target.value)}
              className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-3 rounded font-bold text-lg text-[var(--cordel-text)]"
            />

            {cloudSaveError && <p className="text-red-600 text-sm font-bold text-center">{cloudSaveError}</p>}
            {cloudSaveSuccess && <p className="text-green-600 text-sm font-bold text-center">{cloudSaveSuccess}</p>}

            <button
              onClick={handleSaveToCloudSubmit}
              disabled={isSavingCloud}
              className="w-full bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-black uppercase tracking-widest py-3 mt-2 flex justify-center items-center gap-2 hover:bg-[var(--cordel-wood)] transition-colors disabled:opacity-50"
            >
              {isSavingCloud ? <Square className="w-4 h-4 animate-spin"/> : <Cloud className="w-5 h-5" />}
              {lang === 'fr' ? 'Valider' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-2xl p-6 relative flex flex-col gap-4">
            <h3 className="font-cactus text-2xl font-black text-[var(--cordel-wood)]">
              {lang === 'fr' ? 'Exercice JSON Généré !' : 'Exercício JSON Gerado !'}
            </h3>
            
            <p className="text-xs text-[var(--cordel-text)]/70">
              {lang === 'fr'
                ? 'Le téléchargement a été lancé automatiquement. Si ce n\'est pas le cas, copiez le contenu ci-dessous :'
                : 'O download foi iniciado automaticamente. Caso não tenha começado, copie o conteúdo abaixo:'}
            </p>

            <textarea
              readOnly
              value={copiedJsonText}
              className="bg-black/35 text-green-400 font-mono text-[10px] p-3 border-2 border-[var(--cordel-border)]/50 rounded h-64 resize-none overflow-y-auto"
            />

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-4 py-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-bg)] hover:text-[var(--cordel-text)] transition-colors cordel-button"
              >
                <Clipboard className="w-4 h-4" />
                {lang === 'fr' ? 'Copier' : 'Copiar'}
              </button>
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-bold text-xs uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button"
              >
                {lang === 'fr' ? 'Fermer' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
