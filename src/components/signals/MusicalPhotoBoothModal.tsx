/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../../utils/cordelEffect';

export interface MusicalPhotoBoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signal: {
    name: string;
    image: string; // T1 / vignette preview
    frames: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    frameOverrides?: Record<number, Partial<CordelOptions>>;
    beatsCount: number;
    mirrorHorizontal?: boolean;
  }) => void;
  initialBpm?: number;
  lang: 'fr' | 'pt';
}

type Phase = 'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review';

export const MusicalPhotoBoothModal: React.FC<MusicalPhotoBoothModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBpm = 90,
  lang,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [beatsCount, setBeatsCount] = useState<number>(4);
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [signalName, setSignalName] = useState<string>('');
  
  // Prise de vue en cours
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0); // 0 to beatsCount - 1
  const [sasCountdown, setSasCountdown] = useState<number>(3); // 3, 2, 1
  const [displayedBeat, setDisplayedBeat] = useState<number>(1); // 1..N

  // Effet Cordel & frames finales
  const [cordelOptions, setCordelOptions] = useState<CordelOptions>({
    ...defaultCordelOptions,
    zoom: 120,
    detail: 60,
    shadow: 128,
    brightness: 0,
    threshold: 128,
    sobelContrast: 50,
    isMirror: true,
    isFrame: false,
    posX: 0,
    posY: 0,
  });
  const [processedFrames, setProcessedFrames] = useState<string[]>([]);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);

  // 🎛️ Nouveaux états de transport de revue & débrayage unitaire
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Défaut false pour vue figée sans stress
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [activePlayheadIndex, setActivePlayheadIndex] = useState<number>(0);
  const [overrideMode, setOverrideMode] = useState<'global' | 'local'>('global');
  const [frameOverrides, setFrameOverrides] = useState<Record<number, Partial<CordelOptions>>>({});

  // Références matérielles & DOM
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashElRef = useRef<HTMLDivElement | null>(null);
  const beatNumberElRef = useRef<HTMLDivElement | null>(null);
  const rawBase64ImagesRef = useRef<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Timers & verrous anti-course
  const timerRef = useRef<any>(null);
  const loopPreviewTimerRef = useRef<any>(null);
  const reprocessDebounceTimerRef = useRef<any>(null);
  const reprocessRequestIdRef = useRef<number>(0);

  // 1. Initialisation audio Web Audio
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((freq: number, durationSec = 0.045, gainVal = 0.35) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.01);
    } catch (_) {}
  }, [getAudioContext]);

  // 2. Initialisation caméra
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('[PhotoBooth] video.play error:', err));
      }
    } catch (err) {
      console.error('[PhotoBooth] Erreur caméra:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cycle de vie de la modale
  useEffect(() => {
    if (isOpen) {
      setBpm(initialBpm || 90);
      setPhase('idle');
      setCurrentStepIdx(0);
      setProcessedFrames([]);
      rawBase64ImagesRef.current = [];
      setIsPlaying(false);
      setSelectedFrameIndex(0);
      setActivePlayheadIndex(0);
      setOverrideMode('global');
      setFrameOverrides({});
      setCordelOptions({
        ...defaultCordelOptions,
        zoom: 120,
        detail: 60,
        shadow: 128,
        brightness: 0,
        threshold: 128,
        sobelContrast: 50,
        isMirror: true,
        isFrame: false,
        posX: 0,
        posY: 0,
      });
      setSignalName(lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre');
      startCamera();
    } else {
      stopCamera();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
      if (reprocessDebounceTimerRef.current) clearTimeout(reprocessDebounceTimerRef.current);
    }

    return () => {
      stopCamera();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
      if (reprocessDebounceTimerRef.current) clearTimeout(reprocessDebounceTimerRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isOpen, initialBpm, lang, startCamera, stopCamera]);

  // Ré-attacher la caméra si phase revient à idle
  useEffect(() => {
    if (isOpen && (phase === 'idle' || phase === 'repositioning' || phase === 'beat_countdown')) {
      if (!streamRef.current) {
        startCamera();
      }
    }
  }, [isOpen, phase, startCamera]);

  // 3. Animation WAAPI du chiffre de temps (Zéro Render Thrashing)
  const pulseBeatNumber = (text: string) => {
    const el = beatNumberElRef.current;
    if (!el) return;
    el.innerText = text;
    try {
      el.animate(
        [
          { transform: 'scale(1.4)', opacity: 1 },
          { transform: 'scale(1)', opacity: 0.85 },
        ],
        { duration: 180, easing: 'ease-out' }
      );
    } catch (_) {}
  };

  // 4. Animation WAAPI du flash blanc
  const triggerFlash = () => {
    const el = flashElRef.current;
    if (!el) return;
    try {
      el.animate(
        [
          { opacity: 0.85 },
          { opacity: 0 },
        ],
        { duration: 220, easing: 'ease-out' }
      );
    } catch (_) {}
  };

  // 5. Capture synchrone en mémoire (< 2 ms)
  const captureCurrentFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const size = Math.min(w, h);
    const sx = (w - size) / 2;
    const sy = (h - size) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 240, 240);
      const b64 = canvas.toDataURL('image/jpeg', 0.6);
      rawBase64ImagesRef.current.push(b64);
    }
  };

  // 6. Séquenceur de prise de vue adapté à la métrique
  const countdownLength = (beatsCount === 5 || beatsCount === 1) ? 4 : beatsCount;

  const runBeatCountdown = useCallback((stepIndex: number) => {
    setPhase('beat_countdown');
    const beatIntervalMs = (60 / bpm) * 1000;
    let beat = 1;

    const doBeat = () => {
      setDisplayedBeat(beat);
      pulseBeatNumber(`${beat}`);

      if (beat < countdownLength) {
        // Bip de pulsation métronome ascendant
        playBeep(600 + (beat - 1) * 150);
        beat++;
        timerRef.current = setTimeout(doBeat, beatIntervalMs);
      } else {
        // Dernier temps : Bip d'impact + flash + capture instantanée
        playBeep(1500, 0.08, 0.45);
        triggerFlash();
        captureCurrentFrame();

        if (stepIndex + 1 < beatsCount) {
          // Passer au geste suivant après un court sas
          timerRef.current = setTimeout(() => {
            setCurrentStepIdx(stepIndex + 1);
            runSasRepositioning(stepIndex + 1);
          }, 350);
        } else {
          // Toutes les trames sont capturées
          timerRef.current = setTimeout(() => {
            stopCamera();
            startCordelProcessing();
          }, 400);
        }
      }
    };

    doBeat();
  }, [bpm, beatsCount, countdownLength, playBeep, stopCamera]);

  const runSasRepositioning = useCallback((stepIndex: number) => {
    setPhase('repositioning');
    let count = 3;
    setSasCountdown(count);
    playBeep(450, 0.03, 0.2);

    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setSasCountdown(count);
        playBeep(450, 0.03, 0.2);
      } else {
        clearInterval(countdownInterval);
        runBeatCountdown(stepIndex);
      }
    }, 1000);

    timerRef.current = countdownInterval;
  }, [playBeep, runBeatCountdown]);

  // Helper d'options effectives : fusionne le global et les éventuels overrides unitaires de la trame
  const getEffectiveOptions = useCallback((
    idx: number,
    baseOpts = cordelOptions,
    overrides = frameOverrides
  ): CordelOptions => ({
    ...baseOpts,
    ...(overrides[idx] || {})
  }), [cordelOptions, frameOverrides]);

  // Options effectives présentées actuellement dans l'inspecteur
  const activeInspectorOptions = overrideMode === 'local'
    ? getEffectiveOptions(selectedFrameIndex)
    : cordelOptions;

  // 7. Traitement initial Cordel en tâche de fond
  const startCordelProcessing = async () => {
    setPhase('processing');
    const rawImages = rawBase64ImagesRef.current;
    const finalFrames: string[] = [];

    for (let i = 0; i < rawImages.length; i++) {
      try {
        const eff = getEffectiveOptions(i);
        const cordelized = await processCordelEffectBase64(rawImages[i], eff, 180);
        finalFrames.push(cordelized);
      } catch (err) {
        console.error('[PhotoBooth] Erreur traitement cordel frame', i, err);
        finalFrames.push(rawImages[i]);
      }
    }

    setProcessedFrames(finalFrames);
    setSelectedFrameIndex(0);
    setActivePlayheadIndex(0);
    setIsPlaying(false); // 🛡️ Démarre figé sur la trame 1 sans stress visuel
    setPhase('review');
  };

  // 8. Réapplication des options Cordel (débrayée locale ou globale avec protection anti-course)
  const applyCordelProcessing = useCallback((
    targetMode: 'global' | 'local',
    targetIdx: number,
    globalOpts: CordelOptions,
    overrides: Record<number, Partial<CordelOptions>>
  ) => {
    const reqId = ++reprocessRequestIdRef.current;
    const rawImages = rawBase64ImagesRef.current;
    if (!rawImages || rawImages.length === 0) return;

    if (reprocessDebounceTimerRef.current) {
      clearTimeout(reprocessDebounceTimerRef.current);
    }

    reprocessDebounceTimerRef.current = setTimeout(async () => {
      setIsReprocessing(true);
      try {
        if (targetMode === 'local') {
          // ⚡ Débrayage local : recalcul ciblé uniquement sur la trame sélectionnée
          if (!rawImages[targetIdx]) return;
          const eff = getEffectiveOptions(targetIdx, globalOpts, overrides);
          const cordelized = await processCordelEffectBase64(rawImages[targetIdx], eff, 180);
          if (reqId !== reprocessRequestIdRef.current) return;
          setProcessedFrames((prev) => {
            const next = [...prev];
            next[targetIdx] = cordelized;
            return next;
          });
        } else {
          // 🔗 Mode global :
          // 1. Recalcul prioritaire immédiat de la trame sélectionnée pour retour visuel à 60 FPS
          const effActive = getEffectiveOptions(targetIdx, globalOpts, overrides);
          const renderedActive = await processCordelEffectBase64(rawImages[targetIdx], effActive, 180);
          if (reqId !== reprocessRequestIdRef.current) return;
          setProcessedFrames((prev) => {
            const next = [...prev];
            next[targetIdx] = renderedActive;
            return next;
          });

          // 2. Recalcul séquentiel hors-blocage des autres trames sans surcharger le Main Thread
          for (let i = 0; i < rawImages.length; i++) {
            if (i === targetIdx) continue;
            if (reqId !== reprocessRequestIdRef.current) return;
            const effOther = getEffectiveOptions(i, globalOpts, overrides);
            const renderedOther = await processCordelEffectBase64(rawImages[i], effOther, 180);
            if (reqId !== reprocessRequestIdRef.current) return;
            setProcessedFrames((prev) => {
              const next = [...prev];
              next[i] = renderedOther;
              return next;
            });
          }
        }
      } catch (err) {
        console.error('[PhotoBooth] Erreur lors du recalcul cordel:', err);
      } finally {
        if (reqId === reprocessRequestIdRef.current) {
          setIsReprocessing(false);
        }
      }
    }, 50);
  }, [getEffectiveOptions]);

  const handleUpdateCordelOptions = (patch: Partial<CordelOptions>) => {
    if (overrideMode === 'local') {
      const updatedOverrides = {
        ...frameOverrides,
        [selectedFrameIndex]: {
          ...(frameOverrides[selectedFrameIndex] || {}),
          ...patch,
        },
      };
      setFrameOverrides(updatedOverrides);
      applyCordelProcessing('local', selectedFrameIndex, cordelOptions, updatedOverrides);
    } else {
      const updatedGlobal = { ...cordelOptions, ...patch };
      setCordelOptions(updatedGlobal);
      applyCordelProcessing('global', selectedFrameIndex, updatedGlobal, frameOverrides);
    }
  };

  const handleUpdateCordelOption = <K extends keyof CordelOptions>(key: K, value: CordelOptions[K]) => {
    handleUpdateCordelOptions({ [key]: value } as any);
  };

  const handleResetLocalOverride = () => {
    const nextOverrides = { ...frameOverrides };
    delete nextOverrides[selectedFrameIndex];
    setFrameOverrides(nextOverrides);
    applyCordelProcessing('local', selectedFrameIndex, cordelOptions, nextOverrides);
  };

  // 9. Boucle de transport animée uniquement lorsque isPlaying === true
  useEffect(() => {
    if (phase === 'review' && isPlaying && processedFrames.length > 0) {
      const intervalMs = (60 / Math.max(30, bpm || 90)) * 1000;
      loopPreviewTimerRef.current = setInterval(() => {
        setActivePlayheadIndex((prev) => (prev + 1) % processedFrames.length);
      }, intervalMs);
      return () => {
        if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
      };
    } else {
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
    }
  }, [phase, isPlaying, processedFrames.length, bpm]);

  // Démarrage séance
  const handleStartSession = () => {
    rawBase64ImagesRef.current = [];
    setCurrentStepIdx(0);
    getAudioContext();
    if (beatsCount === 1) {
      // 🛡️ Mode 1 photo : décompte direct de 4 temps sans sas
      runBeatCountdown(0);
    } else {
      runSasRepositioning(0);
    }
  };

  // Validation et rendu final en fusionnant options globales et débrayages unitaires
  const handleSave = async () => {
    const rawImages = rawBase64ImagesRef.current;
    if (!rawImages || rawImages.length === 0) return;
    setIsReprocessing(true);

    try {
      const finalFrames: string[] = [];
      for (let i = 0; i < rawImages.length; i++) {
        const eff = getEffectiveOptions(i);
        const rendered = await processCordelEffectBase64(rawImages[i], eff, 180);
        finalFrames.push(rendered);
      }

      const finalName = signalName.trim() || (lang === 'fr' ? 'Signal du Mestre' : 'Sinal do Mestre');
      onSave({
        name: finalName,
        image: finalFrames[0],
        frames: finalFrames,
        rawFrames: rawImages,
        cordelOptions,
        frameOverrides: Object.keys(frameOverrides).length > 0 ? frameOverrides : undefined,
        beatsCount,
        mirrorHorizontal: cordelOptions.isMirror,
      });
      onClose();
    } catch (err) {
      console.error('[PhotoBooth] Erreur lors de la sauvegarde:', err);
    } finally {
      setIsReprocessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 z-[300] flex items-center justify-center p-3 select-none font-sans overflow-y-auto">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] cordel-shadow max-w-xl w-full p-4 md:p-6 flex flex-col gap-4 relative animate-fade-in my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Bouton de fermeture */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg font-bold hover:text-[var(--cordel-wood)] transition-colors cursor-pointer w-7 h-7 flex items-center justify-center border border-[var(--cordel-border)]/30 hover:border-[var(--cordel-border)]"
          title={lang === 'fr' ? 'Fermer' : 'Fechar'}
        >
          ✕
        </button>

        {/* Titre */}
        <div className="border-b-2 border-[var(--cordel-border)] pb-2 pr-8">
          <h2 className="font-cactus text-xl md:text-2xl font-bold uppercase tracking-wider text-[var(--cordel-wood)] flex items-center gap-2">
            📸 {lang === 'fr' ? 'Photo-cabine Musicale du Mestre' : 'Cabine de Fotos Musical do Mestre'}
          </h2>
          <p className="text-[10px] md:text-xs opacity-70 font-bold font-cactus uppercase mt-0.5">
            {lang === 'fr'
              ? 'Capturez vos postures synchronisées au métronome et converties en gravure sur bois Cordel'
              : 'Capture suas posturas sincronizadas com o metrônomo e convertidas em xilogravura Cordel'}
          </p>
        </div>

        {/* ZONE CENTRALE : CAMÉRA / DÉCOMPTE / FLASH */}
        {(phase === 'idle' || phase === 'repositioning' || phase === 'beat_countdown') && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-64 h-64 md:w-72 md:h-72 bg-black border-3 border-[var(--cordel-border)] cordel-shadow overflow-hidden flex items-center justify-center">
              
              {/* Vidéo miroir */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: cordelOptions.isMirror ? 'scaleX(-1)' : 'none' }}
                playsInline
                muted
              />

              {/* Bouton bascule miroir à la volée sur la caméra */}
              {phase === 'idle' && (
                <button
                  type="button"
                  onClick={() => handleUpdateCordelOption('isMirror', !cordelOptions.isMirror)}
                  className={`absolute top-2 right-2 z-30 px-2 py-1 text-[10px] font-cactus font-bold uppercase border border-black/40 shadow-[1px_1px_0px_#000] cursor-pointer transition-all ${
                    cordelOptions.isMirror ? 'bg-[var(--cordel-wood)] text-white' : 'bg-white/85 text-black hover:bg-white'
                  }`}
                  title={lang === 'fr' ? 'Bascule miroir' : 'Inverter espelho'}
                >
                  ⇄ {lang === 'fr' ? 'Miroir' : 'Espelho'}
                </button>
              )}

              {/* Flash WAAPI */}
              <div
                ref={flashElRef}
                className="absolute inset-0 bg-white pointer-events-none opacity-0 z-30"
              />

              {/* Repositioning Overlay */}
              {phase === 'repositioning' && (
                <div className="absolute inset-0 bg-black/65 z-20 flex flex-col items-center justify-center p-3 text-center gap-2 animate-fade-in">
                  <div className="bg-amber-500 text-black px-3 py-1 font-cactus font-bold uppercase text-xs tracking-wider border-2 border-black shadow-[2px_2px_0px_#000]">
                    ⏱️ {lang === 'fr' ? `Sas : Temps ${currentStepIdx + 1} / ${beatsCount}` : `Preparação : Tempo ${currentStepIdx + 1} / ${beatsCount}`}
                  </div>
                  <span className="text-white font-cactus text-[11px] font-bold uppercase tracking-wide px-2">
                    {lang === 'fr'
                      ? `Placez votre posture pour le Temps ${currentStepIdx + 1}`
                      : `Posicione sua postura para o Tempo ${currentStepIdx + 1}`}
                  </span>
                  <div className="text-5xl font-cactus font-bold text-amber-300 animate-pulse">
                    {sasCountdown}
                  </div>
                </div>
              )}

              {/* Beat Countdown Overlay */}
              {phase === 'beat_countdown' && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-3 pointer-events-none">
                  <div className="bg-black/80 text-white px-2.5 py-0.5 font-cactus font-bold uppercase text-[10px] tracking-wider border border-white/40">
                    {lang === 'fr' ? `Prise Temps ${currentStepIdx + 1} / ${beatsCount}` : `Captura Tempo ${currentStepIdx + 1} / ${beatsCount}`}
                  </div>

                  {/* Chiffre 1, 2, 3.. animé par WAAPI */}
                  <div
                    ref={beatNumberElRef}
                    className={`font-cactus font-bold text-7xl md:text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] ${
                      displayedBeat === countdownLength ? 'text-red-500 scale-125' : 'text-amber-400'
                    }`}
                  >
                    {displayedBeat}
                  </div>

                  <span className="text-[10px] font-cactus font-bold uppercase bg-black/70 px-2 py-0.5 text-white/90">
                    {displayedBeat === countdownLength
                      ? (lang === 'fr' ? '📸 CAPTURE !' : '📸 CAPTURA !')
                      : (lang === 'fr' ? `Sur le temps ${countdownLength}... (${bpm} BPM)` : `No tempo ${countdownLength}... (${bpm} BPM)`)}
                  </span>
                </div>
              )}

              {/* Grille de centrage en mode idle */}
              {phase === 'idle' && (
                <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3 opacity-40" />
              )}
            </div>

            {/* Barre de progression des trames */}
            <div className="flex gap-2 w-64 md:w-72 justify-center">
              {Array.from({ length: beatsCount }).map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2.5 border border-[var(--cordel-border)] transition-colors ${
                    idx < currentStepIdx
                      ? 'bg-[var(--cordel-wood)]'
                      : idx === currentStepIdx && (phase === 'repositioning' || phase === 'beat_countdown')
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-black/10'
                  }`}
                  title={`Temps ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* PHASE IDLE : CONFIGURATION DYNAMIQUE */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-3">
            {/* Nom du signal */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-cactus font-bold uppercase opacity-80">
                🏷️ {lang === 'fr' ? 'Nom du signal :' : 'Nome do sinal :'}
              </label>
              <input
                type="text"
                value={signalName}
                onChange={(e) => setSignalName(e.target.value)}
                placeholder={lang === 'fr' ? 'Ex: Chamada das Alfaias' : 'Ex: Chamada das Alfaias'}
                className="bg-black/5 border-2 border-[var(--cordel-border)] p-1.5 text-xs font-bold text-[var(--cordel-text)] outline-none focus:bg-white"
              />
            </div>

            {/* Nombre de temps & BPM */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-cactus font-bold uppercase opacity-80">
                  🥁 {lang === 'fr' ? 'Format de capture :' : 'Formato de captura :'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { count: 1, labelFr: '1 photo (Signe fixe)', labelPt: '1 foto (Sinal fixo)' },
                    { count: 4, labelFr: '4 temps (1 mesure)', labelPt: '4 tempos (1 compasso)' },
                    { count: 5, labelFr: '5 temps (Avec impact)', labelPt: '5 tempos (Com impacto)' },
                  ].map((item) => (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setBeatsCount(item.count)}
                      className={`py-2 px-1 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] transition-all cursor-pointer ${
                        beatsCount === item.count
                          ? 'bg-[var(--cordel-wood)] text-white shadow-[2px_2px_0px_#000]'
                          : 'bg-black/5 hover:bg-black/10'
                      }`}
                    >
                      {lang === 'fr' ? item.labelFr : item.labelPt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-cactus font-bold uppercase opacity-80">
                  ⏱️ {lang === 'fr' ? 'Cadence (BPM) :' : 'Cadência (BPM) :'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBpm((b) => Math.max(40, b - 5))}
                    className="w-8 h-8 bg-black/10 border border-[var(--cordel-border)] font-bold text-xs hover:bg-black/20 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-cactus font-bold text-sm bg-black/5 py-1.5 border border-[var(--cordel-border)]/30">
                    {bpm} BPM
                  </span>
                  <button
                    type="button"
                    onClick={() => setBpm((b) => Math.min(240, b + 5))}
                    className="w-8 h-8 bg-black/10 border border-[var(--cordel-border)] font-bold text-xs hover:bg-black/20 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bouton de démarrage */}
            <button
              onClick={handleStartSession}
              className="mt-2 w-full py-3 bg-[var(--cordel-wood)] text-white border-2 border-[var(--cordel-border)] shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer font-cactus font-bold uppercase text-sm tracking-wider flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              🎬 {lang === 'fr' ? `Démarrer la séance (${beatsCount} trames)` : `Iniciar sessão (${beatsCount} quadros)`}
            </button>
          </div>
        )}

        {/* PHASE DE TRAITEMENT CORDEL */}
        {phase === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[var(--cordel-wood)] border-t-transparent rounded-full animate-spin" />
            <h3 className="font-cactus font-bold text-base uppercase tracking-wider text-[var(--cordel-wood)]">
              {lang === 'fr' ? 'Gravure sur bois Cordel en cours...' : 'Gravação em xilogravura Cordel...'}
            </h3>
            <p className="text-xs opacity-70 font-cactus uppercase">
              {lang === 'fr' ? 'Conversion bichrome Sobel & texture gouge...' : 'Conversão bicromática Sobel & textura de goiva...'}
            </p>
          </div>
        )}

        {/* PHASE DE REVUE, CADRAGE & RETOUCHE */}
        {phase === 'review' && (
          <div className="flex flex-col gap-3">
            {/* Saisie du nom en revue */}
            <div className="flex flex-col gap-1 bg-black/5 p-2 border-2 border-[var(--cordel-border)]">
              <label className="text-[10px] font-cactus font-bold uppercase opacity-80">
                🏷️ {lang === 'fr' ? 'Nom du signal :' : 'Nome do sinal :'}
              </label>
              <input
                type="text"
                value={signalName}
                onChange={(e) => setSignalName(e.target.value)}
                placeholder={lang === 'fr' ? 'Ex: Chamada das Alfaias' : 'Ex: Chamada das Alfaias'}
                className="bg-white/80 border border-[var(--cordel-border)] p-1 text-xs font-bold text-[var(--cordel-text)] outline-none focus:bg-white"
              />
            </div>
            
            {/* 1. Planche-contact des trames en bandeau supérieur */}
            <div className="flex flex-col gap-1 bg-black/5 p-2.5 border-2 border-[var(--cordel-border)]">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-cactus font-bold uppercase opacity-80 flex items-center gap-1.5">
                  🎞️ {lang === 'fr' ? 'Planche-contact des trames :' : 'Quadros capturados :'}
                </span>
                <span className="text-[9px] font-cactus opacity-60">
                  {processedFrames.length} {lang === 'fr' ? 'trames' : 'quadros'} ({bpm} BPM)
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                {processedFrames.map((frame, idx) => {
                  const isCurrentSelected = selectedFrameIndex === idx;
                  const isCurrentPlaying = isPlaying && activePlayheadIndex === idx;
                  const hasOverride = Boolean(frameOverrides[idx] && Object.keys(frameOverrides[idx]!).length > 0);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedFrameIndex(idx);
                        setIsPlaying(false);
                      }}
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 aspect-square border-2 cursor-pointer transition-all ${
                        isCurrentSelected
                          ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105 z-10 shadow-[2px_2px_0px_#000]'
                          : isCurrentPlaying
                          ? 'border-[var(--cordel-text)] ring-2 ring-[var(--cordel-text)]/60 scale-100 z-10'
                          : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
                      }`}
                      title={lang === 'fr' ? `Trame T${idx + 1} (Cliquer pour sélectionner et figer)` : `Quadro T${idx + 1}`}
                    >
                      <img src={frame} alt={`T${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/85 text-white text-[8px] text-center font-cactus font-bold">
                        T{idx + 1}
                      </span>
                      {hasOverride && (
                        <span
                          className="absolute top-0.5 right-0.5 bg-[var(--cordel-wood)] text-white text-[8px] font-bold px-1 rounded-xs leading-none shadow-xs"
                          title={lang === 'fr' ? 'Réglages débrayés personnalisés' : 'Configurações personalizadas'}
                        >
                          ⚡
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Zone centrale : Grand lecteur + Barre de transport compacte */}
            {(() => {
              const displayIndex = isPlaying ? activePlayheadIndex : selectedFrameIndex;
              const displayedFrame = processedFrames[displayIndex] || processedFrames[0] || null;
              const hasOverride = Boolean(frameOverrides[displayIndex] && Object.keys(frameOverrides[displayIndex]!).length > 0);

              return (
                <div className="flex flex-col items-center gap-2 bg-black/5 p-3 border-2 border-[var(--cordel-border)]">
                  {/* Cadre de visualisation principal */}
                  <div className="relative w-44 h-44 sm:w-52 sm:h-52 border-3 border-[var(--cordel-border)] bg-black/10 overflow-hidden cordel-shadow flex items-center justify-center">
                    {displayedFrame ? (
                      <img
                        src={displayedFrame}
                        alt="active-preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 border-2 border-[var(--cordel-border)] border-t-transparent rounded-full animate-spin" />
                    )}
                    
                    {/* Témoin d'état en haut à gauche */}
                    <div className="absolute top-1.5 left-1.5 bg-black/85 text-white text-[10px] font-cactus font-bold px-2 py-0.5 flex items-center gap-1.5 border border-white/20">
                      <span>T{displayIndex + 1}</span>
                      {isPlaying ? (
                        <span className="text-emerald-400 text-[8px]">▶ {lang === 'fr' ? 'LECTURE' : 'REPRODUÇÃO'}</span>
                      ) : (
                        <span className="text-amber-300 text-[8px]">⏸ {lang === 'fr' ? 'FIGÉE' : 'FIXA'}</span>
                      )}
                    </div>

                    {/* Pastille Débrayée en haut à droite */}
                    {hasOverride && (
                      <div className="absolute top-1.5 right-1.5 bg-[var(--cordel-wood)] text-white text-[9px] font-cactus font-bold px-1.5 py-0.5 border border-white/30 flex items-center gap-1">
                        <span>⚡ {lang === 'fr' ? 'DÉBRAYÉE' : 'DESACOPLADA'}</span>
                      </div>
                    )}

                    {/* Spinner de retraitement */}
                    {isReprocessing && (
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Barre de transport compacte */}
                  <div className="flex items-center justify-between w-full max-w-sm px-2.5 py-1.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] cordel-shadow-sm">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((p) => !p)}
                      className={`px-3 py-1 font-cactus font-bold uppercase text-xs cordel-border-sm cordel-button cursor-pointer flex items-center gap-1.5 transition-colors ${
                        isPlaying
                          ? 'bg-[var(--cordel-wood)] text-white hover:bg-[#a33220]'
                          : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                      }`}
                    >
                      {isPlaying ? (
                        <><span>⏸</span> <span>{lang === 'fr' ? 'Pause' : 'Pausar'}</span></>
                      ) : (
                        <><span>▶</span> <span>{lang === 'fr' ? 'Lecture' : 'Reproduzir'}</span></>
                      )}
                    </button>

                    <div className="flex items-center gap-2 text-[10px] font-cactus font-bold uppercase">
                      <span className="px-2 py-0.5 bg-black/10 border border-[var(--cordel-border)]/30">
                        ⏱️ {bpm} BPM
                      </span>
                      <span className="px-2 py-0.5 bg-black/10 border border-[var(--cordel-border)]/30">
                        T{displayIndex + 1} / {processedFrames.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Inspecteur : Outils de cadrage & retouche avec bascule de débrayage */}
            <div className="border-2 border-[var(--cordel-border)] p-3 bg-black/5 flex flex-col gap-2.5">
              
              {/* Sélecteur de mode : Global vs Débrayé Local */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--cordel-border)]/20 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setOverrideMode('global')}
                    className={`py-1 px-2.5 font-cactus font-bold text-xs uppercase cordel-border-sm cordel-button cursor-pointer flex items-center gap-1.5 transition-all ${
                      overrideMode === 'global'
                        ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] shadow-[2px_2px_0px_#000]'
                        : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                    }`}
                  >
                    <span>🔗</span>
                    <span>{lang === 'fr' ? 'Appliquer à toutes les images' : 'Aplicar a todas as imagens'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOverrideMode('local');
                      setIsPlaying(false);
                    }}
                    className={`py-1 px-2.5 font-cactus font-bold text-xs uppercase cordel-border-sm cordel-button cursor-pointer flex items-center gap-1.5 transition-all ${
                      overrideMode === 'local'
                        ? 'bg-[var(--cordel-wood)] text-white shadow-[2px_2px_0px_#000]'
                        : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                    }`}
                  >
                    <span>⚡</span>
                    <span>
                      {lang === 'fr'
                        ? `Débrayer cette image (T${selectedFrameIndex + 1})`
                        : `Desacoplar esta imagem (T${selectedFrameIndex + 1})`}
                    </span>
                  </button>
                </div>

                {/* Si mode local actif et override existant : bouton de réinitialisation au global */}
                {overrideMode === 'local' && Boolean(frameOverrides[selectedFrameIndex] && Object.keys(frameOverrides[selectedFrameIndex]!).length > 0) && (
                  <button
                    type="button"
                    onClick={handleResetLocalOverride}
                    className="text-[9.5px] font-cactus uppercase text-[var(--cordel-wood)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>↺</span>
                    <span>{lang === 'fr' ? 'Réinitialiser au global' : 'Redefinir para o global'}</span>
                  </button>
                )}
              </div>

              {/* Curseurs de cadrage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px] font-bold">
                {/* Zoom */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>🔍 {lang === 'fr' ? 'Zoom' : 'Zoom'}</span>
                    <span>{activeInspectorOptions.zoom}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={activeInspectorOptions.zoom}
                    onChange={(e) => handleUpdateCordelOption('zoom', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* Décalage horizontal X */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>↔️ {lang === 'fr' ? 'Décalage X' : 'Deslocamento X'}</span>
                    <span>{activeInspectorOptions.posX}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={activeInspectorOptions.posX}
                    onChange={(e) => handleUpdateCordelOption('posX', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* Décalage vertical Y */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>↕️ {lang === 'fr' ? 'Décalage Y' : 'Deslocamento Y'}</span>
                    <span>{activeInspectorOptions.posY}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={activeInspectorOptions.posY}
                    onChange={(e) => handleUpdateCordelOption('posY', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Curseurs de nettoyage et d'encrage Cordel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px] font-bold pt-1 border-t border-[var(--cordel-border)]/20">
                {/* 1. Luminosité / Exposition (-50 à +50) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>☀️ {lang === 'fr' ? 'Luminosité / Fond' : 'Luminosidade / Fundo'}</span>
                    <span>{(activeInspectorOptions.brightness ?? 0) > 0 ? `+${activeInspectorOptions.brightness}` : (activeInspectorOptions.brightness ?? 0)}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={activeInspectorOptions.brightness ?? 0}
                    onChange={(e) => handleUpdateCordelOption('brightness', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* 2. Seuil d'encrage (20 à 220, défaut 128) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>🌑 {lang === 'fr' ? "Seuil d'encrage" : 'Limiar de Tinta'}</span>
                    <span>{activeInspectorOptions.threshold ?? activeInspectorOptions.shadow ?? 128}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="220"
                    value={activeInspectorOptions.threshold ?? activeInspectorOptions.shadow ?? 128}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handleUpdateCordelOptions({ threshold: val, shadow: val });
                    }}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* 3. Contraste Sobel / Détection des bords (0 à 100 %) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>✍️ {lang === 'fr' ? 'Traits Sobel' : 'Traços Sobel'}</span>
                    <span>{activeInspectorOptions.sobelContrast ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={activeInspectorOptions.sobelContrast ?? 50}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handleUpdateCordelOptions({
                        sobelContrast: val,
                        detail: Math.round((val / 100) * 150),
                      });
                    }}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Détourage automatique du fond */}
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--cordel-border)]/20">
                <div className="flex justify-between items-center text-[10px]">
                  <label className="font-cactus font-bold uppercase tracking-wider">
                    🪄 {lang === 'fr' ? 'Détourage du fond' : 'Recorte de fundo'}
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateCordelOption('bgRemovalMode', 'none')}
                    className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center ${
                      (activeInspectorOptions.bgRemovalMode ?? 'none') === 'none'
                        ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    {lang === 'fr' ? 'Standard' : 'Padrão'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCordelOption('bgRemovalMode', 'green')}
                    className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      activeInspectorOptions.bgRemovalMode === 'green'
                        ? 'bg-emerald-700 text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    <span>🟩</span> {lang === 'fr' ? 'Fond Vert' : 'Verde'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCordelOption('bgRemovalMode', 'white')}
                    className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      activeInspectorOptions.bgRemovalMode === 'white'
                        ? 'bg-stone-600 text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    <span>⬜</span> {lang === 'fr' ? 'Fond Blanc' : 'Branco'}
                  </button>
                </div>

                {/* Curseur conditionnel de tolérance */}
                {(activeInspectorOptions.bgRemovalMode === 'green' || activeInspectorOptions.bgRemovalMode === 'white') && (
                  <div className="flex flex-col gap-1 mt-0.5 bg-black/5 p-1.5 cordel-border-sm">
                    <div className="flex justify-between items-center text-[10px]">
                      <label>🎯 {lang === 'fr' ? 'Tolérance fond' : 'Tolerância fundo'}: {activeInspectorOptions.bgTolerance ?? 40}%</label>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={activeInspectorOptions.bgTolerance ?? 40}
                      onChange={(e) => handleUpdateCordelOption('bgTolerance', parseInt(e.target.value))}
                      className="w-full accent-[var(--cordel-wood)] cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Toggles Miroir & Cadre */}
              <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]/20">
                <button
                  type="button"
                  onClick={() => handleUpdateCordelOption('isMirror', !activeInspectorOptions.isMirror)}
                  className={`flex-1 py-1 px-2 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeInspectorOptions.isMirror
                      ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  ⇄ {lang === 'fr' ? 'Miroir' : 'Espelho'} : {activeInspectorOptions.isMirror ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateCordelOption('isFrame', !activeInspectorOptions.isFrame)}
                  className={`flex-1 py-1 px-2 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeInspectorOptions.isFrame
                      ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  🖼️ {lang === 'fr' ? 'Cadre' : 'Moldura'} : {activeInspectorOptions.isFrame ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
                </button>
              </div>

            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setPhase('idle');
                  rawBase64ImagesRef.current = [];
                  setProcessedFrames([]);
                  startCamera();
                }}
                className="flex-1 py-2 bg-black/10 hover:bg-black/20 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase cursor-pointer"
              >
                🔄 {lang === 'fr' ? 'Recommencer' : 'Recomeçar'}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isReprocessing}
                className="flex-1 py-2 bg-[var(--cordel-wood)] text-white border-2 border-[var(--cordel-border)] shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer font-cactus font-bold text-xs uppercase tracking-wider active:scale-[0.99] transition-all disabled:opacity-50"
              >
                💾 {lang === 'fr' ? `Valider le Signal (${beatsCount} trames)` : `Salvar Sinal (${beatsCount} quadros)`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
