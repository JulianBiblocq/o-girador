import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../utils/cordelEffect';

export interface CordelImageEditorProps {
  frames: string[];
  lang: string;
  bpm?: number;
  onComplete: (
    resultBase64: string,
    allFrames?: string[],
    cordelOptions?: CordelOptions,
    frameOverrides?: Record<number, Partial<CordelOptions>>
  ) => void;
  onCancel: () => void;
}

export const CordelImageEditor: React.FC<CordelImageEditorProps> = ({
  frames,
  lang,
  bpm = 90,
  onComplete,
  onCancel,
}) => {
  const [options, setOptions] = useState<CordelOptions>(defaultCordelOptions);
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 🎛️ États de transport & débrayage unitaire
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // Défaut false : vue figée
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [activePlayheadIndex, setActivePlayheadIndex] = useState<number>(0);
  const [overrideMode, setOverrideMode] = useState<'global' | 'local'>('global');
  const [frameOverrides, setFrameOverrides] = useState<Record<number, Partial<CordelOptions>>>({});

  // Références anti-course et timers
  const reprocessRequestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loopPreviewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper d'options effectives : fusionne le global et les éventuels overrides unitaires de la trame
  const getEffectiveOptions = useCallback(
    (
      idx: number,
      baseOpts = options,
      overrides = frameOverrides
    ): CordelOptions => ({
      ...baseOpts,
      ...(overrides[idx] || {}),
    }),
    [options, frameOverrides]
  );

  // Options effectives présentées actuellement dans l'inspecteur
  const activeInspectorOptions =
    overrideMode === 'local' ? getEffectiveOptions(selectedFrameIndex) : options;

  // 1. Initialisation des aperçus à la réception des trames
  useEffect(() => {
    let active = true;
    const initProcessing = async () => {
      if (!frames || frames.length === 0) return;
      setIsProcessing(true);
      try {
        const rendered: string[] = [];
        for (let i = 0; i < frames.length; i++) {
          const eff = getEffectiveOptions(i, options, frameOverrides);
          const base64 = await processCordelEffectBase64(frames[i], eff, 200);
          rendered.push(base64);
        }
        if (active) {
          setPreviewFrames(rendered);
          setSelectedFrameIndex(0);
          setActivePlayheadIndex(0);
        }
      } catch (err) {
        console.error('[CordelImageEditor] Erreur traitement initial:', err);
      } finally {
        if (active) setIsProcessing(false);
      }
    };

    initProcessing();

    return () => {
      active = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
    };
  }, [frames]);

  // 2. Réapplication des options Cordel (débrayée locale ou globale avec protection anti-course)
  const applyCordelProcessing = useCallback(
    (
      targetMode: 'global' | 'local',
      targetIdx: number,
      globalOpts: CordelOptions,
      overrides: Record<number, Partial<CordelOptions>>
    ) => {
      const reqId = ++reprocessRequestIdRef.current;
      if (!frames || frames.length === 0) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        setIsProcessing(true);
        try {
          if (targetMode === 'local') {
            // ⚡ Débrayage local : recalcul ciblé uniquement sur la trame sélectionnée
            if (!frames[targetIdx]) return;
            const eff = getEffectiveOptions(targetIdx, globalOpts, overrides);
            const cordelized = await processCordelEffectBase64(frames[targetIdx], eff, 200);
            if (reqId !== reprocessRequestIdRef.current) return;
            setPreviewFrames((prev) => {
              const next = [...prev];
              next[targetIdx] = cordelized;
              return next;
            });
          } else {
            // 🔗 Mode global :
            // 1. Recalcul prioritaire immédiat de la trame sélectionnée pour un retour visuel fluide
            const effActive = getEffectiveOptions(targetIdx, globalOpts, overrides);
            const renderedActive = await processCordelEffectBase64(frames[targetIdx], effActive, 200);
            if (reqId !== reprocessRequestIdRef.current) return;
            setPreviewFrames((prev) => {
              const next = [...prev];
              next[targetIdx] = renderedActive;
              return next;
            });

            // 2. Recalcul séquentiel hors-blocage des autres trames sans surcharger le Main Thread
            for (let i = 0; i < frames.length; i++) {
              if (i === targetIdx) continue;
              if (reqId !== reprocessRequestIdRef.current) return;
              const effOther = getEffectiveOptions(i, globalOpts, overrides);
              const renderedOther = await processCordelEffectBase64(frames[i], effOther, 200);
              if (reqId !== reprocessRequestIdRef.current) return;
              setPreviewFrames((prev) => {
                const next = [...prev];
                next[i] = renderedOther;
                return next;
              });
            }
          }
        } catch (err) {
          console.error('[CordelImageEditor] Erreur lors du recalcul cordel:', err);
        } finally {
          if (reqId === reprocessRequestIdRef.current) {
            setIsProcessing(false);
          }
        }
      }, 50);
    },
    [frames, getEffectiveOptions]
  );

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
      applyCordelProcessing('local', selectedFrameIndex, options, updatedOverrides);
    } else {
      const updatedGlobal = { ...options, ...patch };
      setOptions(updatedGlobal);
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
    applyCordelProcessing('local', selectedFrameIndex, options, nextOverrides);
  };

  // 3. Boucle de transport animée uniquement lorsque isPlaying === true
  useEffect(() => {
    if (isPlaying && previewFrames.length > 1) {
      const intervalMs = (60 / Math.max(30, bpm || 90)) * 1000;
      loopPreviewTimerRef.current = setInterval(() => {
        setActivePlayheadIndex((prev) => (prev + 1) % previewFrames.length);
      }, intervalMs);
      return () => {
        if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
      };
    } else {
      if (loopPreviewTimerRef.current) clearInterval(loopPreviewTimerRef.current);
    }
  }, [isPlaying, previewFrames.length, bpm]);

  // 4. Rendu final et sauvegarde
  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const finalFrames: string[] = [];
      for (let i = 0; i < frames.length; i++) {
        const eff = getEffectiveOptions(i);
        const finalImg = await processCordelEffectBase64(frames[i], eff, 200);
        finalFrames.push(finalImg);
      }
      onComplete(finalFrames[0], finalFrames, options, frameOverrides);
    } catch (err) {
      console.error('[CordelImageEditor] Erreur lors de la validation:', err);
      setIsProcessing(false);
    }
  };

  const isMultiFrame = frames.length > 1;
  const displayIndex = isPlaying ? activePlayheadIndex : selectedFrameIndex;
  const currentPreview = previewFrames[displayIndex] || previewFrames[0] || null;
  const currentHasOverride = Boolean(
    frameOverrides[displayIndex] && Object.keys(frameOverrides[displayIndex]!).length > 0
  );

  return (
    <div className="flex flex-col gap-2 p-2 bg-[var(--cordel-bg)] cordel-border-sm text-[var(--cordel-text)] font-sans text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="font-cactus font-bold uppercase tracking-wider text-[11px]">
          {lang === 'fr' ? 'Éditeur Xylogravure Cordel' : 'Editor Xilogravura Cordel'}
        </span>
        {isMultiFrame && (
          <span className="text-[9px] font-cactus opacity-70">
            {frames.length} {lang === 'fr' ? 'trames' : 'quadros'} ({bpm} BPM)
          </span>
        )}
      </div>

      {/* Planche-contact supérieure si multi-trames */}
      {isMultiFrame && (
        <div className="flex flex-col gap-1 bg-black/5 p-2 cordel-border-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
            {previewFrames.map((frame, idx) => {
              const isCurrentSelected = selectedFrameIndex === idx;
              const isCurrentPlaying = isPlaying && activePlayheadIndex === idx;
              const hasOverride = Boolean(
                frameOverrides[idx] && Object.keys(frameOverrides[idx]!).length > 0
              );

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedFrameIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`relative w-11 h-11 shrink-0 aspect-square border cursor-pointer transition-all ${
                    isCurrentSelected
                      ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105 z-10 shadow-[1px_1px_0px_#000]'
                      : isCurrentPlaying
                      ? 'border-[var(--cordel-text)] ring-2 ring-[var(--cordel-text)]/60 scale-100 z-10'
                      : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
                  }`}
                  title={lang === 'fr' ? `Trame T${idx + 1}` : `Quadro T${idx + 1}`}
                >
                  <img src={frame} alt={`T${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-white text-[7px] text-center font-cactus font-bold leading-tight">
                    T{idx + 1}
                  </span>
                  {hasOverride && (
                    <span
                      className="absolute top-0 right-0 bg-[var(--cordel-wood)] text-white text-[7px] font-bold px-0.5 leading-none shadow-xs"
                      title={lang === 'fr' ? 'Réglages débrayés' : 'Configurações desacopladas'}
                    >
                      ⚡
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grand lecteur de prévisualisation */}
      <div className="relative aspect-square w-full bg-black/10 cordel-border-sm overflow-hidden flex items-center justify-center">
        {currentPreview ? (
          <img src={currentPreview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-6 h-6 border-2 border-[var(--cordel-text)] border-t-transparent rounded-full animate-spin" />
        )}

        {/* Témoin d'état */}
        {isMultiFrame && (
          <div className="absolute top-1.5 left-1.5 bg-black/85 text-white text-[9px] font-cactus font-bold px-1.5 py-0.5 flex items-center gap-1 border border-white/20">
            <span>T{displayIndex + 1}</span>
            {isPlaying ? (
              <span className="text-emerald-400 text-[8px]">▶ {lang === 'fr' ? 'LECTURE' : 'REPRODUÇÃO'}</span>
            ) : (
              <span className="text-amber-300 text-[8px]">⏸ {lang === 'fr' ? 'FIGÉE' : 'FIXA'}</span>
            )}
          </div>
        )}

        {/* Témoin débrayé */}
        {currentHasOverride && (
          <div className="absolute top-1.5 right-1.5 bg-[var(--cordel-wood)] text-white text-[8px] font-cactus font-bold px-1.5 py-0.5 border border-white/30 flex items-center gap-1">
            <span>⚡ {lang === 'fr' ? 'DÉBRAYÉE' : 'DESACOPLADA'}</span>
          </div>
        )}

        {/* Spinner de traitement */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-10">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] font-cactus font-bold uppercase tracking-wider">
              {lang === 'fr' ? 'Traitement...' : 'Processando...'}
            </span>
          </div>
        )}
      </div>

      {/* Barre de transport compacte (si multi-trames) */}
      {isMultiFrame && (
        <div className="flex items-center justify-between px-2 py-1 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] cordel-shadow-sm text-[10px]">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-2.5 py-0.5 font-cactus font-bold uppercase cordel-border-sm cursor-pointer flex items-center gap-1 transition-colors ${
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

          <div className="flex items-center gap-1.5 text-[9px] font-cactus font-bold uppercase">
            <span className="px-1.5 py-0.5 bg-black/5 border border-[var(--cordel-border)]/30">
              ⏱️ {bpm} BPM
            </span>
            <span className="px-1.5 py-0.5 bg-black/5 border border-[var(--cordel-border)]/30">
              T{displayIndex + 1} / {frames.length}
            </span>
          </div>
        </div>
      )}

      {/* Inspecteur des paramètres Cordel */}
      <div className="flex flex-col gap-2 mt-1 font-bold">
        {/* Sélecteur de mode Global vs Débrayé (si multi-trames) */}
        {isMultiFrame && (
          <div className="flex justify-between items-center gap-1 border-b border-[var(--cordel-border)]/20 pb-1.5 pt-0.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOverrideMode('global')}
                className={`py-0.5 px-2 font-cactus font-bold text-[9px] uppercase cordel-border-sm cursor-pointer flex items-center gap-1 transition-all ${
                  overrideMode === 'global'
                    ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] shadow-[1px_1px_0px_#000]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                }`}
              >
                <span>🔗</span>
                <span>{lang === 'fr' ? 'Toutes' : 'Todas'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOverrideMode('local');
                  setIsPlaying(false);
                }}
                className={`py-0.5 px-2 font-cactus font-bold text-[9px] uppercase cordel-border-sm cursor-pointer flex items-center gap-1 transition-all ${
                  overrideMode === 'local'
                    ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'
                }`}
              >
                <span>⚡</span>
                <span>{lang === 'fr' ? `Débrayer T${selectedFrameIndex + 1}` : `Desacoplar T${selectedFrameIndex + 1}`}</span>
              </button>
            </div>

            {overrideMode === 'local' && Boolean(frameOverrides[selectedFrameIndex] && Object.keys(frameOverrides[selectedFrameIndex]!).length > 0) && (
              <button
                type="button"
                onClick={handleResetLocalOverride}
                className="text-[8.5px] font-cactus uppercase text-[var(--cordel-wood)] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>↺</span>
                <span>{lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}</span>
              </button>
            )}
          </div>
        )}

        {/* Sliders de Zoom & Position */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>🔍 {lang === 'fr' ? 'Zoom' : 'Zoom'}: {activeInspectorOptions.zoom}%</label>
          </div>
          <input
            type="range"
            min="50"
            max="180"
            value={activeInspectorOptions.zoom}
            onChange={(e) => handleUpdateCordelOption('zoom', parseInt(e.target.value))}
            className="w-full accent-[var(--cordel-text)] cursor-pointer"
          />
        </div>

        {/* Position X / Y */}
        <div className="flex gap-2 items-center text-[10px]">
          <div className="flex items-center flex-1 gap-1">
            <span>↔️</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={activeInspectorOptions.posX}
              onChange={(e) => handleUpdateCordelOption('posX', parseInt(e.target.value))}
              className="w-full accent-[var(--cordel-text)] cursor-pointer m-0"
            />
          </div>
          <div className="flex items-center flex-1 gap-1">
            <span>↕️</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={activeInspectorOptions.posY}
              onChange={(e) => handleUpdateCordelOption('posY', parseInt(e.target.value))}
              className="w-full accent-[var(--cordel-text)] cursor-pointer m-0"
            />
          </div>
        </div>

        {/* 1. Luminosité / Exposition (-50 à +50) */}
        <div className="flex flex-col gap-1 border-t border-[var(--cordel-border)]/20 pt-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <label>
              ☀️ {lang === 'fr' ? 'Luminosité / Fond' : 'Luminosidade / Fundo'}:{' '}
              {(activeInspectorOptions.brightness ?? 0) > 0 ? `+${activeInspectorOptions.brightness}` : activeInspectorOptions.brightness ?? 0}
            </label>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={activeInspectorOptions.brightness ?? 0}
            onChange={(e) => handleUpdateCordelOption('brightness', parseInt(e.target.value))}
            className="w-full accent-[var(--cordel-text)] cursor-pointer"
          />
        </div>

        {/* 2. Seuil d'encrage / Threshold (20 à 220, défaut 128) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>
              🌑 {lang === 'fr' ? "Seuil d'encrage" : 'Limiar de Tinta'}:{' '}
              {activeInspectorOptions.threshold ?? activeInspectorOptions.shadow ?? 128}
            </label>
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
            className="w-full accent-[var(--cordel-text)] cursor-pointer"
          />
        </div>

        {/* 3. Contraste Sobel / Détection des bords (0 à 100 %) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>
              ✍️ {lang === 'fr' ? 'Contraste Sobel (bords)' : 'Contraste Sobel (bordas)'}:{' '}
              {activeInspectorOptions.sobelContrast ?? 50}%
            </label>
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
            className="w-full accent-[var(--cordel-text)] cursor-pointer"
          />
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
                <label>
                  🎯 {lang === 'fr' ? 'Tolérance fond' : 'Tolerância fundo'}: {activeInspectorOptions.bgTolerance ?? 40}%
                </label>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={activeInspectorOptions.bgTolerance ?? 40}
                onChange={(e) => handleUpdateCordelOption('bgTolerance', parseInt(e.target.value))}
                className="w-full accent-[var(--cordel-text)] cursor-pointer"
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
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApply}
          disabled={isProcessing}
          className={`flex-1 py-1.5 bg-black text-white cordel-border-sm text-[10px] font-bold uppercase tracking-wider font-cactus ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800 cursor-pointer'
          }`}
        >
          {lang === 'fr' ? (isMultiFrame ? `Valider (${frames.length} trames)` : 'Valider') : isMultiFrame ? `Aplicar (${frames.length} quadros)` : 'Aplicar'}
        </button>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className={`flex-1 py-1.5 bg-gray-300 text-black cordel-border-sm text-[10px] font-bold uppercase tracking-wider font-cactus ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-85 cursor-pointer'
          }`}
        >
          {lang === 'fr' ? 'Annuler' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
};
