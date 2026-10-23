import React, { useRef, useEffect, useState } from 'react';

interface RhythmSignalCellProps {
  mIdx: number;
  MEASURE_W: number;
  sigId: string | null;
  rhythmSignals: any[];
  enabledSignalIds: string[];
  signalDropdownOpen: number | null;
  lang: string;
  setSignalDropdownOpen: (val: number | null) => void;
  onMeasureSignalChange: (mIdx: number, sigId: string | null) => void;
}

const SignalThumb: React.FC<{ name: string; image?: string; imgRef?: React.RefObject<HTMLImageElement | null> }> = ({ name, image, imgRef }) => {
  const [err, setErr] = useState(false);
  const initials = name ? name.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('') : 'SG';
  if (!image || err) {
    return <span className="w-6 h-6 flex items-center justify-center bg-black/10 text-[8px] font-cactus font-bold text-[var(--cordel-wood)] leading-none rounded shrink-0">{initials}</span>;
  }
  return <img ref={imgRef} src={image} alt={name} onError={() => setErr(true)} className="w-6 h-6 object-contain shrink-0" />;
};

export const RhythmSignalCell: React.FC<RhythmSignalCellProps> = ({
  mIdx, MEASURE_W, sigId, rhythmSignals, enabledSignalIds, signalDropdownOpen,
  lang, setSignalDropdownOpen, onMeasureSignalChange,
}) => {
  const activeSig = rhythmSignals.find((s) => s.id === sigId) || null;
  const isOpen = signalDropdownOpen === mIdx;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hasMultiFrames = Boolean(activeSig?.frames && activeSig.frames.length > 1);

  useEffect(() => {
    if (!hasMultiFrames || !activeSig?.frames) return;
    const handleTick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !imgRef.current) return;
      if (detail.currentMeasure === mIdx) {
        const ratio = typeof detail.ratio === 'number' ? detail.ratio : 0;
        const frameIdx = Math.min(activeSig.frames.length - 1, Math.max(0, Math.floor(ratio * activeSig.frames.length)));
        const targetSrc = activeSig.frames[frameIdx];
        if (targetSrc && imgRef.current.src !== targetSrc) {
          imgRef.current.src = targetSrc;
        }
      } else if (imgRef.current.src !== activeSig.frames[0]) {
        imgRef.current.src = activeSig.frames[0];
      }
    };
    window.addEventListener('sequencer-tick', handleTick);
    return () => window.removeEventListener('sequencer-tick', handleTick);
  }, [hasMultiFrames, activeSig, mIdx]);

  return (
    <div
      className="border-r border-[var(--cordel-border)]/20 flex items-center justify-center shrink-0 relative"
      style={{ width: MEASURE_W, minWidth: MEASURE_W, height: '100%' }}
    >
      {activeSig ? (
        <button
          onClick={(e) => { e.stopPropagation(); setSignalDropdownOpen(isOpen ? null : mIdx); }}
          className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--cordel-border)]/20 hover:bg-[var(--cordel-border)]/40 transition-colors rounded text-[9px] font-bold text-[var(--cordel-text)] max-w-full"
          title={activeSig.name}
        >
          <SignalThumb name={activeSig.name} image={activeSig.image} imgRef={imgRef} />
          <span className="ruler-detailed truncate max-w-[70px]">{activeSig.name}</span>
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setSignalDropdownOpen(isOpen ? null : mIdx); }}
          className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border border-dashed border-[var(--cordel-border)]/30 rounded text-[10px] font-bold hover:bg-[var(--cordel-border)]/20 hover:text-[var(--cordel-text)] transition-colors cursor-pointer"
          title={lang === 'fr' ? 'Assigner un signal' : 'Atribuir um sinal'}
        >
          +
        </button>
      )}

      {isOpen && (
        <div
          className="absolute top-full left-0 z-50 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] shadow-lg rounded p-1 min-w-[140px] max-h-48 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onMeasureSignalChange(mIdx, null); setSignalDropdownOpen(null); }}
            className="w-full text-left px-2 py-1 text-[10px] hover:bg-[var(--cordel-border)]/20 text-[var(--cordel-text)]/60 cursor-pointer"
          >
            {lang === 'fr' ? '— Aucun signal' : '— Sem sinal'}
          </button>
          {rhythmSignals
            .filter((s) => enabledSignalIds.length === 0 || enabledSignalIds.includes(s.id))
            .map((sig) => (
              <button
                key={sig.id}
                onClick={() => { onMeasureSignalChange(mIdx, sig.id); setSignalDropdownOpen(null); }}
                className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 hover:bg-[var(--cordel-border)]/20 cursor-pointer ${sig.id === sigId ? 'font-bold text-[var(--cordel-wood)] bg-[var(--cordel-border)]/10' : ''}`}
              >
                <SignalThumb name={sig.name} image={sig.image} />
                <span className="truncate">{sig.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
