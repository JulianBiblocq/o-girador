/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CordelOptions, processCordelEffectBase64 } from '../utils/cordelEffect';
import { useCordelProcessor } from './cordel-editor/useCordelProcessor';
import { CordelPreviewViewer } from './cordel-editor/CordelPreviewViewer';
import { CordelInspectorSliders } from './cordel-editor/CordelInspectorSliders';

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
  const {
    options,
    setOptions,
    previewFrames,
    isProcessing,
    setIsProcessing,
    isPlaying,
    setIsPlaying,
    selectedFrameIndex,
    setSelectedFrameIndex,
    activePlayheadIndex,
    overrideMode,
    setOverrideMode,
    frameOverrides,
    setFrameOverrides,
    getEffectiveOptions,
    applyCordelProcessing,
  } = useCordelProcessor(frames, bpm);

  const activeInspectorOptions = overrideMode === 'local' ? getEffectiveOptions(selectedFrameIndex) : options;

  const handleUpdateCordelOptions = (patch: Partial<CordelOptions>) => {
    if (overrideMode === 'local') {
      const updated = { ...frameOverrides, [selectedFrameIndex]: { ...(frameOverrides[selectedFrameIndex] || {}), ...patch } };
      setFrameOverrides(updated);
      applyCordelProcessing('local', selectedFrameIndex, options, updated);
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

  return (
    <div className="flex flex-col gap-2 p-2 bg-[var(--cordel-bg)] cordel-border-sm text-[var(--cordel-text)] font-sans text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="font-cactus font-bold uppercase tracking-wider text-[11px]">{lang === 'fr' ? 'Éditeur Xylogravure Cordel' : 'Editor Xilogravura Cordel'}</span>
        {isMultiFrame && <span className="text-[9px] font-cactus opacity-70">{frames.length} {lang === 'fr' ? 'trames' : 'quadros'} ({bpm} BPM)</span>}
      </div>

      <CordelPreviewViewer frames={frames} previewFrames={previewFrames} selectedFrameIndex={selectedFrameIndex} setSelectedFrameIndex={setSelectedFrameIndex} isPlaying={isPlaying} setIsPlaying={setIsPlaying} activePlayheadIndex={activePlayheadIndex} frameOverrides={frameOverrides} isProcessing={isProcessing} bpm={bpm} lang={lang} />
      <CordelInspectorSliders isMultiFrame={isMultiFrame} overrideMode={overrideMode} setOverrideMode={setOverrideMode} selectedFrameIndex={selectedFrameIndex} frameOverrides={frameOverrides} handleResetLocalOverride={handleResetLocalOverride} activeInspectorOptions={activeInspectorOptions} handleUpdateCordelOption={handleUpdateCordelOption} handleUpdateCordelOptions={handleUpdateCordelOptions} setIsPlaying={setIsPlaying} lang={lang} />

      <div className="flex gap-2 mt-3">
        <button onClick={handleApply} disabled={isProcessing} className={`flex-1 py-1.5 bg-black text-white cordel-border-sm text-[10px] font-bold uppercase tracking-wider font-cactus ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800 cursor-pointer'}`}>
          {lang === 'fr' ? (isMultiFrame ? `Valider (${frames.length} trames)` : 'Valider') : isMultiFrame ? `Aplicar (${frames.length} quadros)` : 'Aplicar'}
        </button>
        <button onClick={onCancel} disabled={isProcessing} className={`flex-1 py-1.5 bg-gray-300 text-black cordel-border-sm text-[10px] font-bold uppercase tracking-wider font-cactus ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-85 cursor-pointer'}`}>
          {lang === 'fr' ? 'Annuler' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
};
