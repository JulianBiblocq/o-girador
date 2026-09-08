import React, { useState, useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';

export interface PercussionTuningControlProps {
  trackId?: number;
  instrumentId?: string;
  tuning?: number;
  onChange?: (newTuning: number) => void;
  title?: string;
  onPreview?: () => void;
  showPreviewButton?: boolean;
}

export const PercussionTuningControl: React.FC<PercussionTuningControlProps> = ({
  trackId,
  instrumentId,
  tuning: propTuning,
  onChange,
  title,
  onPreview,
  showPreviewButton = true,
}) => {
  const isControlled = trackId === undefined;

  const track = useSequencerStore((state) =>
    trackId !== undefined ? state.tracks.find((t) => t.id === trackId) : undefined
  );
  const setTrackTuning = useSequencerStore((state) => state.setTrackTuning);

  const effectiveInstrumentId = isControlled
    ? instrumentId || ''
    : track
    ? instrumentsConfig[track.instrumentIdx]?.id || ''
    : '';

  // We only allow tuning for specific drum instruments that are typically tuned with ropes or tension rods.
  const tuneableInstruments = ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'];
  const canTune = tuneableInstruments.includes(effectiveInstrumentId);

  if (!isControlled && !track) return null;
  if (!canTune && effectiveInstrumentId) return null;

  const currentTuning = isControlled ? propTuning || 0 : track?.tuning || 0;

  // Use local state for immediate feedback while dragging the slider
  const [localTuning, setLocalTuning] = useState(currentTuning);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalTuning(currentTuning);
    }
  }, [currentTuning, isDragging]);

  const updateTuningFromEvent = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    const mappedY = ratio * 180; // viewBox height is 180

    // R_y goes from 40 to 140
    let newTuning = ((140 - mappedY) / 100) * 12 - 6;
    newTuning = Math.round(newTuning);
    newTuning = Math.max(-6, Math.min(6, newTuning));

    setLocalTuning(newTuning);
    if (isControlled && onChange) {
      onChange(newTuning);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    updateTuningFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      updateTuningFromEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(false);

    if (!isControlled && trackId !== undefined) {
      if (localTuning !== (track?.tuning || 0)) {
        setTrackTuning(trackId, localTuning);
      }
    } else if (onChange) {
      onChange(localTuning);
    }

    // Si le mouvement était minime (simple clic), on peut aussi déclencher la pré-écoute
    if (dragStartPosRef.current && onPreview) {
      const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
      if (dist < 4) {
        onPreview();
      }
    }
    dragStartPosRef.current = null;
  };

  const isPitchUp = localTuning > 0;
  const isPitchDown = localTuning < 0;

  // Calculate Ring Y position based on tuning (-6 to +6)
  const R_y = 90 - (localTuning * (50 / 6));

  const displayTitle = title || (isControlled ? 'Afinar' : 'Afinar (Pitch)');

  return (
    <div className="flex flex-col items-center justify-center bg-[var(--cordel-bg)] border-[2px] sm:border-[3px] border-[var(--cordel-text)] p-2 gap-1.5 relative w-full select-none shadow-[3px_3px_0_rgba(0,0,0,1)]">
      <div className="flex justify-between w-full items-end leading-none border-b border-dashed border-[#1a1a1a]/30 pb-1.5">
        <span className="text-[11px] font-bold font-cactus uppercase text-[var(--cordel-text)] tracking-wider truncate mr-1">
          {displayTitle}
        </span>
        <span
          className={`text-[15px] font-bold font-cactus shrink-0 ${
            isPitchUp ? 'text-[#8b2a1a]' : isPitchDown ? 'text-[#555]' : 'text-[var(--cordel-text)]'
          }`}
        >
          {localTuning > 0 ? `+${localTuning}` : localTuning}
        </span>
      </div>

      {/* Interactive SVG Tuning Rope */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 180"
        preserveAspectRatio="xMidYMid meet"
        style={{ touchAction: 'none' }}
        className="w-full h-[130px] touch-none cursor-grab active:cursor-grabbing overflow-visible mt-0.5"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Tuning Ticks / Text */}
        <text x="14" y="43" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#8b2a1a" textAnchor="end">+6</text>
        <text x="14" y="93" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#1a1a1a" textAnchor="end">0</text>
        <text x="14" y="143" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#666" textAnchor="end">-6</text>

        {/* Center dashed line for guidance */}
        <line x1="16" y1="90" x2="84" y2="90" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="2,2" opacity="0.2" />

        {/* Drum Shell Background */}
        <path d="M 20,20 L 20,160 L 80,160 L 80,20 Z" fill="#ebdcb9" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />

        {/* Alfaia Triangles Pattern */}
        <polygon points="20,160 50,50 80,160" fill="#1a1a1a" opacity="0.1" />
        <polygon points="20,20 50,130 80,20" fill="#1a1a1a" opacity="0.1" />

        {/* Top Rim */}
        <rect x="18" y="10" width="64" height="10" fill="#eaddcf" stroke="#1a1a1a" strokeWidth="2" rx="1" />
        {/* Bottom Rim */}
        <rect x="18" y="160" width="64" height="10" fill="#eaddcf" stroke="#1a1a1a" strokeWidth="2" rx="1" />

        {/* Holes */}
        <circle cx="25" cy="15" r="2.5" fill="#1a1a1a" />
        <circle cx="75" cy="15" r="2.5" fill="#1a1a1a" />
        <circle cx="50" cy="165" r="2.5" fill="#1a1a1a" />

        {/* Ropes */}
        <path d={`M 25,15 L 42,${R_y} L 48,165`} fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />
        <path d={`M 75,15 L 58,${R_y} L 52,165`} fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />

        {/* Leather Ring (Rond de cuir) */}
        <polygon
          points={`32,${R_y-10} 68,${R_y-10} 62,${R_y+10} 38,${R_y+10}`}
          fill="#d4a373"
          stroke="#1a1a1a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Leather Ring Stitches */}
        <path
          d={`M 48,${R_y-6} L 52,${R_y-3} L 48,${R_y} L 52,${R_y+3} L 48,${R_y+6}`}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Invisible hit area for easier dragging */}
        <rect x="15" y="10" width="70" height="160" fill="transparent" />
      </svg>

      {/* Bouton de pré-écoute unitaire dédié */}
      {showPreviewButton && onPreview && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="w-full py-1 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:scale-95 transition-all cursor-pointer font-cactus font-bold uppercase text-[9px] flex items-center justify-center gap-1 mt-0.5"
        >
          <span>🔊</span>
          <span>Écouter</span>
        </button>
      )}

      <p className="text-[9px] font-bold text-[#666] leading-tight text-center">
        ↕ Glisser l'anneau
      </p>
    </div>
  );
};
