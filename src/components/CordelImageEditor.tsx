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
    if (frames.length === 1) {
      try {
        const finalImg = await processCordelEffectBase64(frames[0], options, 200);
        onComplete(finalImg);
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    } else {
      try {
        const processedFrames: string[] = [];
        for (let i = 0; i < frames.length; i++) {
          const processed = await processCordelEffectBase64(frames[i], options, 160);
          processedFrames.push(processed);
        }
        
        const gifshot = (await import('gifshot')).default;
        gifshot.createGIF({
          images: processedFrames,
          gifWidth: 160,
          gifHeight: 160,
          numFrames: processedFrames.length,
          frameDuration: 7.5,
          sampleInterval: 12,
          numWorkers: 2,
        }, (obj: any) => {
          if (!obj.error) {
            onComplete(obj.image);
          } else {
            console.error('GIF creation error:', obj.errorMsg);
            setIsProcessing(false);
          }
        });
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    }
  };

  const handleOptionChange = (key: keyof CordelOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
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

      <div className="flex flex-col gap-3 mt-2 font-bold">
        {/* Sliders de Zoom, Detail, Shadow */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>🔍 {lang === 'fr' ? 'Zoom' : 'Zoom'}: {options.zoom}%</label>
          </div>
          <input type="range" min="50" max="180" value={options.zoom} onChange={e => handleOptionChange('zoom', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>✍️ {lang === 'fr' ? 'Lignes' : 'Linhas'}: {options.detail}%</label>
          </div>
          <input type="range" min="10" max="150" value={options.detail} onChange={e => handleOptionChange('detail', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px]">
            <label>🌑 {lang === 'fr' ? 'Encre' : 'Tinta'}: {options.shadow}</label>
          </div>
          <input type="range" min="50" max="220" value={options.shadow} onChange={e => handleOptionChange('shadow', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer" />
        </div>

        {/* Position */}
        <div className="flex gap-2 items-center text-[10px] mt-1">
          <div className="flex items-center flex-1 gap-1">
            <span>↔️</span>
            <input type="range" min="-100" max="100" value={options.posX} onChange={e => handleOptionChange('posX', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer m-0" />
          </div>
          <div className="flex items-center flex-1 gap-1">
            <span>↕️</span>
            <input type="range" min="-100" max="100" value={options.posY} onChange={e => handleOptionChange('posY', parseInt(e.target.value))} className="w-full accent-[var(--cordel-text)] cursor-pointer m-0" />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex justify-between mt-1 text-[10px]">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={options.isMirror} onChange={e => handleOptionChange('isMirror', e.target.checked)} className="cursor-pointer accent-[var(--cordel-text)]" />
            <span>🪞 {lang === 'fr' ? 'Miroir' : 'Espelho'}</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" checked={options.isFrame} onChange={e => handleOptionChange('isFrame', e.target.checked)} className="cursor-pointer accent-[var(--cordel-text)]" />
            <span>🖼️ {lang === 'fr' ? 'Cadre' : 'Moldura'}</span>
          </label>
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
