
import React from 'react';
import { Music, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export interface AudioAlignmentHeaderToolbarProps {
  patternName: string;
  lang: string;
  anacrusisBadgeRef: React.RefObject<HTMLSpanElement | null>;
  sampleBpm: number;
  setSampleBpm: (bpm: number) => void;
  anchorBpm: number;
  pixelsPerSecond: number;
  handleZoomOut: () => void;
  handleZoomIn: () => void;
  handleResetZoom1x: () => void;
  handleFitToWindow: () => void;
}

export const AudioAlignmentHeaderToolbar: React.FC<AudioAlignmentHeaderToolbarProps> = React.memo(({
  patternName, lang, anacrusisBadgeRef, sampleBpm, setSampleBpm,
  anchorBpm, pixelsPerSecond, handleZoomOut, handleZoomIn,
  handleResetZoom1x, handleFitToWindow,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-[#8b2a1a]" />
        <span className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">
          {lang === 'fr' ? 'Alignement Vocal : ' : 'Alinhamento Vocal : '}<span className="text-[#8b2a1a]">{patternName}</span>
        </span>
        <span
          ref={anacrusisBadgeRef}
          className="px-2 py-0.5 bg-[#ece4d0] border border-[#1a1a1a] text-[10px] font-black uppercase font-mono tracking-wider shadow-[1px_1px_0px_#1a1a1a]"
          style={{ color: '#1a1a1a' }}
        >
          {lang === 'fr' ? 'TEMPS 1 CALÉ (0 MS)' : 'TEMPO 1 ALINHADO (0 MS)'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 bg-[#ece4d0] border-2 border-[#1a1a1a] px-2.5 py-1 rounded-sm shadow-[2px_2px_0px_#1a1a1a]">
        <label htmlFor="sample-bpm-input" className="text-[10px] font-black text-[#1a1a1a]/80 uppercase tracking-wider select-none">
          {lang === 'fr' ? 'BPM du sample :' : 'BPM da amostra :'}
        </label>
        <input
          id="sample-bpm-input"
          type="number"
          min="20"
          max="300"
          step="1"
          value={sampleBpm}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) setSampleBpm(Math.max(20, Math.min(300, val)));
          }}
          className="w-14 px-1 py-0.5 text-center text-xs font-mono font-bold bg-[#fdfaf2] text-[#1a1a1a] border border-[#1a1a1a] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#8b2a1a]"
          title={lang === 'fr' ? 'Tempo source de la prise audio (DAW externe ou métronome)' : 'Andamento de origem do áudio (DAW externa ou metrônomo)'}
        />
        <span className="text-[10px] font-bold text-[#1a1a1a]/60 select-none">BPM</span>
        {sampleBpm > 0 && Math.abs((anchorBpm / sampleBpm) - 1.0) >= 0.001 && (
          <span
            className="text-[9px] font-black px-1.5 py-0.5 bg-[#8b2a1a] text-white rounded-xs border border-[#1a1a1a] tracking-tight shadow-[1px_1px_0px_#1a1a1a]"
            title={lang === 'fr' ? `Ratio de time-stretching calculé : x${(anchorBpm / sampleBpm).toFixed(2)}` : `Proporção de time-stretch calculada : x${(anchorBpm / sampleBpm).toFixed(2)}`}
          >
            x{(anchorBpm / sampleBpm).toFixed(2)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 bg-[#ece4d0] border-2 border-[#1a1a1a] px-2 py-1 rounded-sm shadow-[2px_2px_0px_#1a1a1a]">
        <span className="text-[10px] font-black text-[#1a1a1a]/70 uppercase mr-1">Zoom :</span>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={pixelsPerSecond <= 50}
          className="p-1 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-white disabled:opacity-40 border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer"
          title={lang === 'fr' ? 'Zoom arrière (-25 px/s)' : 'Diminuir zoom (-25 px/s)'}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono font-bold text-[#1a1a1a] min-w-[54px] text-center">
          {pixelsPerSecond} px/s
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={pixelsPerSecond >= 300}
          className="p-1 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-white disabled:opacity-40 border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer"
          title={lang === 'fr' ? 'Zoom avant (+25 px/s)' : 'Aumentar zoom (+25 px/s)'}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom1x}
          className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer ${
            pixelsPerSecond === 200 ? 'bg-[#1a1a1a] text-[#fdfaf2]' : 'bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-white'
          }`}
          title={lang === 'fr' ? "Réinitialiser l'échelle à 100% (200 px/s standard)" : 'Redefinir escala para 100% (200 px/s padrão)'}
        >
          1:1
        </button>
        <button
          type="button"
          onClick={handleFitToWindow}
          className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase bg-[#2a5d4e] text-white hover:bg-[#1a1a1a] border border-[#1a1a1a] rounded-sm transition-colors cursor-pointer shadow-[1px_1px_0px_#1a1a1a]"
          title={lang === 'fr' ? "Adapter toute la forme d'onde et les repères à la largeur de l'écran" : 'Ajustar toda a forma de onda e marcadores à largura da tela'}
        >
          <Maximize2 className="w-3 h-3" />
          {lang === 'fr' ? "Adapter à l'écran" : 'Ajustar à tela'}
        </button>
      </div>
    </div>
  );
});

AudioAlignmentHeaderToolbar.displayName = 'AudioAlignmentHeaderToolbar';
