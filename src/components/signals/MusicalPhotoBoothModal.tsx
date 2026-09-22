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
    beatsCount: number;
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
  const [beatsCount, setBeatsCount] = useState<4 | 5>(4);
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [signalName, setSignalName] = useState<string>('');
  
  // Prise de vue en cours
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0); // 0 to beatsCount - 1
  const [sasCountdown, setSasCountdown] = useState<number>(3); // 3, 2, 1
  const [displayedBeat, setDisplayedBeat] = useState<number>(1); // 1, 2, 3, 4

  // Effet Cordel & frames finales
  const [cordelOptions, setCordelOptions] = useState<CordelOptions>({
    ...defaultCordelOptions,
    zoom: 120,
    detail: 60,
    shadow: 130,
    isMirror: true,
  });
  const [processedFrames, setProcessedFrames] = useState<string[]>([]);
  const [activePreviewFrameIdx, setActivePreviewFrameIdx] = useState<number>(0);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);

  // Références matérielles & DOM
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashElRef = useRef<HTMLDivElement | null>(null);
  const beatNumberElRef = useRef<HTMLDivElement | null>(null);
  const rawCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Timers
  const timerRef = useRef<any>(null);
  const loopPreviewTimerRef = useRef<any>(null);

  // 1. Initialisation audio
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
      rawCanvasesRef.current = [];
      setSignalName(lang === 'fr' ? 'Geste du Mestre' : 'Gesto do Mestre');
      startCamera();
    } else {
      stopCamera();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
    }

    return () => {
      stopCamera();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
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
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 200, 200);
      rawCanvasesRef.current.push(canvas);
    }
  };

  // 6. Séquenceur de prise de vue
  const runBeatCountdown = useCallback((stepIndex: number) => {
    setPhase('beat_countdown');
    const beatIntervalMs = (60 / bpm) * 1000;
    let beat = 1;

    const doBeat = () => {
      setDisplayedBeat(beat);
      pulseBeatNumber(`${beat}`);

      if (beat === 1) playBeep(600);
      else if (beat === 2) playBeep(800);
      else if (beat === 3) playBeep(1000);
      else if (beat === 4) {
        // Temps 4 : bip impact + flash + capture
        playBeep(1500, 0.08, 0.45);
        triggerFlash();
        captureCurrentFrame();

        // Fin de ce geste
        if (stepIndex + 1 < beatsCount) {
          // Passer au geste suivant après un court répit
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
        return;
      }

      beat++;
      timerRef.current = setTimeout(doBeat, beatIntervalMs);
    };

    doBeat();
  }, [bpm, beatsCount, playBeep, stopCamera]);

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

  // 7. Traitement Cordel en tâche de fond
  const startCordelProcessing = async () => {
    setPhase('processing');
    const canvases = rawCanvasesRef.current;
    const finalFrames: string[] = [];

    for (let i = 0; i < canvases.length; i++) {
      const rawBase64 = canvases[i].toDataURL('image/jpeg', 0.8);
      try {
        const cordelized = await processCordelEffectBase64(rawBase64, cordelOptions, 180);
        finalFrames.push(cordelized);
      } catch (err) {
        console.error('[PhotoBooth] Erreur traitement cordel frame', i, err);
        finalFrames.push(rawBase64);
      }
    }

    setProcessedFrames(finalFrames);
    setPhase('review');
  };

  // 8. Réapplication des options Cordel sur la revue
  const handleReapplyCordel = async (newOpts: CordelOptions) => {
    setCordelOptions(newOpts);
    setIsReprocessing(true);
    const canvases = rawCanvasesRef.current;
    const finalFrames: string[] = [];

    for (let i = 0; i < canvases.length; i++) {
      const rawBase64 = canvases[i].toDataURL('image/jpeg', 0.8);
      try {
        const cordelized = await processCordelEffectBase64(rawBase64, newOpts, 180);
        finalFrames.push(cordelized);
      } catch (err) {
        console.error('[PhotoBooth] Erreur retraitement cordel frame', i, err);
        finalFrames.push(rawBase64);
      }
    }

    setProcessedFrames(finalFrames);
    setIsReprocessing(false);
  };

  // 9. Boucle d'animation de prévisualisation vivante au tempo
  useEffect(() => {
    if (phase === 'review' && processedFrames.length > 0) {
      const intervalMs = (60 / bpm) * 1000;
      loopPreviewTimerRef.current = setInterval(() => {
        setActivePreviewFrameIdx((prev) => (prev + 1) % processedFrames.length);
      }, intervalMs);
      return () => {
        if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
      };
    }
  }, [phase, processedFrames, bpm]);

  // Démarrage séance
  const handleStartSession = () => {
    rawCanvasesRef.current = [];
    setCurrentStepIdx(0);
    getAudioContext(); // Déverrouille l'audio sur interaction
    runSasRepositioning(0);
  };

  // Validation finale
  const handleSave = () => {
    if (processedFrames.length === 0) return;
    const finalName = signalName.trim() || (lang === 'fr' ? 'Signal du Mestre' : 'Sinal do Mestre');
    onSave({
      name: finalName,
      image: processedFrames[0],
      frames: processedFrames,
      beatsCount,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 z-[300] flex items-center justify-center p-3 select-none font-sans overflow-y-auto">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] cordel-shadow max-w-xl w-full p-4 md:p-6 flex flex-col gap-4 relative animate-fade-in my-auto">
        
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
              ? 'Capturez 4 ou 5 postures synchronisées sur le métronome et transformées en xylogravure Cordel'
              : 'Capture 4 ou 5 posturas sincronizadas com o metrônomo e transformadas em xilogravura Cordel'}
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
                style={{ transform: 'scaleX(-1)' }}
                playsInline
                muted
              />

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
                      ? `Placez votre geste pour le Temps ${currentStepIdx + 1}`
                      : `Posicione seu gesto para o Tempo ${currentStepIdx + 1}`}
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

                  {/* Chiffre 1, 2, 3, 4 animé par WAAPI */}
                  <div
                    ref={beatNumberElRef}
                    className={`font-cactus font-bold text-7xl md:text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] ${
                      displayedBeat === 4 ? 'text-red-500 scale-125' : 'text-amber-400'
                    }`}
                  >
                    {displayedBeat}
                  </div>

                  <span className="text-[10px] font-cactus font-bold uppercase bg-black/70 px-2 py-0.5 text-white/90">
                    {displayedBeat === 4
                      ? (lang === 'fr' ? '📸 CAPTURE !' : '📸 CAPTURA !')
                      : (lang === 'fr' ? `Sur le temps 4... (${bpm} BPM)` : `No tempo 4... (${bpm} BPM)`)}
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

        {/* PHASE IDLE : CONFIGURATION */}
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
                placeholder={lang === 'fr' ? 'Ex: Chamada da Alfaias' : 'Ex: Chamada das Alfaias'}
                className="bg-black/5 border-2 border-[var(--cordel-border)] p-1.5 text-xs font-bold text-[var(--cordel-text)] outline-none focus:bg-white"
              />
            </div>

            {/* Nombre de temps & BPM */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-cactus font-bold uppercase opacity-80">
                  🥁 {lang === 'fr' ? 'Formule de pas :' : 'Fórmula de passos :'}
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setBeatsCount(4)}
                    className={`flex-1 py-1.5 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] ${
                      beatsCount === 4 ? 'bg-[var(--cordel-wood)] text-white' : 'bg-black/5'
                    }`}
                  >
                    4 {lang === 'fr' ? 'Temps' : 'Tempos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBeatsCount(5)}
                    className={`flex-1 py-1.5 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] ${
                      beatsCount === 5 ? 'bg-[var(--cordel-wood)] text-white' : 'bg-black/5'
                    }`}
                  >
                    5 {lang === 'fr' ? 'Temps (+1)' : 'Tempos (+1)'}
                  </button>
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
                    className="w-7 h-7 bg-black/10 border border-[var(--cordel-border)] font-bold text-xs hover:bg-black/20"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-cactus font-bold text-sm bg-black/5 py-1 border border-[var(--cordel-border)]/30">
                    {bpm} BPM
                  </span>
                  <button
                    type="button"
                    onClick={() => setBpm((b) => Math.min(240, b + 5))}
                    className="w-7 h-7 bg-black/10 border border-[var(--cordel-border)] font-bold text-xs hover:bg-black/20"
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
              🎬 {lang === 'fr' ? 'Démarrer la séance de pose' : 'Iniciar sessão de fotos'}
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

        {/* PHASE DE REVUE & PLANCHE-CONTACT */}
        {phase === 'review' && (
          <div className="flex flex-col gap-4">
            
            {/* Lecteur vivant au tempo + Planche contact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              
              {/* Animation vivante */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-cactus font-bold uppercase opacity-75">
                  🔄 {lang === 'fr' ? 'Animation vivante (BPM)' : 'Animação viva (BPM)'}
                </span>
                <div className="relative w-36 h-36 border-3 border-[var(--cordel-border)] bg-black/10 overflow-hidden cordel-shadow">
                  {processedFrames[activePreviewFrameIdx] && (
                    <img
                      src={processedFrames[activePreviewFrameIdx]}
                      alt="animation-preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-cactus font-bold px-1.5 py-0.5">
                    T{activePreviewFrameIdx + 1}
                  </div>
                </div>
              </div>

              {/* Planche-contact des trames */}
              <div className="md:col-span-2 flex flex-col gap-1">
                <span className="text-[10px] font-cactus font-bold uppercase opacity-75">
                  🎞️ {lang === 'fr' ? 'Planche-contact des trames :' : 'Pranchas de contato :'}
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {processedFrames.map((frame, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePreviewFrameIdx(idx)}
                      className={`relative aspect-square border-2 cursor-pointer transition-all ${
                        activePreviewFrameIdx === idx
                          ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105 z-10'
                          : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={frame} alt={`T${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[8px] text-center font-cactus font-bold">
                        T{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Curseurs de réglage rapide Cordel */}
            <div className="border border-[var(--cordel-border)]/30 p-2.5 bg-black/5 flex flex-col gap-2">
              <span className="font-cactus font-bold uppercase text-[10px] tracking-wider">
                🎨 {lang === 'fr' ? 'Ajustement de la gravure :' : 'Ajuste da gravura :'}
              </span>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>✍️ {lang === 'fr' ? 'Lignes' : 'Linhas'}</span>
                    <span>{cordelOptions.detail}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    value={cordelOptions.detail}
                    onChange={(e) =>
                      handleReapplyCordel({ ...cordelOptions, detail: parseInt(e.target.value) })
                    }
                    className="accent-[var(--cordel-text)] cursor-pointer"
                    disabled={isReprocessing}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>🌑 {lang === 'fr' ? 'Encre' : 'Tinta'}</span>
                    <span>{cordelOptions.shadow}</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="190"
                    value={cordelOptions.shadow}
                    onChange={(e) =>
                      handleReapplyCordel({ ...cordelOptions, shadow: parseInt(e.target.value) })
                    }
                    className="accent-[var(--cordel-text)] cursor-pointer"
                    disabled={isReprocessing}
                  />
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setPhase('idle');
                  rawCanvasesRef.current = [];
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
                💾 {lang === 'fr' ? 'Valider le Signal' : 'Salvar Sinal'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
