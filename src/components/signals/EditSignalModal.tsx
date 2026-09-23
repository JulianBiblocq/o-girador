/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CloudRhythmSignal, RhythmSignal } from '../../types';
import {
  CordelOptions,
  defaultCordelOptions,
  processCordelEffectBase64,
} from '../../utils/cordelEffect';

export interface EditSignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: (CloudRhythmSignal | RhythmSignal) | null;
  onSave: (updated: {
    id: string;
    name: string;
    image?: string;
    frames?: string[];
    rawFrames?: string[];
    cordelOptions?: CordelOptions;
    beatsCount?: number;
    mirrorHorizontal?: boolean;
  }) => Promise<void> | void;
  onRetakePhoto?: (targetSignal: CloudRhythmSignal | RhythmSignal) => void;
  lang: 'fr' | 'pt';
  bpm?: number;
}

export const EditSignalModal: React.FC<EditSignalModalProps> = ({
  isOpen,
  onClose,
  signal,
  onSave,
  onRetakePhoto,
  lang,
  bpm = 90,
}) => {
  const [name, setName] = useState('');
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Options Cordel actives pour l'édition
  const [options, setOptions] = useState<CordelOptions>(defaultCordelOptions);
  const [reprocessedFrames, setReprocessedFrames] = useState<string[]>([]);
  const [activePreviewFrame, setActivePreviewFrame] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);
  const loopPreviewTimerRef = useRef<any>(null);

  useEffect(() => {
    if (signal && isOpen) {
      setName(signal.name || '');
      setActiveFrameIdx(0);
      setImgError(false);

      const initialOptions: CordelOptions = signal.cordelOptions
        ? { ...signal.cordelOptions }
        : {
            ...defaultCordelOptions,
            isMirror: signal.mirrorHorizontal ?? defaultCordelOptions.isMirror,
          };
      setOptions(initialOptions);

      const initialFrames = signal.frames ? [...signal.frames] : [];
      setReprocessedFrames(initialFrames);
      setActivePreviewFrame(initialFrames[0] || signal.image || null);
    }
  }, [signal, isOpen]);

  const rawFrames = signal?.rawFrames;
  const hasRawFrames = !!(rawFrames && rawFrames.length > 0);
  const isSinglePhoto = (signal?.beatsCount === 1) || (!rawFrames || rawFrames.length <= 1);

  // 1. Optimisation 60 FPS : recalcul en temps réel uniquement sur la trame activement visualisée
  useEffect(() => {
    if (!isOpen || !hasRawFrames || !rawFrames || !rawFrames[activeFrameIdx]) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsReprocessing(true);
      try {
        const rendered = await processCordelEffectBase64(rawFrames[activeFrameIdx], options, 180);
        setActivePreviewFrame(rendered);
        setReprocessedFrames((prev) => {
          const next = [...prev];
          next[activeFrameIdx] = rendered;
          return next;
        });
      } catch (err) {
        console.error('[EditSignalModal] Erreur recalcul trame', err);
      } finally {
        setIsReprocessing(false);
      }
    }, 50);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [options, activeFrameIdx, hasRawFrames, isOpen]);

  if (!isOpen || !signal) return null;

  const resolvedImage = activePreviewFrame
    || (reprocessedFrames.length > 0 ? reprocessedFrames[activeFrameIdx] : null)
    || (signal.frames && signal.frames[activeFrameIdx])
    || signal.image
    || (signal as any).imageUrl
    || '';

  const hasValidBase64 = resolvedImage && resolvedImage.startsWith('data:');
  const showSealFallback = imgError || (!hasValidBase64 && !resolvedImage);

  // Initiales du nom pour le sceau Cordel textuel
  const initials = signal.name
    ? signal.name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'SG';

  const handleOptionsChange = (patch: Partial<CordelOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }));
  };

  const handleOptionChange = <K extends keyof CordelOptions>(key: K, value: CordelOptions[K]) => {
    handleOptionsChange({ [key]: value } as any);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let finalFrames = reprocessedFrames;

      // Si le signal possède des rawFrames, calculer l'ensemble des trames avant d'enregistrer
      if (hasRawFrames && rawFrames) {
        const fullList: string[] = [];
        for (let i = 0; i < rawFrames.length; i++) {
          if (i === activeFrameIdx && activePreviewFrame) {
            fullList.push(activePreviewFrame);
          } else {
            const r = await processCordelEffectBase64(rawFrames[i], options, 180);
            fullList.push(r);
          }
        }
        finalFrames = fullList;
      }

      await onSave({
        id: signal.id,
        name: name.trim(),
        image: finalFrames[0] || signal.image,
        frames: finalFrames.length > 0 ? finalFrames : signal.frames,
        rawFrames: signal.rawFrames,
        cordelOptions: options,
        beatsCount: signal.beatsCount,
        mirrorHorizontal: options.isMirror,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    if (onRetakePhoto) {
      onRetakePhoto(signal);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[310] flex items-center justify-center p-3 select-none font-sans overflow-y-auto">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] cordel-shadow max-w-xl w-full p-4 md:p-6 flex flex-col gap-4 relative animate-fade-in my-auto max-h-[92vh] overflow-y-auto">
        
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
            ✏️ {lang === 'fr' ? 'Édition du Signe du Mestre' : 'Editar Sinal do Mestre'}
          </h2>
          <p className="text-[10px] opacity-70 font-bold font-cactus uppercase mt-0.5">
            {hasRawFrames
              ? (lang === 'fr'
                  ? 'Ajustez le nom et l’ensemble des réglages de gravure Cordel'
                  : 'Ajuste o nome e todas as configurações de gravura Cordel')
              : (lang === 'fr'
                  ? 'Modifiez le nom ou reprenez la prise de vue synchronisée'
                  : 'Altere o nome ou capture novamente a postura')}
          </p>
        </div>

        {/* Formulaire de modification */}
        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          
          {/* Champ Nom */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-cactus font-bold uppercase opacity-80">
              🏷️ {lang === 'fr' ? 'Nom du signal :' : 'Nome do sinal :'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'fr' ? 'Nom du geste...' : 'Nome do gesto...'}
              className="bg-black/5 border-2 border-[var(--cordel-border)] p-2 text-xs md:text-sm font-bold text-[var(--cordel-text)] outline-none focus:bg-white"
              autoFocus
              required
            />
          </div>

          {/* Prévisualisation visuelle */}
          <div className="flex flex-col items-center gap-2 bg-black/5 p-3 border border-[var(--cordel-border)]/30">
            <div className="flex justify-between items-center w-full">
              <span className="text-[10px] font-cactus font-bold uppercase opacity-75">
                🖼️ {lang === 'fr' ? 'Aperçu actuel :' : 'Visualização atual :'}
              </span>
              <span className="text-[9px] font-cactus opacity-60">
                {isSinglePhoto
                  ? (lang === 'fr' ? '1 photo fixe' : '1 foto fixa')
                  : `${rawFrames?.length || signal.frames?.length || 1} trames (BPM: ${bpm})`}
              </span>
            </div>

            <div className="relative w-32 h-32 md:w-36 md:h-36 border-3 border-[var(--cordel-border)] bg-black/10 overflow-hidden cordel-shadow flex items-center justify-center">
              {!showSealFallback ? (
                <img
                  src={resolvedImage}
                  alt={signal.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#f4ecd8] flex flex-col items-center justify-center p-2 text-center border-2 border-dashed border-[#1a1a1a]/40">
                  <div className="w-12 h-12 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center font-cactus font-bold text-xl text-[var(--cordel-wood)] mb-1 bg-black/5">
                    {initials}
                  </div>
                  <span className="text-[9px] font-cactus font-bold uppercase text-black/70 leading-tight">
                    {lang === 'fr' ? 'Image à renouveler' : 'Imagem a renovar'}
                  </span>
                </div>
              )}

              {/* Indicateur de trame active */}
              {!isSinglePhoto && (
                <div className="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-cactus font-bold px-1.5 py-0.5">
                  T{activeFrameIdx + 1} / {rawFrames?.length || signal.frames?.length || 1}
                </div>
              )}

              {isReprocessing && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Sélecteur de trames si multi-trames */}
            {!isSinglePhoto && (rawFrames || signal.frames) && (
              <div className="flex gap-1.5 mt-1">
                {(rawFrames || signal.frames || []).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveFrameIdx(idx)}
                    className={`relative w-9 h-9 border-2 overflow-hidden cursor-pointer transition-all ${
                      activeFrameIdx === idx
                        ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105'
                        : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={reprocessedFrames[idx] || (signal.frames && signal.frames[idx]) || ''}
                      alt={`T${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[7px] text-center font-cactus font-bold">
                      T{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INSPECTEUR DE RÉGLAGES CORDEL COMPLET (si rawFrames disponible) */}
          {hasRawFrames ? (
            <div className="border-2 border-[var(--cordel-border)] p-3 bg-black/5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center border-b border-[var(--cordel-border)]/20 pb-1">
                <span className="font-cactus font-bold uppercase text-[11px] tracking-wider text-[var(--cordel-wood)] flex items-center gap-1">
                  📐 {lang === 'fr' ? 'Réglages de gravure Cordel' : 'Configurações de gravura Cordel'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const def: CordelOptions = {
                      ...defaultCordelOptions,
                      zoom: 120,
                      detail: 60,
                      shadow: 130,
                      isMirror: true,
                      isFrame: false,
                      posX: 0,
                      posY: 0,
                      bgRemovalMode: 'none',
                      bgTolerance: 40,
                    };
                    setOptions(def);
                  }}
                  className="text-[9px] font-cactus uppercase opacity-70 hover:opacity-100 underline cursor-pointer"
                >
                  {lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}
                </button>
              </div>

              {/* Curseurs de cadrage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px] font-bold">
                {/* Zoom */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>🔍 {lang === 'fr' ? 'Zoom' : 'Zoom'}</span>
                    <span>{options.zoom}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={options.zoom}
                    onChange={(e) => handleOptionChange('zoom', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* Décalage horizontal X */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>↔️ {lang === 'fr' ? 'Décalage X' : 'Deslocamento X'}</span>
                    <span>{options.posX}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={options.posX}
                    onChange={(e) => handleOptionChange('posX', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* Décalage vertical Y */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>↕️ {lang === 'fr' ? 'Décalage Y' : 'Deslocamento Y'}</span>
                    <span>{options.posY}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={options.posY}
                    onChange={(e) => handleOptionChange('posY', parseInt(e.target.value))}
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
                    <span>{(options.brightness ?? 0) > 0 ? `+${options.brightness}` : (options.brightness ?? 0)}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={options.brightness ?? 0}
                    onChange={(e) => handleOptionChange('brightness', parseInt(e.target.value))}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* 2. Seuil d'encrage (20 à 220, défaut 128) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>🌑 {lang === 'fr' ? "Seuil d'encrage" : 'Limiar de Tinta'}</span>
                    <span>{options.threshold ?? options.shadow ?? 128}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="220"
                    value={options.threshold ?? options.shadow ?? 128}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handleOptionsChange({ threshold: val, shadow: val });
                    }}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>

                {/* 3. Contraste Sobel / Détection des bords (0 à 100 %) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>✍️ {lang === 'fr' ? 'Traits Sobel' : 'Traços Sobel'}</span>
                    <span>{options.sobelContrast ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={options.sobelContrast ?? 50}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handleOptionsChange({
                        sobelContrast: val,
                        detail: Math.round((val / 100) * 150),
                      });
                    }}
                    className="accent-[var(--cordel-wood)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Détourage automatique du fond */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--cordel-border)]/20">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="font-cactus uppercase tracking-wide text-[var(--cordel-wood)]">
                    🪄 {lang === 'fr' ? 'Détourage du fond' : 'Recorte de fundo'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOptionChange('bgRemovalMode', 'none')}
                    className={`py-1.5 px-2 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] transition-all cursor-pointer text-center ${
                      (options.bgRemovalMode ?? 'none') === 'none'
                        ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    {lang === 'fr' ? 'Fond Standard' : 'Fundo Padrão'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOptionChange('bgRemovalMode', 'green')}
                    className={`py-1.5 px-2 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      options.bgRemovalMode === 'green'
                        ? 'bg-emerald-700 text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    <span>🟩</span> {lang === 'fr' ? 'Fond Vert' : 'Fundo Verde'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOptionChange('bgRemovalMode', 'white')}
                    className={`py-1.5 px-2 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                      options.bgRemovalMode === 'white'
                        ? 'bg-stone-600 text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    <span>⬜</span> {lang === 'fr' ? 'Fond Blanc' : 'Fundo Branco'}
                  </button>
                </div>

                {/* Curseur de tolérance conditionnel */}
                {(options.bgRemovalMode === 'green' || options.bgRemovalMode === 'white') && (
                  <div className="flex flex-col gap-1 mt-0.5 bg-black/5 p-2 border border-[var(--cordel-border)]/30">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>🎯 {lang === 'fr' ? 'Tolérance fond' : 'Tolerância fundo'}</span>
                      <span>{options.bgTolerance ?? 40}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={options.bgTolerance ?? 40}
                      onChange={(e) => handleOptionChange('bgTolerance', parseInt(e.target.value))}
                      className="accent-[var(--cordel-wood)] cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Toggles Miroir & Cadre */}
              <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]/20">
                <button
                  type="button"
                  onClick={() => handleOptionChange('isMirror', !options.isMirror)}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    options.isMirror
                      ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  ⇄ {lang === 'fr' ? 'Miroir' : 'Espelho'} : {options.isMirror ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
                </button>

                <button
                  type="button"
                  onClick={() => handleOptionChange('isFrame', !options.isFrame)}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    options.isFrame
                      ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  🖼️ {lang === 'fr' ? 'Cadre' : 'Moldura'} : {options.isFrame ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
                </button>
              </div>
            </div>
          ) : null}

          {/* Bouton pour reprendre la prise de vue avec la Photo-Cabine */}
          {onRetakePhoto && (
            <button
              type="button"
              onClick={handleRetake}
              className="w-full py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-[var(--cordel-text)] border-2 border-dashed border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              📷 {lang === 'fr' ? 'Reprendre la prise de vue (Photo-cabine)' : 'Capturar novamente (Cabine de fotos)'}
            </button>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2 border-t border-[var(--cordel-border)]/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-black/10 hover:bg-black/20 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase cursor-pointer"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 py-2 bg-[var(--cordel-wood)] text-white border-2 border-[var(--cordel-border)] shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer font-cactus font-bold text-xs uppercase tracking-wider active:scale-[0.99] transition-all disabled:opacity-50"
            >
              💾 {isSaving ? (lang === 'fr' ? 'Enregistrement...' : 'Salvando...') : (lang === 'fr' ? 'Mettre à jour' : 'Atualizar')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
