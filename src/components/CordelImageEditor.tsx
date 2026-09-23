import React, { useState, useEffect } from 'react';
import { CordelOptions, defaultCordelOptions, processCordelEffectBase64 } from '../utils/cordelEffect';

interface CordelImageEditorProps {
  frames: string[];
  lang: string;
  onComplete: (resultBase64: string) => void;
  onCancel: () => void;
}

export const CordelImageEditor: React.FC<CordelImageEditorProps> = ({ frames, lang, onComplete, onCancel }) => {
  const [options, setOptions] = useState<CordelOptions>(defaultCordelOptions);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(async () => {
      if (!frames[0]) return;
      try {
        const preview = await processCordelEffectBase64(frames[0], options, 200);
        if (active) setPreviewBase64(preview);
      } catch (err) {
        console.error(err);
      }
    }, 50);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [frames, options]);

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const finalImg = await processCordelEffectBase64(frames[0], options, 200);
      onComplete(finalImg);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleOptionsChange = (patch: Partial<CordelOptions>) => {
    setOptions(prev => ({ ...prev, ...patch }));
  };

  const handleOptionChange = (key: keyof CordelOptions, value: any) => {
    handleOptionsChange({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-2 p-2 bg-[var(--cordel-bg)] cordel-border-sm text-[var(--cordel-text)] font-sans text-xs">
      <span className="font-cactus font-bold uppercase tracking-wider text-[10px] mb-1">
        {lang === 'fr' ? 'Éditeur Xylogravure' : 'Editor Xilogravura'}
      </span>
      
      <div className="relative aspect-square w-full bg-black/10 cordel-border-sm overflow-hidden flex items-center justify-center">
        {previewBase64 ? (
          <img src={previewBase64} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-6 h-6 border-2 border-[var(--cordel-text)] border-t-transparent rounded-full animate-spin" />
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-10">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] font-cactus font-bold uppercase tracking-wider">
              {lang === 'fr' ? 'Traitement...' : 'Processando...'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 mt-2 font-bold">
        {/* Sliders de Zoom & Position */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>🔍 {lang === 'fr' ? 'Zoom' : 'Zoom'}: {options.zoom}%</label>
          </div>
          <input type="range" min="50" max="180" value={options.zoom} onChange={e => handleOptionChange('zoom', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
        </div>

        {/* Position */}
        <div className="flex gap-2 items-center text-[10px]">
          <div className="flex items-center flex-1 gap-1">
            <span>↔️</span>
            <input type="range" min="-100" max="100" value={options.posX} onChange={e => handleOptionChange('posX', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer m-0" />
          </div>
          <div className="flex items-center flex-1 gap-1">
            <span>↕️</span>
            <input type="range" min="-100" max="100" value={options.posY} onChange={e => handleOptionChange('posY', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer m-0" />
          </div>
        </div>

        {/* 1. Luminosité / Exposition (-50 à +50) */}
        <div className="flex flex-col gap-1 border-t border-[var(--cordel-border)]/20 pt-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <label>☀️ {lang === 'fr' ? 'Luminosité / Fond' : 'Luminosidade / Fundo'}: {(options.brightness ?? 0) > 0 ? `+${options.brightness}` : (options.brightness ?? 0)}</label>
          </div>
          <input type="range" min="-50" max="50" value={options.brightness ?? 0} onChange={e => handleOptionChange('brightness', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
        </div>

        {/* 2. Seuil d'encrage / Threshold (20 à 220, défaut 128) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>🌑 {lang === 'fr' ? "Seuil d'encrage" : 'Limiar de Tinta'}: {options.threshold ?? options.shadow ?? 128}</label>
          </div>
          <input
            type="range"
            min="20"
            max="220"
            value={options.threshold ?? options.shadow ?? 128}
            onChange={e => {
              const val = parseInt(e.target.value);
              handleOptionsChange({ threshold: val, shadow: val });
            }}
            className="w-full accent-[var(--cordel-text)] cursor-pointer"
          />
        </div>

        {/* 3. Contraste Sobel / Détection des bords (0 à 100 %) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>✍️ {lang === 'fr' ? 'Contraste Sobel (bords)' : 'Contraste Sobel (bordas)'}: {options.sobelContrast ?? 50}%</label>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={options.sobelContrast ?? 50}
            onChange={e => {
              const val = parseInt(e.target.value);
              handleOptionsChange({ sobelContrast: val, detail: Math.round((val / 100) * 150) });
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
              onClick={() => handleOptionChange('bgRemovalMode', 'none')}
              className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center ${
                (options.bgRemovalMode ?? 'none') === 'none'
                  ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                  : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              {lang === 'fr' ? 'Standard' : 'Padrão'}
            </button>
            <button
              type="button"
              onClick={() => handleOptionChange('bgRemovalMode', 'green')}
              className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                options.bgRemovalMode === 'green'
                  ? 'bg-emerald-700 text-white shadow-[1px_1px_0px_#000]'
                  : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              <span>🟩</span> {lang === 'fr' ? 'Fond Vert' : 'Verde'}
            </button>
            <button
              type="button"
              onClick={() => handleOptionChange('bgRemovalMode', 'white')}
              className={`py-1 px-1 text-[9px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                options.bgRemovalMode === 'white'
                  ? 'bg-stone-600 text-white shadow-[1px_1px_0px_#000]'
                  : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              <span>⬜</span> {lang === 'fr' ? 'Fond Blanc' : 'Branco'}
            </button>
          </div>

          {/* Curseur conditionnel de tolérance */}
          {(options.bgRemovalMode === 'green' || options.bgRemovalMode === 'white') && (
            <div className="flex flex-col gap-1 mt-0.5 bg-black/5 p-1.5 cordel-border-sm">
              <div className="flex justify-between items-center text-[10px]">
                <label>🎯 {lang === 'fr' ? 'Tolérance fond' : 'Tolerância fundo'}: {options.bgTolerance ?? 40}%</label>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={options.bgTolerance ?? 40}
                onChange={e => handleOptionChange('bgTolerance', parseInt(e.target.value))}
                className="w-full accent-[var(--cordel-text)] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Toggles Miroir & Cadre */}
        <div className="flex gap-2 pt-1 border-t border-[var(--cordel-border)]/20">
          <button
            type="button"
            onClick={() => handleOptionChange('isMirror', !options.isMirror)}
            className={`flex-1 py-1 px-2 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
            className={`flex-1 py-1 px-2 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              options.isFrame
                ? 'bg-[var(--cordel-wood)] text-white shadow-[1px_1px_0px_#000]'
                : 'bg-black/5 hover:bg-black/10'
            }`}
          >
            🖼️ {lang === 'fr' ? 'Cadre' : 'Moldura'} : {options.isFrame ? (lang === 'fr' ? 'OUI' : 'SIM') : (lang === 'fr' ? 'NON' : 'NÃO')}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApply}
          disabled={isProcessing}
          className={`flex-1 py-1.5 bg-black text-white cordel-border-sm text-[10px] font-bold uppercase tracking-wider font-cactus ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
        >
          {lang === 'fr' ? 'Valider' : 'Aplicar'}
        </button>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className={`flex-1 py-1.5 bg-gray-300 text-black cordel-border-sm text-[10px] font-bold uppercase tracking-wider font-cactus ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-85 cursor-pointer'}`}
        >
          {lang === 'fr' ? 'Annuler' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
};
