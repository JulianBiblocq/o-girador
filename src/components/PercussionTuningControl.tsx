import React, { useState, useEffect, useRef } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';

interface PercussionTuningControlProps {
  trackId: number;
}

export const PercussionTuningControl: React.FC<PercussionTuningControlProps> = ({ trackId }) => {
  const track = useSequencerStore(state => state.tracks.find(t => t.id === trackId));
  const setTrackTuning = useSequencerStore(state => state.setTrackTuning);
  
  if (!track) return null;
  
  const instrument = instrumentsConfig[track.instrumentIdx];
  if (!instrument) return null;

  // We only allow tuning for specific drum instruments that are typically tuned with ropes or tension rods.
  const tuneableInstruments = ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'];
  const canTune = tuneableInstruments.includes(instrument.id);
  
  if (!canTune) return null;

  const tuning = track.tuning || 0;
  // Use local state for immediate feedback while dragging the slider
  const [localTuning, setLocalTuning] = useState(tuning);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalTuning(track.tuning || 0);
    }
  }, [track.tuning, isDragging]);

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
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateTuningFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateTuningFromEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (localTuning !== (track.tuning || 0)) {
      setTrackTuning(trackId, localTuning);
    }
  };

  const isPitchUp = localTuning > 0;
  const isPitchDown = localTuning < 0;

  // Calculate Ring Y position based on tuning
  const R_y = 90 - (localTuning * (50 / 6));

  return (
    <div className="flex flex-col items-center justify-center bg-[var(--cordel-bg)] border-[3px] border-[var(--cordel-text)] p-3 gap-2 relative w-full select-none shadow-[4px_4px_0_rgba(0,0,0,1)]">
      <div className="flex justify-between w-full items-end leading-none border-b-2 border-dashed border-[#1a1a1a]/30 pb-2">
        <span className="text-[11px] font-bold font-cactus uppercase text-[var(--cordel-text)] tracking-wider">
          Afinar (Pitch)
        </span>
        <span className={`text-[16px] font-bold font-cactus ${isPitchUp ? 'text-[#8b2a1a]' : isPitchDown ? 'text-[#666]' : 'text-[var(--cordel-text)]'}`}>
          {localTuning > 0 ? `+${localTuning}` : localTuning}
        </span>
      </div>
      
      {/* Interactive SVG Tuning Rope */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 180"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-[160px] touch-none cursor-grab active:cursor-grabbing overflow-visible mt-2"
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
      
      <p className="text-[10px] font-bold text-[#666] leading-tight text-center mt-1">
        ↕ Glisser pour accorder
      </p>
    </div>
  );
};

