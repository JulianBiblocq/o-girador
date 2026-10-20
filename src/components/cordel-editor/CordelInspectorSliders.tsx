/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CordelOptions } from '../../utils/cordelEffect';

interface CordelInspectorSlidersProps {
  isMultiFrame: boolean;
  overrideMode: 'global' | 'local';
  setOverrideMode: (mode: 'global' | 'local') => void;
  selectedFrameIndex: number;
  frameOverrides: Record<number, any>;
  handleResetLocalOverride: () => void;
  activeInspectorOptions: CordelOptions;
  handleUpdateCordelOption: <K extends keyof CordelOptions>(key: K, value: CordelOptions[K]) => void;
  handleUpdateCordelOptions: (patch: Partial<CordelOptions>) => void;
  setIsPlaying: (val: boolean) => void;
  lang: string;
}

export const CordelInspectorSliders: React.FC<CordelInspectorSlidersProps> = ({
  isMultiFrame,
  overrideMode,
  setOverrideMode,
  selectedFrameIndex,
  frameOverrides,
  handleResetLocalOverride,
  activeInspectorOptions,
  handleUpdateCordelOption,
  handleUpdateCordelOptions,
  setIsPlaying,
  lang,
}) => {
  return (
    <div className="flex flex-col gap-2 mt-1 font-bold">
      {isMultiFrame && (
        <div className="flex justify-between items-center gap-1 border-b border-[var(--cordel-border)]/20 pb-1.5 pt-0.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOverrideMode('global')}
              className={`py-0.5 px-2 font-cactus font-bold text-[9px] uppercase cordel-border-sm cursor-pointer flex items-center gap-1 transition-all ${overrideMode === 'global' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] shadow-[1px_1px_0px_#000]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'}`}
            >
              <span>🔗</span>
              <span>{lang === 'fr' ? 'Toutes' : 'Todas'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setOverrideMode('local'); setIsPlaying(false); }}
              className={`py-0.5 px-2 font-cactus font-bold text-[9px] uppercase cordel-border-sm cursor-pointer flex items-center gap-1 transition-all ${overrideMode === 'local' ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)]/10'}`}
            >
              <span>⚡</span>
              <span>{lang === 'fr' ? `Débrayer T${selectedFrameIndex + 1}` : `Desacoplar T${selectedFrameIndex + 1}`}</span>
            </button>
          </div>
          {overrideMode === 'local' && Boolean(frameOverrides[selectedFrameIndex] && Object.keys(frameOverrides[selectedFrameIndex]!).length > 0) && (
            <button type="button" onClick={handleResetLocalOverride} className="text-[8.5px] font-cactus uppercase text-[var(--cordel-wood)] hover:underline font-bold flex items-center gap-0.5 cursor-pointer">
              <span>↺</span>
              <span>{lang === 'fr' ? 'Réinitialiser' : 'Redefinir'}</span>
            </button>
          )}
        </div>
      )}

      {/* Sliders Zoom & Pos */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px]"><label>🔍 Zoom: {activeInspectorOptions.zoom}%</label></div>
        <input type="range" min="50" max="180" value={activeInspectorOptions.zoom} onChange={(e) => handleUpdateCordelOption('zoom', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
      </div>

      <div className="flex gap-2 items-center text-[10px]">
        <div className="flex items-center flex-1 gap-1"><span>↔️</span><input type="range" min="-100" max="100" value={activeInspectorOptions.posX} onChange={(e) => handleUpdateCordelOption('posX', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer m-0" /></div>
        <div className="flex items-center flex-1 gap-1"><span>↕️</span><input type="range" min="-100" max="100" value={activeInspectorOptions.posY} onChange={(e) => handleUpdateCordelOption('posY', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer m-0" /></div>
      </div>

      {/* Luminosité */}
      <div className="flex flex-col gap-1 border-t border-[var(--cordel-border)]/20 pt-1.5">
        <div className="flex justify-between items-center text-[10px]">
          <label>☀️ {lang === 'fr' ? 'Luminosité / Fond' : 'Luminosidade / Fundo'}: {(activeInspectorOptions.brightness ?? 0) > 0 ? `+${activeInspectorOptions.brightness}` : activeInspectorOptions.brightness ?? 0}</label>
        </div>
        <input type="range" min="-50" max="50" value={activeInspectorOptions.brightness ?? 0} onChange={(e) => handleUpdateCordelOption('brightness', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
      </div>

      {/* Seuil d'encrage */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px]">
          <label>🌑 {lang === 'fr' ? "Seuil d'encrage" : 'Limiar de Tinta'}: {activeInspectorOptions.threshold ?? activeInspectorOptions.shadow ?? 128}</label>
        </div>
        <input type="range" min="20" max="220" value={activeInspectorOptions.threshold ?? activeInspectorOptions.shadow ?? 128} onChange={(e) => { const v = parseInt(e.target.value); handleUpdateCordelOptions({ threshold: v, shadow: v }); }} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
      </div>

      {/* Contraste Sobel */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px]"><label>✍️ {lang === 'fr' ? 'Contraste Sobel (bords)' : 'Contraste Sobel (bordas)'}: {activeInspectorOptions.sobelContrast ?? 50}%</label></div>
        <input type="range" min="0" max="100" value={activeInspectorOptions.sobelContrast ?? 50} onChange={(e) => { const v = parseInt(e.target.value); handleUpdateCordelOptions({ sobelContrast: v, detail: Math.round((v / 100) * 150) }); }} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
      </div>

      {/* Détourage */}
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--cordel-border)]/20">
        <div className="flex justify-between items-center text-[10px]"><label className="font-cactus font-bold uppercase tracking-wider">🪄 {lang === 'fr' ? 'Détourage du fond' : 'Recorte de fundo'}</label></div>
        <div className="grid grid-cols-3 gap-1">
          <button type="button" onClick={() => handleUpdateCordelOption('bgRemovalMode', 'none')} className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center ${(activeInspectorOptions.bgRemovalMode ?? 'none') === 'none' ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]' : 'bg-black/5 hover:bg-black/10'}`}>{lang === 'fr' ? 'Standard' : 'Padrão'}</button>
          <button type="button" onClick={() => handleUpdateCordelOption('bgRemovalMode', 'green')} className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${activeInspectorOptions.bgRemovalMode === 'green' ? 'bg-emerald-700 text-white shadow-[1px_1px_0px_#000]' : 'bg-black/5 hover:bg-black/10'}`}><span>🟩</span> {lang === 'fr' ? 'Fond Vert' : 'Verde'}</button>
          <button type="button" onClick={() => handleUpdateCordelOption('bgRemovalMode', 'white')} className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${activeInspectorOptions.bgRemovalMode === 'white' ? 'bg-stone-600 text-white shadow-[1px_1px_0px_#000]' : 'bg-black/5 hover:bg-black/10'}`}><span>⬜</span> {lang === 'fr' ? 'Fond Blanc' : 'Branco'}</button>
        </div>

        {(activeInspectorOptions.bgRemovalMode === 'green' || activeInspectorOptions.bgRemovalMode === 'white') && (
          <div className="flex flex-col gap-1 mt-0.5 bg-black/5 p-1.5 cordel-border-sm">
            <div className="flex justify-between items-center text-[10px]"><label>🎯 {lang === 'fr' ? 'Tolérance fond' : 'Tolerância fundo'}: {activeInspectorOptions.bgTolerance ?? 40}%</label></div>
            <input type="range" min="10" max="90" value={activeInspectorOptions.bgTolerance ?? 40} onChange={(e) => handleUpdateCordelOption('bgTolerance', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
          </div>
        )}
      </div>

      {/* Miroir & Cadre */}
      <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]/20">
        <button type="button" onClick={() => handleUpdateCordelOption('isMirror', !activeInspectorOptions.isMirror)} className={`flex-1 py-1 px-2 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeInspectorOptions.isMirror ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]' : 'bg-black/5 hover:bg-black/10'}`}>
          ⇄ {lang === 'fr' ? 'Miroir' : 'Espelho'} : {activeInspectorOptions.isMirror ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
        </button>
        <button type="button" onClick={() => handleUpdateCordelOption('isFrame', !activeInspectorOptions.isFrame)} className={`flex-1 py-1 px-2 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeInspectorOptions.isFrame ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]' : 'bg-black/5 hover:bg-black/10'}`}>
          🖼️ {lang === 'fr' ? 'Cadre' : 'Moldura'} : {activeInspectorOptions.isFrame ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
        </button>
      </div>
    </div>
  );
};
