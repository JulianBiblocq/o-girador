/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RhythmSignal, TrackGroup, Language } from '../types';
import DOMPurify from 'dompurify';
import { i18n, instrumentsConfig, getMaxTicks } from '../data';
import { AudioTrackRecorder } from './AudioTrackRecorder';
// import { parseCordelFormatting } from '../utils/cordelFormatter';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { PresetMetadata, CloudRhythmSignal } from '../types';
import { uploadMestreSignal, deleteMestreSignal } from '../cloudSignals';
import { CordelImageEditor } from './CordelImageEditor';

interface RightSidebarProps {
  activePanel: 'legend' | 'letras' | 'info' | null;
  onTogglePanel: (panel: 'legend' | 'letras') => void;
  isMobile: boolean;
  mestreSignals?: CloudRhythmSignal[];
  refreshMestreSignals?: () => void;
  hideGlobalSignals?: boolean;
  onToggleHideGlobalSignals?: () => void;
  visible?: boolean;
}

const EMPTY_ARRAY: any[] = [];

const RightSidebarComponent: React.FC<RightSidebarProps> = ({
  activePanel,
  onTogglePanel,
  isMobile,
  mestreSignals = [],
  refreshMestreSignals,
  hideGlobalSignals,
  onToggleHideGlobalSignals,
  visible = true,
}) => {
  const sequencer = useSequencer();
  const tracks = useSequencerStore(state => {
    if (!visible) return EMPTY_ARRAY;
    return state.tracks;
  });
  const { userProfile } = useAuth();
  const [isUploadingSignal, setIsUploadingSignal] = React.useState(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(-1);
  React.useEffect(() => {
    if (!visible) return;

    const handleTick = (e: Event) => {
      if ((window as any).oGiradorEcoMode) {
        setCurrentStepIndex(-1);
        return;
      }
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number }>;
      setCurrentStepIndex(customEvent.detail.step);
    };
    window.addEventListener('o-girador-tick', handleTick);
    return () => window.removeEventListener('o-girador-tick', handleTick);
  }, [visible]);
  const audio = useAudio();

  const {
    lang,
    
    letras,
    setLetras: onLetrasChange,
    metadata,
    bpm = 120,
    timeSig,
    handleExtractLyrics: onExtractLyrics,
    handleAudioPatternCreated: onAudioPatternCreated,
  } = sequencer;

  const {
    isPlaying = false,
    
    handleTogglePlay: onTogglePlay,
  } = audio;

  const currentMeasure = useSequencerStore(state => visible ? state.currentMeasure : 0);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);

  const beatsPerMeasure = parseInt(timeSig.split('/')[0]) || 4;

  const onMetadataChange = (newMeta: PresetMetadata) => {
    sequencer.setMetadata(newMeta);
    if (newMeta.rhythmSignals !== sequencer.metadata?.rhythmSignals) {
      const validIds = new Set((newMeta.rhythmSignals || []).map(s => s.id));
      sequencer.setMeasureSignals(prev => prev.map(id => (id && validIds.has(id)) ? id : null));
    }
  };

  const currentPlayState = isPlaying ? {
    stepIndex: currentStepIndex,
    maxTicks: getMaxTicks(timeSig),
    activePatternIdByInst: (() => {
      const result: { [instIdx: number]: number | null } = {};
      tracks.forEach(t => {
        if (result[t.instrumentIdx] === undefined) {
          if (isPlaying) {
            const activePattern = t.patterns.find(p => p.measureAssignments[currentMeasure]);
            result[t.instrumentIdx] = activePattern ? activePattern.id : null;
          } else {
            result[t.instrumentIdx] = t.selectedPatternId;
          }
        }
      });
      return result;
    })(),
  } : null;
  const [signalCameraActive, setSignalCameraActive] = React.useState<boolean>(false);
  const signalVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const signalStreamRef = React.useRef<MediaStream | null>(null);
  const [subTab, setSubTab] = React.useState<'toada' | 'info' | 'gravacao' | 'legendes' | 'sinais'>('info');
  const [pendingSignalImage, setPendingSignalImage] = React.useState<string | null>(null);
  const [pendingSignalName, setPendingSignalName] = React.useState<string>('');
  const [isCapturingBurst, setIsCapturingBurst] = React.useState<boolean>(false);
  const [burstCount, setBurstCount] = React.useState<number>(0);
  const [isProcessingGif, setIsProcessingGif] = React.useState<boolean>(false);
  const [flashActive, setFlashActive] = React.useState<boolean>(false);
  const [isGlobalUpload, setIsGlobalUpload] = React.useState<boolean>(false);
  const [useCordelEffect, setUseCordelEffect] = React.useState<boolean>(false);
  const [rawSignalFrames, setRawSignalFrames] = React.useState<string[]>([]);
  const [showAddSignalForm, setShowAddSignalForm] = React.useState<boolean>(false);

  // Stop camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (signalStreamRef.current) {
        signalStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const compressAndResizeImage = (fileOrBlob: File | Blob, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 500;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          callback(compressedBase64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  };

  const handleSignalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndResizeImage(file, (base64) => {
        if (!pendingSignalName) {
          const nameWithoutExt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
          setPendingSignalName(nameWithoutExt.substring(0, 30));
        }
        if (useCordelEffect) {
          setRawSignalFrames([base64]);
        } else {
          setPendingSignalImage(base64);
        }
      });
    }
    e.target.value = '';
  };

  const startSignalCamera = async () => {
    try {
      setSignalCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      signalStreamRef.current = stream;
      setTimeout(() => {
        if (signalVideoRef.current) {
          signalVideoRef.current.srcObject = stream;
          signalVideoRef.current.play().catch(e => console.error('Video play error:', e));
        }
      }, 100);
    } catch (err) {
      console.error('Signal camera error:', err);
      setSignalCameraActive(false);
      window.alert(lang === 'fr' 
        ? "Impossible d'accéder à la caméra."
        : "Não foi possível acessar a câmera.");
    }
  };

  const stopSignalCamera = () => {
    if (signalStreamRef.current) {
      signalStreamRef.current.getTracks().forEach(t => t.stop());
      signalStreamRef.current = null;
    }
    setSignalCameraActive(false);
  };

  const captureSignalPhoto = (isBurst: boolean = true) => {
    if (isCapturingBurst || isProcessingGif) return;
    if (signalVideoRef.current) {
      setIsCapturingBurst(true);
      setBurstCount(0);
      setIsProcessingGif(false);
      
      const video = signalVideoRef.current;
      const frames: string[] = [];
      const totalFrames = isBurst ? 4 : 1;
      const intervalMs = isBurst ? 1000 : 0; // 4 frames over 3 seconds if burst, else immediate

      const captureFrame = async (frameIndex: number) => {
        if (!signalStreamRef.current) {
          setIsCapturingBurst(false);
          return;
        }

        // 1. Flash effect
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 150);

        // 2. Draw square-cropped frame to canvas
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 480;
          const size = Math.min(videoWidth, videoHeight);
          const sx = (videoWidth - size) / 2;
          const sy = (videoHeight - size) / 2;
          ctx.drawImage(video, sx, sy, size, size, 0, 0, 200, 200);
          
          const frameBase64 = canvas.toDataURL('image/jpeg', 0.4); // compressed frame
          frames.push(frameBase64);
          setBurstCount(frameIndex + 1);
        }

        if (frameIndex + 1 >= totalFrames) {
          // Finished capturing
          setIsCapturingBurst(false);

          if (useCordelEffect) {
            setRawSignalFrames(frames);
            stopSignalCamera();
            return;
          }

          if (totalFrames === 1) {
             setPendingSignalImage(frames[0]);
             stopSignalCamera();
             return;
          }

          setIsProcessingGif(true);

          try {
            const gifshot = (await import('gifshot')).default;
            gifshot.createGIF({
              images: frames,
              gifWidth: 160, // highly optimized size
              gifHeight: 160,
              numFrames: totalFrames,
              frameDuration: 7.5, // 750ms per frame = 3s total loop duration
              sampleInterval: 12, // strong compression
              numWorkers: 2,
            }, (obj: any) => {
              setIsProcessingGif(false);
              if (!obj.error) {
                setPendingSignalImage(obj.image);
                stopSignalCamera();
              } else {
                console.error('GIF creation error:', obj.errorMsg);
                window.alert(lang === 'fr' 
                  ? "Erreur lors de la génération du GIF." 
                  : "Erro ao gerar o GIF.");
              }
            });
          } catch (err) {
            console.error('Failed to load gifshot:', err);
            setIsProcessingGif(false);
            window.alert(lang === 'fr' 
              ? "Erreur de chargement du module GIF." 
              : "Erro ao carregar o módulo GIF.");
          }
        } else {
          setTimeout(() => {
            captureFrame(frameIndex + 1);
          }, intervalMs);
        }
      };

      captureFrame(0);
    }
  };

  const handleAddSignal = async () => {
    if (!pendingSignalImage || !onMetadataChange || !metadata) return;
    
    const isMestreOrAdmin = userProfile?.role === 'mestre' || userProfile?.role === 'admin';
    const finalName = pendingSignalName.trim() || (lang === 'fr' ? 'Signal sans nom' : 'Sinal sem nome');

    if (isMestreOrAdmin) {
      setIsUploadingSignal(true);
      const mestreIdToUse = isGlobalUpload ? 'global' : (userProfile?.mestreId || userProfile?.uid);
      if (mestreIdToUse) {
        const result = await uploadMestreSignal(mestreIdToUse, finalName, pendingSignalImage);
        if (result) {
          if (refreshMestreSignals) refreshMestreSignals();
          setPendingSignalImage(null);
          setPendingSignalName('');
        } else {
          window.alert(lang === 'fr' 
            ? "Erreur lors de l'upload vers le Cloud. Vérifiez vos règles Firebase (Firestore et Storage)." 
            : "Erro no upload para a nuvem. Verifique suas regras do Firebase (Firestore e Storage).");
        }
      } else {
        window.alert("Erreur: Mestre ID introuvable.");
      }
      setIsUploadingSignal(false);
    } else {
      const newSignal = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: finalName,
        image: pendingSignalImage,
      };
      const prev = metadata.rhythmSignals || [];
      onMetadataChange({ ...metadata, rhythmSignals: [...prev, newSignal] });
      setPendingSignalImage(null);
      setPendingSignalName('');
    }
  };

  const handleDeleteSignal = async (id: string, isCloud: boolean, signalMestreId?: string) => {
    if (isCloud && signalMestreId) {
      const isMestreOrAdmin = userProfile?.role === 'mestre' || userProfile?.role === 'admin';
      if (isMestreOrAdmin) {
        await deleteMestreSignal(id, signalMestreId);
        if (refreshMestreSignals) refreshMestreSignals();
      }
    } else {
      if (!onMetadataChange || !metadata) return;
      const updated = (metadata.rhythmSignals || []).filter(s => s.id !== id);
      onMetadataChange({ ...metadata, rhythmSignals: updated });
    }
  };

  const t = (key: string) => {
    const section = i18n[lang];
    return (section as any)[key] || key;
  };

  if (isMobile && !activePanel) return null;

  React.useEffect(() => {
    if (isMobile) {
      if (activePanel === 'legend') setSubTab('legendes');
      if (activePanel === 'letras') setSubTab('toada');
    }
  }, [activePanel, isMobile]);  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    const videoId = match ? match[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  return (
    <>
      <div
        id="right-sidebar-panel"
        style={{ display: visible ? 'flex' : 'none' }}
        className="w-[340px] min-w-[340px] bg-[var(--cordel-bg)] cordel-bg border-l-[3px] border-[var(--cordel-border)] flex flex-col h-full transition-all duration-300 relative z-10 text-[var(--cordel-text)]"
      >
        <div className="flex flex-col p-5 h-full overflow-hidden">
          <div className="flex justify-between items-center border-b-[3px] border-[var(--cordel-border)] pb-3 mb-4 shrink-0">
            <span className="font-cactus font-bold text-2xl text-[var(--cordel-text)] tracking-wider uppercase font-medium">
              Info
            </span>
            {isMobile && (
              <button
                onClick={() => onTogglePanel('letras')}
                className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button px-2 py-1 text-sm font-bold hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors"
              >
                X
              </button>
            )}
          </div>

          {/* Sub-tab Selector */}
          <div className="mb-4 shrink-0">
            <select
              value={subTab}
              onChange={(e) => setSubTab(e.target.value as any)}
              className="w-full py-2 px-3 font-cactus font-bold text-[14px] uppercase cordel-border-sm cursor-pointer bg-[var(--cordel-bg)] text-[var(--cordel-text)] focus:outline-none appearance-none"
              style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
            >
              <option value="toada">📝 Toada</option>
              <option value="info">ℹ️ Info</option>
              <option value="sinais">🎨 {lang === 'fr' ? 'Signes' : 'Sinais'}</option>
              <option value="gravacao">🎙️ Gravação</option>
              <option value="legendes">📖 {t('legend')}</option>
            </select>
          </div>

          {/* TAB 4: Légendes */}
          {subTab === 'legendes' && (
          <div className="flex flex-col gap-1.5 pr-1 flex-grow overflow-y-auto custom-scrollbar min-h-0">
            
            {/* Shortcuts & Gestures */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  ⌨️ {lang === 'fr' ? 'Raccourcis & Gestes' : 'Atalhos e Gestos'}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed">
                {lang === 'fr' ? (
                  <>
                    <p>• <b>Double-clic</b> (ou appui long) sur un temps pour y insérer une frappe forte.</p>
                    <p>• <b>Clic simple</b> pour insérer une frappe faible.</p>
                    <p>• <b>Molette souris</b> (ou glisser haut/bas) sur une cellule pour changer la frappe/nuance.</p>
                    <p>• <b>Ctrl + Clic</b> (ou long press) sur l'entête d'une ligne pour muter l'instrument.</p>
                  </>
                ) : (
                  <>
                    <p>• <b>Duplo clique</b> (ou pressionar longo) em um tempo para inserir uma batida forte.</p>
                    <p>• <b>Clique simples</b> para inserir uma batida fraca.</p>
                    <p>• <b>Roda do mouse</b> (ou deslizar para cima/baixo) em uma célula para mudar a batida/nuance.</p>
                    <p>• <b>Ctrl + Clique</b> (ou pressionar longo) no cabeçalho de uma linha para mutar o instrumento.</p>
                  </>
                )}
              </div>
            </details>

            {/* Export WAV */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  💾 {t('wavExportTitle')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('wavExportDesc')) }} />
              </div>
            </details>

            {/* Offline Mode */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  📱 {t('pwaOfflineTitle')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwaOfflineDesc')) }} />
              </div>
            </details>

            {/* Vocals */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/micro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  {t('voiceLegendTitle')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 text-xs text-[var(--cordel-text)] leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend1')) }} />
                <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend2')) }} />
              </div>
            </details>

            {/* Alfaia */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/alfaia.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  Alfaia
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">D / d</span>
                  <span>{t('mainDroite')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">E / e</span>
                  <span>{t('mainGauche')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#8c7b7b] text-[#f4ecd8]">X / x</span>
                  <span>{t('legendAlfaiaCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#ff8da1] text-[#1a1a1a]">I / i</span>
                  <span>{t('legendAlfaiaIguarassu')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a89f91] text-[#1a1a1a]">C / c</span>
                  <span>{t('legendTarolClick')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4c1c1c] text-[#f4ecd8]">B / b</span>
                  <span>{t('legendAlfaiaBarulho')}</span>
                </div>
              </div>
            </details>

            {/* Caixa & Tarol */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/caixa.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  Caixa & Tarol
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">D / d</span>
                  <span>{t('mainDroite')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">E / e</span>
                  <span>{t('mainGauche')}</span>
                </div>
                <div className="w-full h-px bg-[var(--cordel-border)]/10 my-1"></div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a855f7] text-[#f4ecd8]">R</span>
                  <span>{t('legendCaixaRufadaD')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d8b4fe] text-[#1a1a1a]">r</span>
                  <span>{t('legendCaixaRufadaG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d946ef] text-[#f4ecd8]">F / f</span>
                  <span>{t('legendCaixaFla')} {lang === 'fr' ? '(Caixa : F / f, Tarol : F / f en bleu)' : '(Caixa: F / f, Tarol: F / f em azul)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7e7b8c] text-[#f4ecd8]">X / x</span>
                  <span>{t('legendCaixaCerclage')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a89f91] text-[#1a1a1a]">C / c</span>
                  <span>{t('legendTarolClick')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4a044e] text-[#f4ecd8]">B / b</span>
                  <span>{lang === 'fr' ? 'Barulho / Tremer (Caixa : Violet foncé, Tarol : Bleu)' : 'Barulho / Ruído (Caixa: Violeta escuro, Tarol: Azul)'}</span>
                </div>
              </div>
            </details>

            {/* Timbal */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/timbal.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  Timbal
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#92400e] text-[#f4ecd8]">G / g</span>
                  <span>{lang === 'fr' ? 'Basse (baixo) - Main forte / faible' : 'Basse / Baixo - Mão forte / fraca'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d97706] text-[#f4ecd8]">A / a</span>
                  <span>{lang === 'fr' ? 'Ouvert (aberto) - Main forte / faible' : 'Aberto - Mão forte / fraca'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#fbbf24] text-[#1a1a1a]">S / s</span>
                  <span>{lang === 'fr' ? 'Claqué (slap) - Main forte / faible' : 'Claqué / Slap - Mão forte / fraca'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7e7b8c] text-[#f4ecd8]">D / d</span>
                  <span>{lang === 'fr' ? 'Fantôme (dedilhado) - Main forte / faible' : 'Fantasma / Dedilhado - Mão forte / fraca'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#5c2205] text-[#f4ecd8]">P / p</span>
                  <span>{lang === 'fr' ? 'Fermé (preso) - Main forte / faible' : 'Abafado / Preso - Mão forte / fraca'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#ea580c] text-[#f4ecd8]">F / f</span>
                  <span>{lang === 'fr' ? 'Fla ouvert (aberto)' : 'Fla aberto'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#f97316] text-[#f4ecd8]">V / v</span>
                  <span>{lang === 'fr' ? 'Fla claqué (slap)' : 'Fla slap'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a89f91] text-[#1a1a1a]">C / c</span>
                  <span>{lang === 'fr' ? 'Clap (mains) - Deux mains l\'une contre l\'autre' : 'Clap (mãos) - Duas mãos uma contra a outra'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#291002] text-[#f4ecd8]">B / b</span>
                  <span>{lang === 'fr' ? 'Barulho (fatras)' : 'Barulho / Ruído'}</span>
                </div>
              </div>
            </details>

            {/* Gongue */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/gongue.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  {t('gongueLegend')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">G / g</span>
                  <span>{t('gongueGrave')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">A / a</span>
                  <span>{t('gongueAigu')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7f8c8d] text-[#f4ecd8]">X / x</span>
                  <span>{t('legendGongueBord')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#6d4c41] text-[#f4ecd8]">B / b</span>
                  <span>{t('gongueBarulho')}</span>
                </div>
              </div>
            </details>

            {/* Agbe */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/agbe.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  {t('agbeLegend')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">E / e</span>
                  <span>{t('agbeG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">D / d</span>
                  <span>{t('agbeD')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#dcfce7] text-[#1a1a1a]">S / s</span>
                  <span>{t('legendAgbeSaut')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a7f3d0] text-[#1a1a1a]">V / v</span>
                  <span>{t('legendAgbeVolta')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#052e16] text-[#f4ecd8]">B / b</span>
                  <span>{t('legendAgbeBarulho')}</span>
                </div>
              </div>
            </details>

            {/* Mineiro */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/mineiro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  {t('mineiroLegend')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">P / p</span>
                  <span>{t('mineiroP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">T / t</span>
                  <span>{t('mineiroT')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#f59e0b] text-[#1a1a1a]">L / l</span>
                  <span>{t('mineiroL')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#78350f] text-[#f4ecd8]">B / b</span>
                  <span>{t('mineiroB')}</span>
                </div>
              </div>
            </details>

            {/* Apito */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  <img src="icones/apito.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
                  {t('apitoLegend')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#eab308] text-[#1a1a1a]">W</span>
                  <span>{t('apitoLong')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#fef08a] text-[#1a1a1a]">w</span>
                  <span>{t('apitoShort')}</span>
                </div>
              </div>
            </details>

            {/* Contact & Feedback */}
            <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
              <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
                  💬 {t('feedbackTitle')}
                </span>
                <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="p-3 border-t border-[var(--cordel-border)]/20 text-center">
                <p className="text-[10px] text-[var(--cordel-text)] leading-relaxed mb-2">
                  {lang === 'fr' 
                    ? "Une idée, un bug ou un retour ? Venez en discuter sur le forum !" 
                    : "Uma ideia, um bug ou feedback? Venha conversar no fórum!"}
                </p>
                <button
                  onClick={() => window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank')}
                  className="bg-[#27ae60] text-[#1a1a1a] hover:opacity-90 px-3 py-1 text-xs font-bold cordel-border-sm cursor-pointer mx-auto flex items-center gap-1"
                >
                  <span>💬</span>
                  <span>{t('feedbackBtn')}</span>
                </button>
              </div>
            </details>
          </div>
          )}
{subTab === 'toada' && (
            <div className="flex flex-col flex-grow overflow-hidden min-h-0">
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0">
                {lang === 'fr' ? 'Paroles de la Toada' : 'Letra da Toada'}
              </span>
              <textarea
                id="letras-textarea"
                placeholder={t('letrasPlaceholder')}
                value={letras}
                onChange={(e) => onLetrasChange(e.target.value)}
                className="w-full h-[150px] min-h-[100px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[2px] border-[var(--cordel-border)] p-2 font-sans text-xs outline-none resize-none focus:border-[var(--cordel-border)] mb-4 shrink-0"
              />
              
              {onExtractLyrics && (
                <button
                  onClick={onExtractLyrics}
                  className="w-full py-1.5 bg-[#8b2a1a] text-[#f4ecd8] text-xs font-bold cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer mb-4 shrink-0 flex items-center justify-center gap-1.5"
                  title={t('extractBtn')}
                >
                  <span>{t('extractBtn')}</span>
                </button>
              )}
              
              <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-1 shrink-0">
                🎤 Karaokê
              </span>

              {/* Karaoke Viewer Container */}
              <div className="flex-grow overflow-y-auto min-h-0 pr-1 custom-scrollbar">
                {(() => {
                  const voiceTracks = tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.type === 'voice' && !t.isMute);
                  if (voiceTracks.length === 0) {
                    return (
                      <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-6 italic opacity-70">
                        {lang === 'fr' 
                          ? 'Ajoutez une piste de voix (non mutée) pour voir le karaoké.'
                          : 'Adicione uma faixa de Voz/Coro (não mutada) para ver o karaokê.'}
                      </div>
                    );
                  }

                  // Determine which pattern is active per instrument (for karaoke turn)
                  const activeByInst = currentPlayState?.activePatternIdByInst ?? {};

                  type Token = { trackId: number; patternId: number; stepIdx: number; displayText: string; hasSpace: boolean; color: string; instIdx: number; isBreak?: boolean };
                  const allTokens: Token[] = [];
                  voiceTracks.forEach(t => {
                    const inst = instrumentsConfig[t.instrumentIdx];
                    t.patterns.forEach(ptn => {
                      let addedTokensForPattern = false;
                      for (let i = 0; i < ptn.steps; i++) {
                        const state = ptn.activeSteps[i];
                        const lyric = ptn.lyrics[i];
                        if (!state || state === 0 || !lyric || lyric.trim() === '') continue;
                        const isPux = state === 'P';
                        const color = isPux ? inst.colors['P'] : inst.colors['C'];
                        
                        // Respect user's explicit trailing spaces
                        const hasSpace = lyric.endsWith(' ');
                        const displayText = lyric.replace(/-$/, '').trim();
                        
                        allTokens.push({ trackId: t.id, patternId: ptn.id, stepIdx: i, displayText, hasSpace, color, instIdx: t.instrumentIdx });
                        addedTokensForPattern = true;
                      }
                      if (addedTokensForPattern) {
                        allTokens.push({ trackId: t.id, patternId: ptn.id, stepIdx: -1, displayText: '', hasSpace: false, color: '', instIdx: t.instrumentIdx, isBreak: true });
                      }
                    });
                  });

                  return (
                    <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm p-3 font-sans">
                      <div className="flex flex-wrap gap-y-2 leading-loose text-base">
                        {(() => {
                          const words: Token[][] = [];
                          let currentWord: Token[] = [];
                          allTokens.forEach(tok => {
                            if (tok.isBreak) {
                              if (currentWord.length > 0) {
                                words.push(currentWord);
                                currentWord = [];
                              }
                              words.push([tok]);
                              return;
                            }
                            currentWord.push(tok);
                            if (tok.hasSpace) {
                              words.push(currentWord);
                              currentWord = [];
                            }
                          });
                          if (currentWord.length > 0) words.push(currentWord);

                          return words.map((word, wordIdx) => {
                            if (word[0].isBreak) {
                              return <div key={`break-${wordIdx}`} className="w-full h-1" />;
                            }
                            return (
                              <span key={`word-${wordIdx}`} className="inline">
                                {word.map((tok, idx) => {
                                  const t = voiceTracks.find(x => x.id === tok.trackId);
                                  if (!t) return null;

                                  const groupActiveId = activeByInst[tok.instIdx];
                                  const isThisPatternActive = currentPlayState !== null && (groupActiveId === tok.patternId || groupActiveId === undefined || groupActiveId === null);
                                  const activePattern = t.patterns.find(p => p.id === tok.patternId);
                                  if (!activePattern) return null;

                                  const currentStep = (isThisPatternActive && currentPlayState)
                                    ? Math.floor((currentPlayState.stepIndex / currentPlayState.maxTicks) * activePattern.steps)
                                    : -1;
                                  
                                  const isHighlighted = isThisPatternActive && currentStep === tok.stepIdx;

                                  return (
                                    <span
                                      key={`${tok.trackId}-${tok.patternId}-${tok.stepIdx}-${idx}`}
                                      className={`transition-all duration-100 font-bold ${
                                        isHighlighted ? 'scale-110 cordel-border-sm px-1' : ''
                                      }`}
                                      style={{
                                        backgroundColor: isHighlighted ? 'var(--cordel-text)' : 'transparent',
                                        color: isHighlighted ? 'var(--cordel-bg)' : 'var(--cordel-text)',
                                        marginRight: tok.hasSpace ? '6px' : '0px',
                                      }}
                                    >
                                      {tok.displayText}
                                    </span>
                                  );
                                })}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Tab 2: Informations */}
          {subTab === 'info' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
              {metadata && onMetadataChange ? (
                <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-bg)] cordel-border-sm">
                  <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1">
                    {t('metaInfo')}
                  </span>
                  <input
                    type="text"
                    placeholder={t('metaToada')}
                    value={metadata.toada}
                    onChange={(e) => onMetadataChange({ ...metadata, toada: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={t('metaNacao')}
                    value={metadata.nacao}
                    onChange={(e) => onMetadataChange({ ...metadata, nacao: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={t('metaCompositor')}
                    value={metadata.compositor}
                    onChange={(e) => onMetadataChange({ ...metadata, compositor: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={t('metaRitmo')}
                    value={metadata.ritmo}
                    onChange={(e) => onMetadataChange({ ...metadata, ritmo: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder={lang === 'pt' ? 'Link do YouTube' : 'Lien YouTube'}
                    value={metadata.youtubeUrl || ''}
                    onChange={(e) => onMetadataChange({ ...metadata, youtubeUrl: e.target.value })}
                    className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                  />
                  {metadata.youtubeUrl && getYouTubeEmbedUrl(metadata.youtubeUrl) && (
                    <div className="mt-2 aspect-video w-full rounded-none overflow-hidden cordel-border-sm">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={getYouTubeEmbedUrl(metadata.youtubeUrl)} 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      />
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-10 italic opacity-70">
                  {lang === 'fr' 
                    ? 'Aucune métadonnée disponible pour ce rythme.' 
                    : 'Nenhuma informação disponível para este ritmo.'}
                </div>
              )}
            </div>
          )}

          {/* Tab: Sinais */}
          {subTab === 'sinais' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0 flex flex-col gap-2">
              <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-bg)] cordel-border-sm">
                <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                  🥁 {lang === 'fr' ? 'Signes du rythme' : 'Sinais do ritmo'}
                </span>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
                        {lang === 'fr'
                          ? 'Ces images s\'affichent en transparence dans la Roda et peuvent être assignées à des mesures dans la Timeline.'
                          : 'Estas imagens aparecem em transparência na Roda e podem ser atribuídas a compassos na Timeline.'}
                      </span>
                      {onToggleHideGlobalSignals && (
                        <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1">
                          <input 
                            type="checkbox" 
                            checked={hideGlobalSignals || false} 
                            onChange={onToggleHideGlobalSignals}
                            className="w-3 h-3 cursor-pointer"
                          />
                          <span className="text-[10px] text-[var(--cordel-text)] font-bold">
                            {lang === 'fr' ? 'Masquer le catalogue Global' : 'Ocultar catálogo Global'}
                          </span>
                        </label>
                      )}
                    </div>

                    {/* Galerie des signaux existants (Cloud + Local) */}
                    {(mestreSignals.length > 0 || (metadata?.rhythmSignals || []).length > 0) && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {/* Signaux du Mestre (Cloud) */}
                        {mestreSignals.map(sig => (
                          <div key={sig.id} className="relative group bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden flex flex-col items-center justify-center aspect-square border-[var(--cordel-border)]">
                            {sig.imageUrl ? (
                              <img src={sig.imageUrl} alt={sig.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-black/5 text-3xl">📢</div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex flex-col text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-bold text-white truncate px-1">{sig.name}</span>
                            </div>
                            {sig.mestreId === 'global' && (
                               <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1 cordel-border-sm">🌍 Global</div>
                            )}
                            {(userProfile?.role === 'mestre' || userProfile?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteSignal(sig.id, true, sig.mestreId)}
                                className="absolute top-1 right-1 bg-[#8b2a1a] text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Signaux Locaux (Legacy) */}
                        {(metadata?.rhythmSignals || []).map(sig => (
                          <div key={sig.id} className="relative group bg-[var(--cordel-bg)] cordel-border-sm overflow-hidden flex flex-col items-center justify-center aspect-square border-gray-400">
                            {sig.image ? (
                              <img src={sig.image} alt={sig.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-black/5 text-3xl">📢</div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex flex-col text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-bold text-white truncate px-1">{sig.name}</span>
                            </div>
                            <div className="absolute top-1 left-1 bg-gray-500 text-white text-[8px] font-bold px-1 cordel-border-sm">Local</div>
                            <button
                              onClick={() => handleDeleteSignal(sig.id, false)}
                              className="absolute top-1 right-1 bg-[#8b2a1a] text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center cordel-border-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                               title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Toggle Add Form Button */}
                    {!pendingSignalImage && rawSignalFrames.length === 0 && !showAddSignalForm && (
                      <button
                        onClick={() => setShowAddSignalForm(true)}
                        className="w-full py-2 mt-3 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-cactus font-bold text-xs uppercase tracking-wider cordel-border-sm hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        ➕ {lang === 'fr' ? 'Nouveau Signal' : 'Novo Sinal'}
                      </button>
                    )}

                    {/* Formulaire d'ajout d'un signal */}
                    {!pendingSignalImage && rawSignalFrames.length === 0 && showAddSignalForm ? (
                      <div className="flex flex-col gap-2 mt-3 border border-[var(--cordel-border)] border-dashed p-2 bg-black/5">
                        <div className="flex justify-between items-center mb-1">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                             <input 
                               type="checkbox" 
                               checked={useCordelEffect} 
                               onChange={e => setUseCordelEffect(e.target.checked)}
                               className="w-3 h-3 cursor-pointer accent-[var(--cordel-text)]"
                             />
                             <span className="text-[10px] text-[var(--cordel-text)] font-bold">
                               {lang === 'fr' ? '🎨 Appliquer effet Cordel' : '🎨 Aplicar efeito Cordel'}
                             </span>
                          </label>
                          <button onClick={() => setShowAddSignalForm(false)} className="text-[12px] font-bold text-[var(--cordel-text)] hover:text-red-700 px-2 cursor-pointer" title={lang === 'fr' ? 'Fermer' : 'Fechar'}>✖</button>
                        </div>
                        {signalCameraActive ? (
                          <div className="flex flex-col gap-2">
                            <div className="aspect-video bg-black cordel-border-sm overflow-hidden relative">
                              <video ref={signalVideoRef} className="w-full h-full object-cover" playsInline muted />
                              
                              {/* Flash effect overlay */}
                              <div 
                                className="absolute inset-0 bg-white z-20 pointer-events-none transition-opacity duration-150"
                                style={{ opacity: flashActive ? 0.7 : 0 }}
                              />
                              
                              {/* Capture/Processing status overlay */}
                              {(isCapturingBurst || isProcessingGif) && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white z-10 select-none animate-fade-in">
                                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span className="text-[10px] font-cactus font-bold tracking-wider uppercase">
                                    {isProcessingGif 
                                      ? (lang === 'fr' ? 'Création du GIF...' : 'Criando GIF...')
                                      : `${lang === 'fr' ? 'Capture' : 'Capturando'} : ${burstCount}/4`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => captureSignalPhoto(false)}
                                disabled={isCapturingBurst || isProcessingGif}
                                className={`flex-1 py-1 text-white text-[10px] font-bold cordel-border-sm cursor-pointer transition-opacity ${
                                  (isCapturingBurst || isProcessingGif)
                                    ? 'bg-blue-800 opacity-50 cursor-not-allowed'
                                    : 'bg-blue-600 hover:opacity-85'
                                }`}
                              >
                                📸 {lang === 'fr' ? 'Photo' : 'Foto'}
                              </button>
                              <button
                                onClick={() => captureSignalPhoto(true)}
                                disabled={isCapturingBurst || isProcessingGif}
                                className={`flex-1 py-1 text-white text-[10px] font-bold cordel-border-sm cursor-pointer transition-opacity ${
                                  (isCapturingBurst || isProcessingGif)
                                    ? 'bg-emerald-800 opacity-50 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:opacity-85'
                                }`}
                              >
                                🎞️ {isProcessingGif 
                                  ? (lang === 'fr' ? 'Création...' : 'Criando...')
                                  : isCapturingBurst 
                                    ? `${burstCount}/4`
                                    : (lang === 'fr' ? 'Rafale' : 'Rajada')}
                              </button>
                              <button
                                onClick={stopSignalCamera}
                                disabled={isCapturingBurst || isProcessingGif}
                                className={`py-1 px-2 text-black text-[10px] font-bold cordel-border-sm cursor-pointer transition-opacity ${
                                  (isCapturingBurst || isProcessingGif)
                                    ? 'bg-gray-400 opacity-50 cursor-not-allowed'
                                    : 'bg-gray-300 hover:opacity-85'
                                }`}
                                title={lang === 'fr' ? 'Annuler' : 'Cancelar'}
                              >
                                ✖
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <label className="flex-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[10px] font-bold cordel-border-sm text-center cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors flex items-center justify-center gap-1">
                              📁 {lang === 'fr' ? 'Fichier' : 'Arquivo'}
                              <input type="file" accept="image/*" onChange={handleSignalFileChange} className="hidden" />
                            </label>
                            <button
                              onClick={startSignalCamera}
                              className="flex-1 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-[10px] font-bold cordel-border-sm hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              📷 {lang === 'fr' ? 'Caméra' : 'Câmera'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : rawSignalFrames.length > 0 ? (
                      <CordelImageEditor
                        frames={rawSignalFrames}
                        lang={lang}
                        onComplete={(result) => {
                          setPendingSignalImage(result);
                          setRawSignalFrames([]);
                        }}
                        onCancel={() => setRawSignalFrames([])}
                      />
                    ) : pendingSignalImage ? (
                      <div className="flex flex-col gap-2">
                        <img src={pendingSignalImage} alt="preview" className="w-full max-h-24 object-contain bg-black/10 cordel-border-sm" />
                        <input
                          type="text"
                          placeholder={lang === 'fr' ? 'Nom du signal…' : 'Nome do sinal…'}
                          value={pendingSignalName}
                          onChange={e => setPendingSignalName(e.target.value)}
                          className="bg-transparent border-b border-[var(--cordel-border)] text-[var(--cordel-text)] font-bold text-xs p-1.5 focus:border-[var(--cordel-border)] outline-none w-full"
                          onKeyDown={e => { if (e.key === 'Enter') handleAddSignal(); }}
                          autoFocus
                        />
                        {userProfile?.role === 'admin' && (
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input 
                              type="checkbox" 
                              checked={isGlobalUpload}
                              onChange={e => setIsGlobalUpload(e.target.checked)}
                              className="accent-emerald-600"
                            />
                            <span className="text-[10px] font-bold text-[var(--cordel-text)]">
                              {lang === 'fr' ? '🌍 Rendre public (Catalogue Global)' : '🌍 Tornar público (Catálogo Global)'}
                            </span>
                          </label>
                        )}
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={handleAddSignal}
                            disabled={!pendingSignalName.trim() || isUploadingSignal}
                            className={`flex-1 py-1 bg-black text-white cordel-border-sm text-[10px] font-bold ${(!pendingSignalName.trim() || isUploadingSignal) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                          >
                            {isUploadingSignal ? '...' : (lang === 'fr' ? 'Ajouter' : 'Adicionar')}
                          </button>
                          <button
                            onClick={() => { setPendingSignalImage(null); setPendingSignalName(''); }}
                            className="py-1 px-3 bg-gray-300 text-black text-[10px] font-bold cordel-border-sm hover:opacity-85 cursor-pointer"
                          >
                            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
          )}

          {/* Tab 4: Gravação */}
          {subTab === 'gravacao' && onAudioPatternCreated && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
              <AudioTrackRecorder
                patternId={9999}
                bpm={bpm}
                beatsPerMeasure={beatsPerMeasure}
                onStartSequencer={onTogglePlay}
                onAudioPatternCreated={onAudioPatternCreated}
              />
            </div>
          )}
        </div>
    </div>

    </>
  );
};

export const RightSidebar = React.memo(RightSidebarComponent);
