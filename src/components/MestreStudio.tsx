import React, { useState, useEffect, useMemo } from 'react';
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
  Settings
} from 'lucide-react';
import { CircleSequencer } from './CircleSequencer';
import { TrackGroup, Language } from '../types';
import { useGameData } from '../contexts/GameDataContext';

interface MestreStudioProps {
  lang: Language;
  onExit: () => void;
}

// 1. Config Varal Types
interface CordeConfig {
  requiredCount: number;
  oeuvreToniBraga: string; // Base64
  rewardData: string;
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

export const MestreStudio: React.FC<MestreStudioProps> = ({ lang, onExit }) => {
  // 7 Specialized Tabs
  type TabType = 'varal' | 'quiz' | 'dictee' | 'inspecteur' | 'sablier' | 'rythmelive' | 'valise';
  const [activeTab, setActiveTab] = useState<TabType>('varal');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copiedJsonText, setCopiedJsonText] = useState('');

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
    { requiredCount: 3, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 2, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 1, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 1, oeuvreToniBraga: '', rewardData: '' },
    { requiredCount: 1, oeuvreToniBraga: '', rewardData: '' },
  ]);

  // 2. Quiz State
  const [quizCordeCible, setQuizCordeCible] = useState<number>(1);
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
  const [dicteeCordeCible, setDicteeCordeCible] = useState<number>(2);
  const [dicteeTitle, setDicteeTitle] = useState('');
  const [dicteeRewardVideoUrl, setDicteeRewardVideoUrl] = useState('');
  const [dicteeBpm, setDicteeBpm] = useState(83);
  const [dicteeBlocksCount, setDicteeBlocksCount] = useState<4 | 8>(4);
  const [dicteeBlockTags, setDicteeBlockTags] = useState<string[]>(Array(8).fill(''));
  const [dicteeTracks, setDicteeTracks] = useState<TrackGroup[]>(() => createInitialTracks('dictee'));

  // 4. L'Inspecteur State
  const [inspecteurCordeCible, setInspecteurCordeCible] = useState<number>(3);
  const [inspecteurTitle, setInspecteurTitle] = useState('');
  const [inspecteurDescription, setInspecteurDescription] = useState('');
  const [inspecteurBpm, setInspecteurBpm] = useState(83);
  const [inspecteurGuiltyInstrument, setInspecteurGuiltyInstrument] = useState<'alfaia' | 'caixa' | 'gongue' | 'agbe'>('caixa');
  const [inspecteurPerfectTracks, setInspecteurPerfectTracks] = useState<TrackGroup[]>(() => createInitialTracks('ins_perf'));
  const [inspecteurSabotagedTracks, setInspecteurSabotagedTracks] = useState<TrackGroup[]>(() => createInitialSingleTrack(3, 'SABOTAGED_CAIXA'));

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
  const [sablierCordeCible, setSablierCordeCible] = useState<number>(4);
  const [sablierTitle, setSablierTitle] = useState('');
  const [sablierRewardVideoUrl, setSablierRewardVideoUrl] = useState('');
  const [sablierBpm, setSablierBpm] = useState(83);
  const [sablierMeasures, setSablierMeasures] = useState<1 | 2>(2);
  const [sablierHandImageType, setSablierHandImageType] = useState<'url' | 'upload'>('upload');
  const [sablierHandImageUrl, setSablierHandImageUrl] = useState('');
  const [sablierHandImageFile, setSablierHandImageFile] = useState('');
  const [sablierOptionsFr, setSablierOptionsFr] = useState<string[]>(['', '', '']);
  const [sablierOptionsPt, setSablierOptionsPt] = useState<string[]>(['', '', '']);
  const [sablierCorrectIndex, setSablierCorrectIndex] = useState(0);
  const [sablierSuccessAudioState, setSablierSuccessAudioState] = useState<'variation' | 'parada'>('variation');

  // 6. Rythme Live State
  const [rythmeLiveCordeCible, setRythmeLiveCordeCible] = useState<number>(5);
  const [rythmeLiveTitle, setRythmeLiveTitle] = useState('');
  const [rythmeLiveRewardSignatory, setRythmeLiveRewardSignatory] = useState('');
  const [rythmeLiveBpm, setRythmeLiveBpm] = useState(83);
  const [rythmeLiveLoopsRequired, setRythmeLiveLoopsRequired] = useState(2);
  const [rythmeLiveToleranceMs, setRythmeLiveToleranceMs] = useState<30 | 80>(80);
  const [rythmeLiveStudentInstrument, setRythmeLiveStudentInstrument] = useState<'alfaia' | 'caixa' | 'gongue' | 'agbe'>('caixa');
  const [rythmeLivePlaybackTracks, setRythmeLivePlaybackTracks] = useState<TrackGroup[]>(() => createInitialTracks('live_play'));
  const [rythmeLiveTargetTracks, setRythmeLiveTargetTracks] = useState<TrackGroup[]>(() => createInitialSingleTrack(3, 'TARGET_CAIXA'));

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
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // --- QUIZ QUESTION EDITING HELPERS ---

  const handleLoadDraft = (e: React.ChangeEvent<HTMLInputElement>, moduleName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.module !== moduleName) {
          alert(`Erreur : Le fichier importé n'est pas un module "${moduleName}".`);
          return;
        }

        if (moduleName === 'quiz') {
          if (json.corde_cible) setQuizCordeCible(Number(json.corde_cible));
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
          if (json.corde_cible) setDicteeCordeCible(Number(json.corde_cible));
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
                 return {
                   ...t,
                   patterns: [{ ...t.patterns[0], activeSteps: saved.activeSteps || Array(16).fill(0), lyrics: saved.lyrics || Array(16).fill(''), notes: saved.notes || Array(16).fill('') }]
                 };
               }
               return t;
            }));
          }
        } else if (moduleName === 'inspecteur') {
          if (json.corde_cible) setInspecteurCordeCible(Number(json.corde_cible));
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
          if (json.corde_cible) setSablierCordeCible(Number(json.corde_cible));
          setSablierTitle(json.folheto_titre || '');
          setSablierRewardVideoUrl(json.recompense_video_url || '');
          setSablierBpm(json.bpm || 83);
          setSablierMeasures(json.sablier_mesures as 1 | 2 || 2);
          if (json.signe_image) {
            if (json.signe_image.startsWith('data:')) {
              setSablierHandImageType('upload');
              setSablierHandImageFile(json.signe_image);
            } else {
              setSablierHandImageType('url');
              setSablierHandImageUrl(json.signe_image);
            }
          }
          if (json.options) {
             setSablierOptionsFr(json.options.fr || ['', '', '']);
             setSablierOptionsPt(json.options.pt || ['', '', '']);
          }
          setSablierCorrectIndex(json.correct_index || 0);
          setSablierSuccessAudioState(json.etat_audio_succes || 'variation');
        } else if (moduleName === 'rythme_live') {
          if (json.corde_cible) setRythmeLiveCordeCible(Number(json.corde_cible));
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

  const handleGenerateExercise = () => {
    let exportData: any = null;
    const uniqueId = `custom_${Date.now()}`;

    if (activeTab === 'varal') {
      exportData = {
        module: 'varal_config',
        cordes: varalCordes.map((c, idx) => ({
          cordeIndex: idx + 1,
          requiredCount: Number(c.requiredCount) || 1,
          oeuvreToniBraga: c.oeuvreToniBraga,
          rewardData: c.rewardData
        }))
      };
    } else if (activeTab === 'quiz') {
      exportData = {
        id: uniqueId,
        corde_cible: Number(quizCordeCible),
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
    } else if (activeTab === 'dictee') {
      exportData = {
        id: uniqueId,
        corde_cible: Number(dicteeCordeCible),
        module: 'dictee',
        folheto_titre: dicteeTitle,
        recompense_video_url: dicteeRewardVideoUrl,
        bpm: Number(dicteeBpm) || 83,
        nombre_de_blocs: Number(dicteeBlocksCount) || 4,
        sequence_audio: dicteeTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          activeSteps: t.patterns[0].activeSteps,
          lyrics: t.patterns[0].lyrics,
          notes: t.patterns[0].notes
        })),
        blocs_a_ordonner: Array.from({ length: Number(dicteeBlocksCount) }).map((_, i) => ({
          id: i + 1,
          label: dicteeBlockTags[i] || `Bloc ${i + 1}`
        }))
      };
    } else if (activeTab === 'inspecteur') {
      exportData = {
        id: uniqueId,
        corde_cible: Number(inspecteurCordeCible),
        module: 'inspecteur',
        folheto_titre: inspecteurTitle,
        description: inspecteurDescription,
        bpm: Number(inspecteurBpm) || 83,
        instrument_coupable: inspecteurGuiltyInstrument,
        partition_parfaite: inspecteurPerfectTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          activeSteps: t.patterns[0].activeSteps
        })),
        piste_sabotee: inspecteurSabotagedTracks.map(t => ({
          instrumentIdx: t.instrumentIdx,
          activeSteps: t.patterns[0].activeSteps
        }))
      };
    } else if (activeTab === 'sablier') {
      exportData = {
        id: uniqueId,
        corde_cible: Number(sablierCordeCible),
        module: 'sablier_mestre',
        folheto_titre: sablierTitle,
        recompense_video_url: sablierRewardVideoUrl,
        bpm: Number(sablierBpm) || 83,
        sablier_mesures: Number(sablierMeasures) || 1,
        signe_image: sablierHandImageType === 'upload' ? sablierHandImageFile : sablierHandImageUrl,
        options: {
          fr: sablierOptionsFr.map((o, idx) => o || sablierOptionsPt[idx] || `Option ${idx + 1}`),
          pt: sablierOptionsPt.map((o, idx) => o || sablierOptionsFr[idx] || `Opção ${idx + 1}`)
        },
        correct_index: Number(sablierCorrectIndex),
        etat_audio_succes: sablierSuccessAudioState
      };
    } else if (activeTab === 'rythmelive') {
      exportData = {
        id: uniqueId,
        corde_cible: Number(rythmeLiveCordeCible),
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
          👑 Studio du Mestre
        </h2>
        <div className="text-[10px] uppercase font-bold text-[var(--cordel-wood)] border-2 border-[var(--cordel-wood)] px-2 py-0.5 rotate-[-2deg]">
          Générateur JSON
        </div>
      </div>

      {/* Main Tabbed Menu */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[var(--cordel-border)] pb-2 justify-center lg:justify-start">
        {[
          { id: 'varal', label: '1. Config Varal', icon: <Settings className="w-4 h-4" /> },
          { id: 'quiz', label: '2. Corde 1 - Quiz', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'dictee', label: '3. Corde 2 - Dictée', icon: <Music className="w-4 h-4" /> },
          { id: 'inspecteur', label: "4. Corde 3 - L'Inspecteur", icon: <Sliders className="w-4 h-4" /> },
          { id: 'sablier', label: '5. Corde 4 - Sablier', icon: <HelpCircle className="w-4 h-4" /> },
          { id: 'rythmelive', label: '6. Corde 5 - Live', icon: <Award className="w-4 h-4" /> },
          { id: 'valise', label: '📥 La Valise', icon: <Download className="w-4 h-4" /> },
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
            <p className="text-sm italic text-[var(--cordel-text)]/70 text-center">
              {lang === 'fr' 
                ? 'Configurez le nombre d\'exercices requis et les récompenses/illustrations pour chacune des 5 cordes de progression.'
                : 'Configure o número de exercícios e as recompensas/ilustrações para cada uma das 5 cordas de progresso.'}
            </p>

            <div className="grid grid-cols-1 gap-6">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="p-4 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border flex flex-col md:grid md:grid-cols-4 gap-4 items-center">
                  <div className="text-center md:text-left flex flex-col">
                    <span className="font-cactus text-lg font-black text-[var(--cordel-wood)]">Corde {idx + 1}</span>
                    <span className="text-[10px] text-[var(--cordel-text)]/60 font-semibold">
                      {idx === 0 ? 'Corde 1 - Quiz' : 
                       idx === 1 ? 'Corde 2 - Dictée' : 
                       idx === 2 ? "Corde 3 - L'Inspecteur" : 
                       idx === 3 ? 'Corde 4 - Sablier' : 
                       'Corde 5 - Rythme Live'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Exercices requis</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={varalCordes[idx].requiredCount}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, requiredCount: val } : c));
                      }}
                      className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">
                      {idx === 0 ? 'Texte Récompense' : 
                       idx === 4 ? 'Signataire Diplôme' : 
                       'Lien Vidéo YouTube'}
                    </label>
                    <input
                      type="text"
                      placeholder={idx === 0 ? "Ex: Félicitations, vous maîtrisez la théorie !" : 
                                   idx === 4 ? "Ex: Mestre Luiz de França" : 
                                   "https://www.youtube.com/watch?v=..."}
                      value={varalCordes[idx].rewardData}
                      onChange={(e) => {
                        setVaralCordes(prev => prev.map((c, cIdx) => cIdx === idx ? { ...c, rewardData: e.target.value } : c));
                      }}
                      className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1 items-center w-full justify-center">
                    <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 mb-1">Illustration Toni Braga</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCordeImageUpload(idx, e)}
                        className="text-[9px] font-semibold text-[var(--cordel-text)] w-28 file:py-1 file:px-2 file:border file:border-[var(--cordel-border)] file:bg-[var(--cordel-bg)] file:text-[var(--cordel-text)] file:text-[9px] file:cursor-pointer hover:file:bg-[var(--cordel-text)] hover:file:text-[var(--cordel-bg)]"
                      />
                      {varalCordes[idx].oeuvreToniBraga ? (
                        <img
                          src={varalCordes[idx].oeuvreToniBraga}
                          alt="toni braga preview"
                          style={{ filter: 'contrast(300%) grayscale(100%)' }}
                          className="w-10 h-10 object-contain border border-[var(--cordel-border)]/40 p-0.5 bg-white"
                        />
                      ) : (
                        <div className="w-10 h-10 border border-dashed border-[var(--cordel-border)]/40 flex items-center justify-center text-gray-500">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Corde Cible</label>
                  <select
                    value={quizCordeCible}
                    onChange={(e) => setQuizCordeCible(Number(e.target.value))}
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
            <div className="flex flex-col gap-2 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'dictee')} className="text-[10px] cursor-pointer" />
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Paramètres du Défi
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Nombre de blocs à ordonner</label>
                  <select
                    value={dicteeBlocksCount}
                    onChange={(e) => setDicteeBlocksCount(Number(e.target.value) as 4 | 8)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  >
                    <option value={4}>4 Blocs (Standard)</option>
                    <option value={8}>8 Blocs (Expert)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Roda Sequencer for Audio Target */}
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 items-center">
              <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                Phrase Rythmique de Référence (Séquence Audio)
              </span>
              <div className="w-full max-w-[500px] py-4 bg-[var(--cordel-bg)]/25 rounded flex items-center justify-center">
                <CircleSequencer
                  lang={lang}
                  tracks={dicteeTracks}
                  isPlaying={studioPlaying}
                  currentStepIndex={studioStep}
                  currentMeasure={0}
                  maxTicks={16}
                  timeSig="4/4"
                  totalMeasures={1}
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

            {/* Dynamic Blocks Labels */}
            <div className="border-2 border-[var(--cordel-border)] p-5 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-3">
              <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                Étiquettes des Blocs (Onomatopées / Paroles)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: dicteeBlocksCount }).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-1 bg-[var(--cordel-bg)]/20 p-2 border border-[var(--cordel-border)]/10 rounded">
                    <label className="text-[10px] font-bold text-[var(--cordel-wood)] uppercase">Bloc #{idx + 1}</label>
                    <input
                      type="text"
                      value={dicteeBlockTags[idx]}
                      onChange={(e) => {
                        const tags = [...dicteeBlockTags];
                        tags[idx] = e.target.value;
                        setDicteeBlockTags(tags);
                      }}
                      placeholder={`Ex: Tique / Tum`}
                      className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-1.5 rounded focus:outline-none text-xs font-semibold"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. CORDE 3: L'INSPECTEUR */}
        {activeTab === 'inspecteur' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'inspecteur')} className="text-[10px] cursor-pointer" />
              </label>
            </div>
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
                Paramètres de l'Enquête
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              </div>
            </div>

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
                    currentStepIndex={studioStep}
                    currentMeasure={0}
                    maxTicks={16}
                    timeSig="4/4"
                    totalMeasures={1}
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
                    currentStepIndex={studioStep}
                    currentMeasure={0}
                    maxTicks={16}
                    timeSig="4/4"
                    totalMeasures={1}
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
            <div className="flex flex-col gap-2 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'sablier_mestre')} className="text-[10px] cursor-pointer" />
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

            {/* Answer Options & Audio Success State */}
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                Propositions & Action de Succès
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Action / Transition Audio Attendue</label>
                  <select
                    value={sablierSuccessAudioState}
                    onChange={(e) => setSablierSuccessAudioState(e.target.value as any)}
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold"
                  >
                    <option value="variation">Variation Rythmique (Virada)</option>
                    <option value="parada">Arrêt Complet de la Roda (Parada)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Lien Vidéo Récompense (YouTube)</label>
                  <input
                    type="text"
                    value={sablierRewardVideoUrl}
                    onChange={(e) => setSablierRewardVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-dashed border-[var(--cordel-border)]/20 pt-4 mt-2">
                <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">3 Réponses Proposées (Cochez la bonne)</label>
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map((optIdx) => (
                    <div key={optIdx} className="flex gap-3 items-center border border-[var(--cordel-border)]/20 p-2 bg-[var(--cordel-bg)]/20 rounded">
                      <input
                        type="radio"
                        name="sablier_correct_radio"
                        checked={sablierCorrectIndex === optIdx}
                        onChange={() => setSablierCorrectIndex(optIdx)}
                        className="accent-[var(--cordel-wood)] cursor-pointer"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={sablierOptionsFr[optIdx]}
                          onChange={(e) => {
                            const copy = [...sablierOptionsFr];
                            copy[optIdx] = e.target.value;
                            setSablierOptionsFr(copy);
                          }}
                          placeholder={`Option ${optIdx + 1} (FR)`}
                          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 rounded text-xs"
                        />
                        <input
                          type="text"
                          value={sablierOptionsPt[optIdx]}
                          onChange={(e) => {
                            const copy = [...sablierOptionsPt];
                            copy[optIdx] = e.target.value;
                            setSablierOptionsPt(copy);
                          }}
                          placeholder={`Opção ${optIdx + 1} (PT)`}
                          className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 rounded text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. CORDE 5: RYTHME LIVE */}
        {activeTab === 'rythmelive' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
              <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1">
                <span>📂 Charger un exercice pour le modifier (.json)</span>
                <input type="file" accept=".json" onChange={(e) => handleLoadDraft(e, 'rythme_live')} className="text-[10px] cursor-pointer" />
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
                    currentStepIndex={studioStep}
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
                    currentStepIndex={studioStep}
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

        {/* 7. LA VALISE */}
        {activeTab === 'valise' && (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            <p className="text-sm italic text-[var(--cordel-text)]/70 text-center">
              {lang === 'fr'
                ? "La Valise du Mestre : importez les fichiers JSON d'exercices et de configuration du Varal pour mettre à jour l'application hors-ligne."
                : "A Mala do Mestre: importe os arquivos JSON de exercícios e configuração do Varal para atualizar o aplicativo offline."}
            </p>

            {/* Upload Area */}
            <div className="border-4 border-dashed border-[var(--cordel-border)]/45 p-8 text-center flex flex-col items-center gap-4 bg-[var(--cordel-bg)]/20 hover:border-[var(--cordel-wood)] transition-colors rounded-sm cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                multiple
                onChange={handleImportFiles}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Download className="w-12 h-12 text-[var(--cordel-wood)] animate-bounce" />
              <span className="font-cactus font-bold text-sm">
                {lang === 'fr' ? 'Sélecteur de fichiers .json (Multiples acceptés)' : 'Seletor de arquivos .json (Múltiplos aceitos)'}
              </span>
              <span className="text-[10px] text-[var(--cordel-text)]/50">
                {lang === 'fr' ? 'Cliquez ou glissez-déposez vos fichiers JSON générés par le Studio ici.' : 'Clique ou arraste e solte seus arquivos JSON gerados pelo Estúdio aqui.'}
              </span>
            </div>

            {/* Messages Log */}
            {importMessages.length > 0 && (
              <div className="border-2 border-[var(--cordel-border)] p-3 bg-black/10 flex flex-col gap-1 text-[11px] font-semibold text-left">
                {importMessages.map((msg, mIdx) => (
                  <div key={mIdx} className={msg.startsWith('Erreur') ? 'text-red-500' : 'text-green-500'}>
                    {msg}
                  </div>
                ))}
              </div>
            )}

            {/* List of Custom Exercises */}
            <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-dashed border-[var(--cordel-border)]/30 pb-2">
                <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                  {lang === 'fr' ? `Exercices chargés en mémoire (${customExercises.length})` : `Exercícios na memória (${customExercises.length})`}
                </span>
                {customExercises.length > 0 && (
                  <button
                    onClick={clearAllData}
                    className="px-3 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-bg)] font-bold text-[10px] uppercase border border-[var(--cordel-border)] rounded cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button"
                  >
                    {lang === 'fr' ? 'Vider la mémoire' : 'Zerar memória'}
                  </button>
                )}
              </div>

              {customExercises.length === 0 ? (
                <p className="text-xs italic text-[var(--cordel-text)]/50 text-center py-4">
                  {lang === 'fr' ? 'Aucun exercice personnalisé importé.' : 'Nenhum exercício personalizado importado.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {customExercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between bg-[var(--cordel-bg)]/30 p-2.5 border border-[var(--cordel-border)]/15 rounded-sm">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-[var(--cordel-text)]">
                          {ex.folheto_titre || `Exercice ${ex.module}`}
                        </span>
                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] uppercase font-bold text-gray-500">
                            {lang === 'fr' ? `Module : ${ex.module}` : `Módulo: ${ex.module}`}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-[var(--cordel-wood)]">
                            (Corde {ex.corde_cible || '?'})
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeExercise(ex.id)}
                        className="p-1 text-[var(--cordel-wood)] hover:bg-[var(--cordel-wood)] hover:text-white rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {activeTab !== 'valise' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--cordel-bg)] border-t-4 border-[var(--cordel-border)] shadow-[0_-8px_16px_rgba(0,0,0,0.2)] flex justify-center z-[100]">
          <button
            onClick={handleGenerateExercise}
            className="px-8 py-3.5 cordel-wood cordel-button text-base font-black tracking-widest uppercase flex items-center gap-2 cursor-pointer shadow-lg max-w-md w-full justify-center transition-transform hover:scale-[1.02]"
          >
            <Download className="w-5 h-5" />
            {lang === 'fr' ? 'Générer l\'exercice' : 'Gerar exercício'}
          </button>
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
