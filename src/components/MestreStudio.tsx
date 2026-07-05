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

interface CordeConfig {
  requiredCount: number;
  gameType?: 'quiz' | 'dictee' | 'inspecteur' | 'sablier_mestre' | 'rythme_live' | 'random';
  games: GameSlot[];
  reward: CordeRewardStudio;
  oeuvreToniBraga: string; // Base64 (legacy fallback)
  rewardData: string; // legacy fallback
}

// 2. Quiz Types
interface QuizQuestionStudio {
  id: string;
  type: 'image' | 'audio';
  questionTextFr: string;
  questionTextPt: string;
  mediaUrl: string;
  mediaFile: string; // Base64
  optionsFr: string[];
  optionsPt: string[];
  correctIndex: number;
  explanationFr: string;
  explanationPt: string;
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
          <div className="flex flex-col gap-6">
            {/* Multi-Varal Management Dashboard */}
            <div className="border-4 border-[var(--cordel-border)] bg-[var(--cordel-bg)] p-4 shadow-[4px_4px_0_var(--cordel-border)] flex flex-col gap-3">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1 flex justify-between items-center">
                <span>🪢 {lang === 'fr' ? 'Mes Varals Cloud' : 'Meus Varais Cloud'}</span>
                <button
                  onClick={() => {
                    setEditingVaralId(null);
                    setVaralName('Nouveau Varal');
                    setVaralCordes([
                      { requiredCount: 3, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                      { requiredCount: 2, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                      { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                      { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                      { requiredCount: 1, gameType: 'random', games: [], reward: { text: '', type: 'none', url: '', base64: '' }, oeuvreToniBraga: '', rewardData: '' },
                    ]);
                    setVaralActiveCordesCount(3);
                  }}
                  className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-bold uppercase rounded cursor-pointer hover:bg-green-700 transition"
                >
                  + {lang === 'fr' ? 'Nouveau' : 'Novo'}
                </button>
              </span>
              {cloudProgressionsList.length === 0 ? (
                <p className="text-xs italic text-[var(--cordel-text)]/50 py-2 text-center">
                  {lang === 'fr' ? "Aucun Varal enregistré. Créez-en un à l'aide du formulaire ci-dessous." : 'Nenhum Varal registrado.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {cloudProgressionsList.map((prog) => {
                    const isActive = activeProgressionIds.includes(prog.id);
                    let ropesCount = 0;
                    try {
                      const decompressed = LZString.decompressFromBase64(prog.data);
                      if (decompressed) {
                         const parsed = JSON.parse(decompressed);
                         ropesCount = parsed.cordes?.length || 0;
                      }
                    } catch(e) {}

                    return (
                      <div key={prog.id} className="flex items-center justify-between bg-black/5 p-3 border border-[var(--cordel-border)]/15 rounded-sm">
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-black text-[var(--cordel-text)] flex items-center gap-2">
                            {prog.name}
                            {editingVaralId === prog.id && (
                              <span className="text-[9px] uppercase font-bold bg-[var(--cordel-wood)] text-white px-1.5 py-0.5 rounded">
                                {lang === 'fr' ? 'Édition' : 'Edição'}
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--cordel-text)]/60">
                            🪢 {ropesCount} {ropesCount > 1 ? (lang === 'fr' ? 'cordes' : 'cordas') : (lang === 'fr' ? 'corde' : 'corda')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleVaralActive(prog.id)}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition ${
                              isActive 
                                ? 'bg-green-600 text-white' 
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                            }`}
                          >
                            {isActive ? (lang === 'fr' ? 'Actif' : 'Ativo') : (lang === 'fr' ? 'Inactif' : 'Inativo')}
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingVaralId(prog.id);
                              setVaralName(prog.name);
                              try {
                                const decompressed = LZString.decompressFromBase64(prog.data);
                                if (decompressed) {
                                  const json = JSON.parse(decompressed);
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
                                }
                              } catch (err) {
                                console.error("Failed to load progression for editing", err);
                              }
                            }}
                            className="px-2 py-1 bg-[var(--cordel-wood)] text-white text-[10px] font-black uppercase rounded cursor-pointer hover:opacity-90"
                          >
                            {lang === 'fr' ? 'Éditer' : 'Editar'}
                          </button>

                          <button
                            onClick={() => handleDeleteVaral(prog.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>📂 Charger un brouillon local Varal (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'varal_config')} className="text-[10px] cursor-pointer" />
              </label>

              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">
                  {lang === 'fr' ? 'Nom du Varal' : 'Nome do Varal'}
                </label>
                <input
                  type="text"
                  value={varalName}
                  onChange={(e) => setVaralName(e.target.value)}
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  placeholder="Ex: Varal Débutant"
                />
              </div>
              
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>🔗 Nombre de cordes actives</span>
                <select
                  value={varalActiveCordesCount}
                  onChange={(e) => setVaralActiveCordesCount(Number(e.target.value))}
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                >
                  <option value={1}>1 Corde</option>
                  <option value={2}>2 Cordes</option>
                  <option value={3}>3 Cordes</option>
                  <option value={4}>4 Cordes</option>
                  <option value={5}>5 Cordes</option>
                </select>
              </label>
            </div>

            <p className="text-sm italic text-[var(--cordel-text)]/70 text-center">
              {lang === 'fr' 
                ? 'Configurez le parcours: jeux requis, récompenses par corde, et le diplôme final.'
                : 'Configure o percurso: jogos exigidos, recompensas por corda, e o diploma final.'}
            </p>

            <div className="grid grid-cols-1 gap-8">
              {Array.from({ length: varalActiveCordesCount }).map((_, idx) => (
                <div key={idx} className="p-4 border-4 border-[var(--cordel-border)] bg-[var(--cordel-bg)] shadow-[4px_4px_0_var(--cordel-border)] flex flex-col gap-4">
                  {/* Header Corde */}
                  <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-3">
                    <div className="flex flex-col text-center md:text-left">
                      <span className="font-cactus text-2xl font-black text-[var(--cordel-wood)]">Corde {idx + 1}</span>
                      <span className="text-xs text-[var(--cordel-text)]/60 font-bold uppercase tracking-widest">
                        {idx === 0 ? 'Débutant' : idx === 1 ? 'Initié' : idx === 2 ? "Confirmé" : idx === 3 ? 'Expert' : 'Mestre'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 md:mt-0">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Type de jeu</label>
                        <select
                          value={varalCordes[idx].gameType || 'random'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setVaralCordes(prev => prev.map((c, cIdx) => {
                              if (cIdx !== idx) return c;
                              return { ...c, gameType: val };
                            }));
                          }}
                          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
                        >
                          <option value="random">Tous mélangés (Auto)</option>
                          <option value="quiz">Quiz uniquement</option>
                          <option value="dictee">Dictée uniquement</option>
                          <option value="inspecteur">Inspecteur uniquement</option>
                          <option value="sablier_mestre">Sablier uniquement</option>
                          <option value="rythme_live">Rythme Live uniquement</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Nb. de jeux</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          required
                          value={varalCordes[idx].requiredCount}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                            setVaralCordes(prev => prev.map((c, cIdx) => {
                              if (cIdx !== idx) return c;
                              const newGames = [...c.games];
                              if (val > newGames.length) {
                                for(let i=newGames.length; i<val; i++) newGames.push({ id: `slot_${Date.now()}_${i}`, source: 'empty' });
                              } else {
                                newGames.splice(val);
                              }
                              return { ...c, requiredCount: val, games: newGames };
                            }));
                          }}
                          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-1 rounded font-black text-center w-16"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Games Slots */}
                  <div className="flex flex-col gap-3 pl-2 border-l-4 border-[var(--cordel-wood)]">
                    <span className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Séquence de jeux</span>
                    {Array.from({ length: varalCordes[idx].requiredCount }).map((_, slotIdx) => {
                      const slot = varalCordes[idx].games[slotIdx] || { id: `def_${slotIdx}`, source: 'empty' };
                      return (
                        <div key={slot.id || slotIdx} className="flex flex-col md:flex-row items-center gap-3 p-2 bg-black/5 rounded">
                          <span className="font-bold text-sm text-[var(--cordel-wood)] w-6">{slotIdx + 1}.</span>
                          <select 
                            value={slot.source}
                            onChange={(e) => {
                              const s = e.target.value as 'empty'|'cloud'|'local';
                              setVaralCordes(prev => prev.map((c, cIdx) => {
                                if (cIdx !== idx) return c;
                                const newGames = [...c.games];
                                while (newGames.length <= slotIdx) {
                                  newGames.push({ id: `slot_${Date.now()}_${newGames.length}`, source: 'empty' });
                                }
                                newGames[slotIdx] = { ...newGames[slotIdx], source: s };
                                return { ...c, games: newGames };
                              }));
                            }}
                            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold rounded"
                          >
                            <option value="empty">Aléatoire (Auto)</option>
                            <option value="cloud">Depuis le Cloud</option>
                            <option value="local">Fichier Local (.json)</option>
                          </select>

                          {slot.source === 'cloud' && (
                            <select
                              value={slot.cloudExerciseId || ''}
                              onChange={(e) => {
                                const exId = e.target.value;
                                const ex = cloudExercisesList.find(x => x.id === exId);
                                setVaralCordes(prev => prev.map((c, cIdx) => {
                                  if (cIdx !== idx) return c;
                                  const newGames = [...c.games];
                                  while (newGames.length <= slotIdx) {
                                    newGames.push({ id: `slot_${Date.now()}_${newGames.length}`, source: 'empty' });
                                  }
                                  newGames[slotIdx] = { ...newGames[slotIdx], cloudExerciseId: exId, cloudExerciseName: ex?.name };
                                  return { ...c, games: newGames };
                                }));
                              }}
                              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold rounded flex-1"
                            >
                              <option value="">-- Choisir un exercice --</option>
                              {cloudExercisesList
                                .filter(ex => {
                                  const ropeType = varalCordes[idx].gameType || 'random';
                                  if (ropeType === 'random') return true;
                                  const exMod = ex.module;
                                  const normalizedRopeType = ropeType === 'sablier_mestre' ? 'sablier' : (ropeType === 'rythme_live' ? 'rythmelive' : ropeType);
                                  return exMod === normalizedRopeType;
                                })
                                .map(ex => (
                                  <option key={ex.id} value={ex.id}>[{ex.module.toUpperCase()}] {ex.name}</option>
                                ))
                              }
                            </select>
                          )}

                          {slot.source === 'local' && (
                            <div className="flex items-center gap-2 flex-1">
                              {!(slot as any).localExerciseData ? (
                                <input 
                                  type="file" 
                                  accept=".json"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      try {
                                        const data = JSON.parse(evt.target?.result as string);
                                        setVaralCordes(prev => prev.map((c, cIdx) => {
                                          if (cIdx !== idx) return c;
                                          const newGames = [...c.games];
                                          while (newGames.length <= slotIdx) {
                                            newGames.push({ id: `slot_${Date.now()}_${newGames.length}`, source: 'empty' });
                                          }
                                          newGames[slotIdx] = { ...newGames[slotIdx], localExerciseData: data, localExerciseName: file.name };
                                          return { ...c, games: newGames };
                                        }));
                                      } catch(err) { alert("Invalid JSON"); }
                                    };
                                    reader.readAsText(file);
                                  }}
                                  className="text-[10px] cursor-pointer"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded">✅ {(slot as any).localExerciseName || "Importé"}</span>
                                  <button onClick={() => {
                                    setVaralCordes(prev => prev.map((c, cIdx) => {
                                      if (cIdx !== idx) return c;
                                      const newGames = [...c.games];
                                      if (newGames[slotIdx]) {
                                        newGames[slotIdx] = { ...newGames[slotIdx], localExerciseData: undefined, localExerciseName: undefined };
                                      }
                                      return { ...c, games: newGames };
                                    }));
                                  }} className="text-[10px] text-red-500 hover:underline">Changer</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reward Section */}
                  <div className="mt-2 pt-3 border-t-2 border-dashed border-[var(--cordel-border)]/30 flex flex-col gap-3">
                    <span className="text-xs font-black uppercase text-[var(--cordel-text)]/70">Récompense de Corde</span>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] font-bold">Message de félicitations</label>
                        <textarea
                          placeholder="Ex: Bravo, tu as validé cette étape !"
                          value={varalCordes[idx].reward?.text || ''}
                          onChange={(e) => setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, text: e.target.value } } : c))}
                          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded text-xs font-bold w-full resize-none h-16"
                        />
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[10px] font-bold">Contenu lié (Optionnel)</label>
                        <select
                          value={varalCordes[idx].reward?.type || 'none'}
                          onChange={(e) => setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, type: e.target.value as any } } : c))}
                          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 text-xs font-bold rounded mb-1"
                        >
                          <option value="none">Aucun lien</option>
                          <option value="video">Vidéo YouTube (URL)</option>
                          <option value="image">Image (Upload ou URL)</option>
                          <option value="pdf">Fichier PDF (URL)</option>
                          <option value="json">Configuration spéciale (.json)</option>
                        </select>

                        {(varalCordes[idx].reward?.type === 'video' || varalCordes[idx].reward?.type === 'pdf') && (
                          <input
                            type="text"
                            placeholder="https://..."
                            value={varalCordes[idx].reward?.url || ''}
                            onChange={(e) => setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, url: e.target.value } } : c))}
                            className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded text-xs w-full"
                          />
                        )}

                        {varalCordes[idx].reward?.type === 'image' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, base64: evt.target?.result as string } } : c));
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="text-[10px] max-w-[150px]"
                            />
                            {varalCordes[idx].reward?.base64 && <ImageIcon className="w-4 h-4 text-green-600 shrink-0" />}
                          </div>
                        )}
                        {varalCordes[idx].reward?.type === 'json' && (
                          <input
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, reward: { ...c.reward, base64: evt.target?.result as string } } : c));
                                };
                                reader.readAsDataURL(file);
                            }}
                            className="text-[10px]"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* DIPLOMA SECTION */}
            <div className="mt-8 p-6 border-4 border-[var(--cordel-wood)] bg-[var(--cordel-bg)] shadow-[6px_6px_0_var(--cordel-wood)] flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b-2 border-dashed border-[var(--cordel-wood)]/30 pb-2">
                <Award className="w-8 h-8 text-[var(--cordel-wood)]" />
                <h3 className="font-cactus text-3xl font-black text-[var(--cordel-wood)] uppercase tracking-widest">Diplôme Final</h3>
              </div>
              <p className="text-sm font-bold text-[var(--cordel-text)]/70">
                {lang === 'fr' ? 'Ce diplôme sera remis à l\'élève une fois toutes les cordes validées.' : 'Este diploma será entregue ao aluno após validar todas as cordas.'}
              </p>

              <div className="flex flex-col md:flex-row gap-6 mt-2">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-black uppercase text-[var(--cordel-text)]">Texte du diplôme</label>
                  <textarea
                    placeholder={lang === 'fr' ? "Félicitations pour avoir complété le parcours O Girador !" : "Parabéns por completar o percurso O Girador !"}
                    value={diplomaText}
                    onChange={(e) => setDiplomaText(e.target.value)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-3 rounded font-bold w-full h-32 resize-none"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-xs font-black uppercase text-[var(--cordel-text)]">Signature Visuelle (Optionnel)</label>
                  <p className="text-[10px] text-[var(--cordel-text)]/60">Upload de votre signature en image transparente (.png)</p>
                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => setDiplomaSignature(evt.target?.result as string);
                        reader.readAsDataURL(file);
                      }}
                      className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-[var(--cordel-wood)] file:text-[var(--cordel-bg)] hover:file:bg-[var(--cordel-wood)]/80 cursor-pointer"
                    />
                    {diplomaSignature && (
                      <div className="border border-dashed border-[var(--cordel-border)]/50 p-2 flex items-center justify-center bg-black/5 rounded">
                        <img src={diplomaSignature} alt="Signature preview" className="max-h-20 object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. CORDE 1: QUIZ */}
        {activeTab === 'quiz' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'quiz')} className="text-[10px] cursor-pointer" />
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Paramètres du Livret
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Ex: Origines du Maracatu"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Texte Récompense Déverrouillage</label>
                  <input
                    type="text"
                    value={quizRewardText}
                    onChange={(e) => setQuizRewardText(e.target.value)}
                    placeholder="Ex: Vous avez débloqué le livret historique !"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
              </div>
            </div>

            {/* Questions Editor */}
            <div className="flex flex-col gap-8">
              {quizQuestions.map((q, idx) => (
                <div key={q.id} className="p-5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between border-b border-dashed border-[var(--cordel-border)]/30 pb-2">
                    <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                      Question #{idx + 1}
                    </span>
                    <div className="flex items-center gap-4">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestionField(idx, 'type', e.target.value)}
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 text-[10px] font-bold rounded"
                      >
                        <option value="image">Question Visuelle (Xilo)</option>
                        <option value="audio">Question Auditive (Audio)</option>
                      </select>
                      {quizQuestions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(idx)}
                          className="p-1 text-[var(--cordel-wood)] hover:bg-[var(--cordel-wood)] hover:text-white rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Intitulé Question (FR)</label>
                      <input
                        type="text"
                        value={q.questionTextFr}
                        onChange={(e) => updateQuestionField(idx, 'questionTextFr', e.target.value)}
                        placeholder="Ex: Quel est cet instrument ?"
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Intitulé Question (PT)</label>
                      <input
                        type="text"
                        value={q.questionTextPt}
                        onChange={(e) => updateQuestionField(idx, 'questionTextPt', e.target.value)}
                        placeholder="Ex: Qual é esse instrumento ?"
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                      />
                    </div>
                  </div>

                  {/* Media uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-dashed border-[var(--cordel-border)]/20 pt-4">
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Upload Média (Image/Audio)</label>
                      <input
                        type="file"
                        accept={q.type === 'image' ? 'image/*' : 'audio/*'}
                        onChange={(e) => handleQuizMediaUpload(idx, e)}
                        className="text-[10px] font-bold text-[var(--cordel-text)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={q.mediaUrl}
                        onChange={(e) => updateQuestionField(idx, 'mediaUrl', e.target.value)}
                        placeholder="Ou coller un lien URL direct..."
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/30 p-1.5 rounded text-[10px] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center border-2 border-[var(--cordel-border)] p-2 bg-white text-black min-h-[90px] rounded">
                      <span className="text-[8px] font-bold uppercase text-gray-400 mb-1">Aperçu Xilo / Audio</span>
                      {q.type === 'image' && (q.mediaFile || q.mediaUrl) ? (
                        <img
                          src={q.mediaFile ? q.mediaFile : q.mediaUrl}
                          alt="xilo preview"
                          style={{ filter: 'contrast(300%) grayscale(100%)' }}
                          className="max-h-[60px] object-contain border border-black p-0.5"
                        />
                      ) : q.type === 'audio' && (q.mediaFile || q.mediaUrl) ? (
                        <span className="text-[10px] text-green-700 font-bold">✓ Fichier Audio Raccordé</span>
                      ) : (
                        <span className="text-[9px] text-gray-300">Aucun média</span>
                      )}
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="border-t border-dashed border-[var(--cordel-border)]/20 pt-4 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Options de réponse (Cochez la bonne)</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[0, 1, 2, 3].map((optIdx) => (
                        <div key={optIdx} className="flex gap-2 items-start border border-[var(--cordel-border)]/20 p-2 bg-[var(--cordel-bg)]/20 rounded">
                          <input
                            type="radio"
                            name={`quiz_correct_${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => updateQuestionField(idx, 'correctIndex', optIdx)}
                            className="mt-2 accent-[var(--cordel-wood)] cursor-pointer"
                          />
                          <div className="flex-1 flex flex-col gap-1">
                            <input
                              type="text"
                              value={q.optionsFr[optIdx]}
                              onChange={(e) => updateQuestionOption(idx, optIdx, 'fr', e.target.value)}
                              placeholder={`Option ${optIdx + 1} (FR)`}
                              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 text-[10px] rounded focus:outline-none"
                            />
                            <input
                              type="text"
                              value={q.optionsPt[optIdx]}
                              onChange={(e) => updateQuestionOption(idx, optIdx, 'pt', e.target.value)}
                              placeholder={`Opção ${optIdx + 1} (PT)`}
                              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 text-[10px] rounded focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dashed border-[var(--cordel-border)]/20 pt-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase text-[var(--cordel-text)]/60">Explication de la réponse (FR)</label>
                      <input
                        type="text"
                        value={q.explanationFr}
                        onChange={(e) => updateQuestionField(idx, 'explanationFr', e.target.value)}
                        placeholder="Ex: L'Alfaia est un tambour en bois joué avec des mailloches..."
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-[10px] w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase text-[var(--cordel-text)]/60">Explicação da resposta (PT)</label>
                      <input
                        type="text"
                        value={q.explanationPt}
                        onChange={(e) => updateQuestionField(idx, 'explanationPt', e.target.value)}
                        placeholder="Ex: A Alfaia é um tambor de madeira tocado com maçanetas..."
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-[10px] w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {quizQuestions.length < 10 && (
              <button
                onClick={addQuestion}
                className="flex items-center justify-center gap-1.5 py-2 px-4 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-bold text-xs uppercase hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors self-center cordel-button cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {lang === 'fr' ? 'Ajouter une question' : 'Adicionar pergunta'}
              </button>
            )}
          </div>
        )}

        {/* 3. CORDE 2: DICTÉE DE BLOCS */}
        {activeTab === 'dictee' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'dictee')} className="text-[10px] cursor-pointer" />
              </label>
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>🎵 Charger une piste depuis un Preset</span>
                <select 
                  onChange={(e) => {
                    handleLoadPresetToGame(e.target.value, 'dictee');
                    e.target.value = '';
                  }} 
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
                >
                  <option value="">Sélectionner un preset...</option>
                  {presetFiles.map(p => <option key={p} value={p}>Catalogue: {p.replace('.json', '')}</option>)}
                  {localPresets.map(p => <option key={p} value={p}>Local: {p}</option>)}
                </select>
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Paramètres du Défi
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
                  <select
                    value={dicteeCordeCible}
                    onChange={(e) => setDicteeCordeCible(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={1}>Corde 1</option>
                    <option value={2}>Corde 2</option>
                    <option value={3}>Corde 3</option>
                    <option value={4}>Corde 4</option>
                    <option value={5}>Corde 5</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
                  <input
                    type="text"
                    value={dicteeTitle}
                    onChange={(e) => setDicteeTitle(e.target.value)}
                    placeholder="Ex: Le Rythme du Maracatu"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Lien Vidéo de Récompense (YouTube)</label>
                  <input
                    type="text"
                    value={dicteeRewardVideoUrl}
                    onChange={(e) => setDicteeRewardVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Instrument Cible</label>
                  <select
                    value={dicteeTargetInstrumentId}
                    onChange={(e) => setDicteeTargetInstrumentId(e.target.value)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full border-[var(--cordel-wood)] border-2"
                  >
                    <option value="">Sélectionner...</option>
                    {dicteeTracks.filter(t => !t.isMute && t.instrumentIdx !== -1).map(t => {
                       const instName = instrumentsConfig[t.instrumentIdx]?.name || `Inst ${t.instrumentIdx}`;
                       return <option key={t.id} value={t.id}>{instName}</option>
                    })}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Total Mesures (Preset)</label>
                  <select
                    value={dicteeTotalMeasures}
                    onChange={(e) => setDicteeTotalMeasures(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    {[1,2,3,4,8,16].map(n => <option key={n} value={n}>{n} Mesure{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={dicteeBpm}
                    onChange={(e) => setDicteeBpm(Number(e.target.value) || 83)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Découpage</label>
                  <select
                    value={dicteeBlocksCount}
                    onChange={(e) => setDicteeBlocksCount(Number(e.target.value) as 4 | 8 | 16)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={4}>4 Blocs (Standard)</option>
                    <option value={8}>8 Blocs (Expert)</option>
                    <option value={16}>16 Pas Vides (Saisie Clavier)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pagination for Dictée */}
            {dicteeTotalMeasures > 1 && (
              <div className="flex justify-center items-center gap-4 py-2 bg-[var(--cordel-bg)] border-y border-dashed border-[var(--cordel-border)]/30 mt-4 mb-2">
                <button
                  onClick={() => setDicteeMeasureIndex(prev => Math.max(0, prev - 1))}
                  disabled={dicteeMeasureIndex === 0}
                  className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
                >
                  &lt;
                </button>
                <span className="font-cactus font-bold text-lg text-[var(--cordel-wood)]">Mesure Cible : {dicteeMeasureIndex + 1} / {dicteeTotalMeasures}</span>
                <button
                  onClick={() => setDicteeMeasureIndex(prev => Math.min(dicteeTotalMeasures - 1, prev + 1))}
                  disabled={dicteeMeasureIndex === dicteeTotalMeasures - 1}
                  className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
                >
                  &gt;
                </button>
              </div>
            )}

            {/* Roda Sequencer for Audio Target */}
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 items-center mt-4">
              <span className="font-cactus text-base font-bold text-[var(--cordel-wood)] text-center">
                Séquence Audio<br/><span className="text-sm font-normal">La mesure sélectionnée sera automatiquement découpée en blocs.</span>
              </span>
              <div className="w-full max-w-[500px] py-4 bg-[var(--cordel-bg)]/25 rounded flex items-center justify-center">
                <CircleSequencer
                  lang={lang}
                  tracks={dicteeTracks}
                  isPlaying={studioPlaying}

                  currentMeasure={dicteeMeasureIndex}
                  maxTicks={16}
                  timeSig="4/4"
                  totalMeasures={dicteeTotalMeasures}
                  onTogglePlay={() => setStudioPlaying(!studioPlaying)}
                  onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                    handleStepChangeGeneric(dicteeTracks, setDicteeTracks, trId, ptId, stIdx, nSt, lyr, nt);
                  }}
                  langPromptVoiceText=""
                  activePatternIdByTrack={getActivePatternMap(dicteeTracks)}
                  bpm={dicteeBpm}
                  measureBpms={[dicteeBpm]}
                  measureVols={[80]}
                  isMobile={window.innerWidth <= 768}
                />
              </div>
            </div>


          </div>
        )}

        {/* 4. CORDE 3: L'INSPECTEUR */}
        {activeTab === 'inspecteur' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'inspecteur')} className="text-[10px] cursor-pointer" />
              </label>
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>🎵 Charger la partition parfaite depuis un Preset</span>
                <select 
                  onChange={(e) => {
                    handleLoadPresetToGame(e.target.value, 'inspecteur');
                    e.target.value = '';
                  }} 
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
                >
                  <option value="">Sélectionner un preset...</option>
                  {presetFiles.map(p => <option key={p} value={p}>Catalogue: {p.replace('.json', '')}</option>)}
                  {localPresets.map(p => <option key={p} value={p}>Local: {p}</option>)}
                </select>
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Paramètres de l'Enquête
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
                  <select
                    value={inspecteurCordeCible}
                    onChange={(e) => setInspecteurCordeCible(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={1}>Corde 1</option>
                    <option value={2}>Corde 2</option>
                    <option value={3}>Corde 3</option>
                    <option value={4}>Corde 4</option>
                    <option value={5}>Corde 5</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
                  <input
                    type="text"
                    value={inspecteurTitle}
                    onChange={(e) => setInspecteurTitle(e.target.value)}
                    placeholder="Ex: Le Voleur de Caixa"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Description / Indice</label>
                  <input
                    type="text"
                    value={inspecteurDescription}
                    onChange={(e) => setInspecteurDescription(e.target.value)}
                    placeholder="Ex: Un intrus s'est glissé dans la caisse claire..."
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Instrument Coupable</label>
                  <select
                    value={inspecteurGuiltyInstrument}
                    onChange={(e) => setInspecteurGuiltyInstrument(e.target.value as any)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full uppercase"
                  >
                    <option value="caixa">Caixa (Caisse claire)</option>
                    <option value="alfaia">Alfaia (Tambour)</option>
                    <option value="gongue">Gonguê (Cloche)</option>
                    <option value="agbe">Agbê (Chéquéré)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Total Mesures</label>
                  <select
                    value={inspecteurTotalMeasures}
                    onChange={(e) => setInspecteurTotalMeasures(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Début Boucle</label>
                  <select
                    value={inspecteurLoopStart}
                    onChange={(e) => setInspecteurLoopStart(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    {Array.from({ length: inspecteurTotalMeasures }).map((_, i) => <option key={i} value={i + 1}>Mesure {i + 1}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Fin Boucle</label>
                  <select
                    value={inspecteurLoopEnd}
                    onChange={(e) => setInspecteurLoopEnd(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    {Array.from({ length: inspecteurTotalMeasures }).map((_, i) => <option key={i} value={i + 1}>Mesure {i + 1}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={inspecteurBpm}
                    onChange={(e) => setInspecteurBpm(Number(e.target.value) || 83)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
              </div>
            </div>

            {/* Pagination */}
            {inspecteurTotalMeasures > 1 && (
              <div className="flex justify-center items-center gap-4 py-2 bg-[var(--cordel-bg)] border-y border-dashed border-[var(--cordel-border)]/30 mt-4 mb-2">
                <button
                  onClick={() => setInspecteurCurrentMeasure(prev => Math.max(0, prev - 1))}
                  disabled={inspecteurCurrentMeasure === 0}
                  className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
                >
                  &lt;
                </button>
                <span className="font-cactus font-bold text-lg text-[var(--cordel-wood)]">Mesure {inspecteurCurrentMeasure + 1} / {inspecteurTotalMeasures}</span>
                <button
                  onClick={() => setInspecteurCurrentMeasure(prev => Math.min(inspecteurTotalMeasures - 1, prev + 1))}
                  disabled={inspecteurCurrentMeasure === inspecteurTotalMeasures - 1}
                  className="px-3 py-1 bg-[var(--cordel-border)] text-white rounded disabled:opacity-30 hover:bg-[var(--cordel-wood)] transition-colors"
                >
                  &gt;
                </button>
              </div>
            )}

            {/* Double Circle Sequencer layouts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sequencer 1: Partition Parfaite */}
              <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center">
                <span className="font-cactus text-sm font-bold text-green-700 uppercase">
                  😇 1. Partition Parfaite (Toute la Roda)
                </span>
                <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
                  <CircleSequencer
                    lang={lang}
                    tracks={inspecteurPerfectTracks}
                    isPlaying={studioPlaying}

                    currentMeasure={inspecteurCurrentMeasure}
                    maxTicks={16}
                    timeSig="4/4"
                    totalMeasures={inspecteurTotalMeasures}
                    onTogglePlay={() => setStudioPlaying(!studioPlaying)}
                    onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                      handleStepChangeGeneric(inspecteurPerfectTracks, setInspecteurPerfectTracks, trId, ptId, stIdx, nSt, lyr, nt);
                    }}
                    langPromptVoiceText=""
                    activePatternIdByTrack={getActivePatternMap(inspecteurPerfectTracks)}
                    bpm={inspecteurBpm}
                    measureBpms={[inspecteurBpm]}
                    measureVols={[80]}
                    isMobile={true}
                  />
                </div>
              </div>

              {/* Sequencer 2: Piste Sabotée (Only Guilty Instrument) */}
              <div className="border-2 border-red-500/80 p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center relative shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                <span className="font-cactus text-sm font-bold text-red-600 uppercase">
                  😈 2. Piste Sabotée (Uniquement le coupable)
                </span>
                <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
                  <CircleSequencer
                    lang={lang}
                    tracks={inspecteurSabotagedTracks}
                    isPlaying={studioPlaying}

                    currentMeasure={inspecteurCurrentMeasure}
                    maxTicks={16}
                    timeSig="4/4"
                    totalMeasures={inspecteurTotalMeasures}
                    onTogglePlay={() => setStudioPlaying(!studioPlaying)}
                    onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                      handleStepChangeGeneric(inspecteurSabotagedTracks, setInspecteurSabotagedTracks, trId, ptId, stIdx, nSt, lyr, nt);
                    }}
                    langPromptVoiceText=""
                    activePatternIdByTrack={getActivePatternMap(inspecteurSabotagedTracks)}
                    bpm={inspecteurBpm}
                    measureBpms={[inspecteurBpm]}
                    measureVols={[80]}
                    isMobile={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. CORDE 4: SABLIER DU MESTRE */}
        {activeTab === 'sablier' && (
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'sablier_mestre')} className="text-[10px] cursor-pointer" />
              </label>
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>🎵 Charger la Roda depuis un Preset</span>
                <select 
                  onChange={(e) => {
                    handleLoadPresetToGame(e.target.value, 'sablier_mestre');
                    e.target.value = '';
                  }} 
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
                >
                  <option value="">Sélectionner un preset...</option>
                  {presetFiles.map(p => <option key={p} value={p}>Catalogue: {p.replace('.json', '')}</option>)}
                  {localPresets.map(p => <option key={p} value={p}>Local: {p}</option>)}
                </select>
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Configuration du Sablier
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
                  <select
                    value={sablierCordeCible}
                    onChange={(e) => setSablierCordeCible(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={1}>Corde 1</option>
                    <option value={2}>Corde 2</option>
                    <option value={3}>Corde 3</option>
                    <option value={4}>Corde 4</option>
                    <option value={5}>Corde 5</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
                  <input
                    type="text"
                    value={sablierTitle}
                    onChange={(e) => setSablierTitle(e.target.value)}
                    placeholder="Ex: Le Sablier du Mestre"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Durée du Sablier (Mesures)</label>
                  <select
                    value={sablierMeasures}
                    onChange={(e) => setSablierMeasures(Number(e.target.value) as 1 | 2)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={1}>1 Mesure</option>
                    <option value={2}>2 Mesures (Standard)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tempo BPM</label>
                  <input
                    type="number"
                    value={sablierBpm}
                    min={50}
                    max={200}
                    onChange={(e) => setSablierBpm(Math.max(50, Math.min(200, Number(e.target.value) || 83)))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
              </div>
            </div>

            {/* Mestre Sign/Image selection */}
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2 flex flex-col gap-3">
                <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                  Signe Gestuel du Mestre (Image)
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer">
                    <input
                      type="radio"
                      checked={sablierHandImageType === 'url'}
                      onChange={() => setSablierHandImageType('url')}
                      className="accent-[var(--cordel-wood)]"
                    />
                    URL de l'image
                  </label>
                  <label className="flex items-center gap-1.5 font-bold text-xs uppercase cursor-pointer">
                    <input
                      type="radio"
                      checked={sablierHandImageType === 'upload'}
                      onChange={() => setSablierHandImageType('upload')}
                      className="accent-[var(--cordel-wood)]"
                    />
                    Upload Fichier
                  </label>
                </div>
                {sablierHandImageType === 'url' ? (
                  <input
                    type="text"
                    value={sablierHandImageUrl}
                    onChange={(e) => setSablierHandImageUrl(e.target.value)}
                    placeholder="https://exemple.com/signe.jpg"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded text-xs focus:outline-none w-full"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSablierImageUpload}
                    className="text-xs font-bold text-[var(--cordel-text)] cursor-pointer"
                  />
                )}
              </div>
              <div className="flex flex-col items-center justify-center border-2 border-[var(--cordel-border)] p-2 bg-white text-black min-h-[100px] rounded">
                <span className="text-[8px] font-bold uppercase text-gray-400 mb-1">Aperçu Xilo</span>
                {(sablierHandImageType === 'url' ? sablierHandImageUrl : sablierHandImageFile) ? (
                  <img
                    src={sablierHandImageType === 'url' ? sablierHandImageUrl : sablierHandImageFile}
                    alt="mestre sign preview"
                    style={{ filter: 'contrast(300%) grayscale(100%)' }}
                    className="max-h-[70px] object-contain border border-black p-0.5"
                  />
                ) : (
                  <span className="text-[9px] text-gray-300">Aucun signe</span>
                )}
              </div>
            </div>

            {/* Séquences de Jeu */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 relative">
                <span className="font-cactus text-sm font-bold text-gray-700 uppercase">
                  👈 Séquence Gauche (Fond)
                </span>
                <p className="text-[10px] text-[var(--cordel-text)]/70">Chargez le JSON contenant la base musicale (ex: Roda basique).</p>
                <div className="flex flex-col gap-2 mt-2">
                   <label className="text-xs font-bold bg-[var(--cordel-wood)] text-white px-3 py-2 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
                     Importer JSON Gauche
                     <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'fond')} />
                   </label>
                   {sablierSeqFondName && <span className="text-[10px] font-bold text-green-700 text-center">✓ {sablierSeqFondName} chargé</span>}
                </div>
              </div>

              <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 relative">
                <span className="font-cactus text-sm font-bold text-green-700 uppercase">
                  👉 Séquence Droite (Cible)
                </span>
                <p className="text-[10px] text-[var(--cordel-text)]/70">Chargez le JSON contenant la bonne réponse (ex: Virada).</p>
                <div className="flex flex-col gap-2 mt-2">
                   <label className="text-xs font-bold bg-green-700 text-white px-3 py-2 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
                     Importer JSON Droite
                     <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'cible')} />
                   </label>
                   {sablierSeqCibleName && <span className="text-[10px] font-bold text-green-700 text-center">✓ {sablierSeqCibleName} chargé</span>}
                </div>
              </div>
            </div>

            {/* Séquences Pièges */}
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 mt-2">
              <span className="font-cactus text-base font-bold text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Séquences Pièges (Erreurs)
              </span>
              <p className="text-[10px] text-[var(--cordel-text)]/70">Chargez les 3 JSON contenant les mauvaises réponses qui s'afficheront à l'élève pour le piéger.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="flex flex-col gap-2 p-3 border border-red-900/20 bg-red-900/5 rounded">
                   <span className="text-xs font-bold text-red-800 uppercase text-center">Piège 1</span>
                   <label className="text-[10px] font-bold bg-red-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
                     Importer JSON
                     <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'piege1')} />
                   </label>
                   {sablierSeqPiege1Name && <span className="text-[10px] font-bold text-red-800 text-center">✓ {sablierSeqPiege1Name}</span>}
                </div>
                
                <div className="flex flex-col gap-2 p-3 border border-red-900/20 bg-red-900/5 rounded">
                   <span className="text-xs font-bold text-red-800 uppercase text-center">Piège 2</span>
                   <label className="text-[10px] font-bold bg-red-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
                     Importer JSON
                     <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'piege2')} />
                   </label>
                   {sablierSeqPiege2Name && <span className="text-[10px] font-bold text-red-800 text-center">✓ {sablierSeqPiege2Name}</span>}
                </div>

                <div className="flex flex-col gap-2 p-3 border border-red-900/20 bg-red-900/5 rounded">
                   <span className="text-xs font-bold text-red-800 uppercase text-center">Piège 3</span>
                   <label className="text-[10px] font-bold bg-red-800 text-white px-2 py-1.5 text-center rounded cursor-pointer hover:bg-opacity-80 transition-colors">
                     Importer JSON
                     <input type="file" accept=".json" className="hidden" onChange={(e) => handleLoadSablierSequence(e, 'piege3')} />
                   </label>
                   {sablierSeqPiege3Name && <span className="text-[10px] font-bold text-red-800 text-center">✓ {sablierSeqPiege3Name}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. CORDE 5: RYTHME LIVE */}
        {activeTab === 'rythmelive' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'rythme_live')} className="text-[10px] cursor-pointer" />
              </label>
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1 flex-1">
                <span>🎵 Charger la base musicale depuis un Preset</span>
                <select 
                  onChange={(e) => {
                    handleLoadPresetToGame(e.target.value, 'rythme_live');
                    e.target.value = '';
                  }} 
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1 rounded focus:outline-none text-xs font-bold"
                >
                  <option value="">Sélectionner un preset...</option>
                  {presetFiles.map(p => <option key={p} value={p}>Catalogue: {p.replace('.json', '')}</option>)}
                  {localPresets.map(p => <option key={p} value={p}>Local: {p}</option>)}
                </select>
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Paramètres de l'Examen Rythmique
              </span>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="flex flex-col gap-1 md:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
                  <select
                    value={rythmeLiveCordeCible}
                    onChange={(e) => setRythmeLiveCordeCible(Number(e.target.value))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={1}>Corde 1</option>
                    <option value={2}>Corde 2</option>
                    <option value={3}>Corde 3</option>
                    <option value={4}>Corde 4</option>
                    <option value={5}>Corde 5</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
                  <input
                    type="text"
                    value={rythmeLiveTitle}
                    onChange={(e) => setRythmeLiveTitle(e.target.value)}
                    placeholder="Ex: L'Examen Final du Mestre"
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Boucles Requises</label>
                  <input
                    type="number"
                    min={1}
                    value={rythmeLiveLoopsRequired}
                    onChange={(e) => setRythmeLiveLoopsRequired(Math.max(1, Number(e.target.value) || 2))}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Tolérance (Précision)</label>
                  <select
                    value={rythmeLiveToleranceMs}
                    onChange={(e) => setRythmeLiveToleranceMs(Number(e.target.value) as 30 | 80)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={80}>Moyen (+/- 80ms)</option>
                    <option value={30}>Parfait (+/- 30ms)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Instrument Joué</label>
                  <select
                    value={rythmeLiveStudentInstrument}
                    onChange={(e) => setRythmeLiveStudentInstrument(e.target.value as any)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full uppercase"
                  >
                    <option value="caixa">Caixa</option>
                    <option value="alfaia">Alfaia</option>
                    <option value="gongue">Gonguê</option>
                    <option value="agbe">Agbê</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-1 border-t border-dashed border-[var(--cordel-border)]/20 pt-3">
                <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Signataire du Diplôme (Récompense)</label>
                <input
                  type="text"
                  value={rythmeLiveRewardSignatory}
                  onChange={(e) => setRythmeLiveRewardSignatory(e.target.value)}
                  placeholder="Ex: Mestre Vicente de Paula"
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                />
              </div>
            </div>

            {/* Double Circle Sequencer layouts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sequencer 1: Playback Accompagnement */}
              <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center">
                <span className="font-cactus text-sm font-bold text-blue-700 uppercase">
                  🎵 1. Piste d'Accompagnement (Playback)
                </span>
                <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
                  <CircleSequencer
                    lang={lang}
                    tracks={rythmeLivePlaybackTracks}
                    isPlaying={studioPlaying}

                    currentMeasure={0}
                    maxTicks={16}
                    timeSig="4/4"
                    totalMeasures={1}
                    onTogglePlay={() => setStudioPlaying(!studioPlaying)}
                    onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                      handleStepChangeGeneric(rythmeLivePlaybackTracks, setRythmeLivePlaybackTracks, trId, ptId, stIdx, nSt, lyr, nt);
                    }}
                    langPromptVoiceText=""
                    activePatternIdByTrack={getActivePatternMap(rythmeLivePlaybackTracks)}
                    bpm={rythmeLiveBpm}
                    measureBpms={[rythmeLiveBpm]}
                    measureVols={[80]}
                    isMobile={true}
                  />
                </div>
              </div>

              {/* Sequencer 2: Target Partition required from student */}
              <div className="border-2 border-green-600/80 p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-2 items-center relative shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                <span className="font-cactus text-sm font-bold text-green-700 uppercase">
                  🎯 2. Partition Cible de l'Élève
                </span>
                <div className="w-full max-w-[460px] py-2 flex items-center justify-center">
                  <CircleSequencer
                    lang={lang}
                    tracks={rythmeLiveTargetTracks}
                    isPlaying={studioPlaying}

                    currentMeasure={0}
                    maxTicks={16}
                    timeSig="4/4"
                    totalMeasures={1}
                    onTogglePlay={() => setStudioPlaying(!studioPlaying)}
                    onStepChange={(trId, ptId, stIdx, nSt, lyr, nt) => {
                      handleStepChangeGeneric(rythmeLiveTargetTracks, setRythmeLiveTargetTracks, trId, ptId, stIdx, nSt, lyr, nt);
                    }}
                    langPromptVoiceText=""
                    activePatternIdByTrack={getActivePatternMap(rythmeLiveTargetTracks)}
                    bpm={rythmeLiveBpm}
                    measureBpms={[rythmeLiveBpm]}
                    measureVols={[80]}
                    isMobile={true}
                  />
                </div>
              </div>
            </div>
          </div>
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
