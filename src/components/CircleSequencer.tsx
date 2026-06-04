/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { TrackGroup, Language, HitTrigger } from '../types';
import { instrumentsConfig, getMarkers, ASSETS_BASE_URL } from '../data';

interface CircleSequencerProps {
  lang: Language;
  tracks: TrackGroup[];
  isPlaying: boolean;
  currentStepIndex: number;
  currentMeasure: number;
  maxTicks: number;
  onTogglePlay: () => void;
  onStepChange: (trackId: number, patternId: number, stepIdx: number, newState: string | number, lyric?: string, note?: string) => void;
  langPromptVoiceText: string;
  isMetroOn?: boolean;
  activeCircleIdByInst?: { [instIdx: number]: number | null };
  totalMeasures: number;
  activePatternIdByInst: Record<number, number>;
  hitTriggersRef?: React.MutableRefObject<HitTrigger[]>;
}

export const CircleSequencer: React.FC<CircleSequencerProps> = ({
  lang,
  tracks,
  isPlaying,
  currentStepIndex,
  currentMeasure,
  maxTicks,
  onTogglePlay,
  onStepChange,
  langPromptVoiceText,
  isMetroOn,
  activeCircleIdByInst,
  totalMeasures,
  activePatternIdByInst,
  hitTriggersRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use refs in the animation loop to avoid stale closure issues
  const stateRef = useRef({
    tracks,
    isPlaying,
    currentStepIndex,
    currentMeasure,
    maxTicks,
    lang,
    isMetroOn,
    activeCircleIdByInst,
    totalMeasures,
    activePatternIdByInst,
    hitTriggersRef,
  });

  useEffect(() => {
    stateRef.current = {
      tracks,
      isPlaying,
      currentStepIndex,
      currentMeasure,
      maxTicks,
      lang,
      isMetroOn,
      activeCircleIdByInst,
      totalMeasures,
      activePatternIdByInst,
      hitTriggersRef,
    };
  }, [tracks, isPlaying, currentStepIndex, currentMeasure, maxTicks, lang, isMetroOn, activeCircleIdByInst, totalMeasures, activePatternIdByInst, hitTriggersRef]);

  // Handle click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Translate click to real coordinate system of size 1200 x 1200
    const mouseX = (e.clientX - rect.left) * (1200 / rect.width);
    const mouseY = (e.clientY - rect.top) * (1200 / rect.height);

    const centerX = 600;
    const centerY = 600;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Toggle Play when clicking center area
    if (distance < 55) {
      onTogglePlay();
      return;
    }

    const currentTracks = stateRef.current.tracks;

    // Detect click on any track
    currentTracks.forEach((track) => {
      if (track.isHidden) return;
      
      const activePatternId = stateRef.current.activePatternIdByInst[track.instrumentIdx] || track.selectedPatternId;
      const activePattern = track.patterns.find(p => p.id === activePatternId);
      if (!activePattern) return;

      if (Math.abs(distance - (track.radius || 0)) < 18) {
        let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
        if (clickAngle < 0) clickAngle += Math.PI * 2;

        const stepAngleSize = (Math.PI * 2) / activePattern.steps;

        for (let i = 0; i < activePattern.steps; i++) {
          const targetAngle = i * stepAngleSize;
          let angleDiff = Math.abs(clickAngle - targetAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          // Inside target step hitbox
          if (angleDiff < stepAngleSize / 2) {
            const inst = instrumentsConfig[track.instrumentIdx];
            const currentVal = activePattern.activeSteps[i];

            if (inst.id === 'mineiro') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'p';
              else if (currentVal === 'p') nextState = 'P';
              else if (currentVal === 'P') nextState = 't';
              else if (currentVal === 't') nextState = 'T';
              onStepChange(track.id, activePattern.id, i, nextState);
            } else if (inst.id === 'agbe') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'g';
              else if (currentVal === 'g') nextState = 'G';
              else if (currentVal === 'G') nextState = 'd';
              else if (currentVal === 'd') nextState = 'D';
              else if (currentVal === 'D') nextState = 'b';
              else if (currentVal === 'b') nextState = 's';
              onStepChange(track.id, activePattern.id, i, nextState);
            } else if (inst.type === 'gongue') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'grv';
              else if (currentVal === 'grv') nextState = 'GRV';
              else if (currentVal === 'GRV') nextState = 'aig';
              else if (currentVal === 'aig') nextState = 'AIG';
              else if (currentVal === 'AIG') nextState = 'b';
              onStepChange(track.id, activePattern.id, i, nextState);
            } else if (inst.type === 'voice') {
              // Dialog prompt to customize vocals
              const currentNote = (activePattern.notes && activePattern.notes[i]) ? activePattern.notes[i] + ':' : '';
              const lyricPrompt = currentNote + (currentVal === 'P' ? '*' : '') + (activePattern.lyrics[i] || '');
              const typed = window.prompt(langPromptVoiceText, lyricPrompt);

              if (typed !== null) {
                const trimmed = typed.trim();
                if (trimmed === '') {
                  onStepChange(track.id, activePattern.id, i, 0, '', '');
                } else {
                  let parsedNote = '';
                  let parsedSyllable = trimmed;

                  if (trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    parsedNote = parts[0].trim();
                    parsedSyllable = parts[1].trim();
                    if (/^[a-gA-G][#b]?$/.test(parsedNote)) {
                      parsedNote += '4';
                    }
                  }

                  let activeType = 'C';
                  if (parsedSyllable.startsWith('*')) {
                    activeType = 'P';
                    parsedSyllable = parsedSyllable.substring(1).substring(0, 15);
                  } else {
                    parsedSyllable = parsedSyllable.substring(0, 15);
                  }

                  onStepChange(track.id, activePattern.id, i, activeType, parsedSyllable, parsedNote.toUpperCase());
                }
              }
            } else if (inst.id === 'caixa') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'd';
              else if (currentVal === 'd') nextState = 'D';
              else if (currentVal === 'D') nextState = 'g';
              else if (currentVal === 'g') nextState = 'G';
              else if (currentVal === 'G') nextState = 'rd';
              else if (currentVal === 'rd') nextState = 'rg';
              else if (currentVal === 'rg') nextState = 'x';
              else if (currentVal === 'x') nextState = 'f';
              else if (currentVal === 'f') nextState = 'b';
              onStepChange(track.id, activePattern.id, i, nextState);
            } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'd';
              else if (currentVal === 'd') nextState = 'D';
              else if (currentVal === 'D') nextState = 'g';
              else if (currentVal === 'g') nextState = 'G';
              else if (currentVal === 'G') nextState = 'b';
              else if (currentVal === 'b') nextState = 'x';
              else if (currentVal === 'x') nextState = 'i';
              onStepChange(track.id, activePattern.id, i, nextState);
            } else {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'd';
              else if (currentVal === 'd') nextState = 'D';
              else if (currentVal === 'D') nextState = 'g';
              else if (currentVal === 'g') nextState = 'G';
              onStepChange(track.id, activePattern.id, i, nextState);
            }
            return;
          }
        }
      }
    });
  };

  // Canvas render animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let flashAlpha = 0;
    let stickAngle = -Math.PI / 2;
    let lastFlashBeat = -1;

    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
      speed: number;
    }
    let ripples: Ripple[] = [];

    const drawLoop = () => {
      const { 
        tracks: currentTracks, 
        isPlaying: localPlaying, 
        currentStepIndex: localStep, 
        maxTicks: localTicks, 
        isMetroOn: localMetroOn, 
        activePatternIdByInst: localActiveByInst,
        hitTriggersRef: localHitTriggers 
      } = stateRef.current;

      // Consume hit triggers to create ripples
      if (localHitTriggers && localHitTriggers.current.length > 0) {
        const hits = localHitTriggers.current.splice(0, localHitTriggers.current.length);
        hits.forEach(hit => {
          const track = currentTracks.find(t => t.id === hit.trackId);
          if (track && !track.isHidden && !track.isMute) {
            const inst = instrumentsConfig[track.instrumentIdx];
            const color = inst.colors[hit.state as any] || '#1a1a1a';
            const activePatternId = localActiveByInst[track.instrumentIdx] || track.patterns[0].id;
            const activePattern = track.patterns.find(p => p.id === activePatternId) || track.patterns[0];
            const angle = -Math.PI / 2 + ((hit.stepIndex / activePattern.steps) * Math.PI * 2);
            const radius = track.radius || 0;
            const x = 600 + Math.cos(angle) * radius;
            const y = 600 + Math.sin(angle) * radius;

            ripples.push({
              x, y,
              radius: 6,
              maxRadius: 25 + (track.volumeVal / 100) * 15,
              alpha: 0.6 * (track.volumeVal / 100),
              color: color,
              speed: 1.0 + Math.random() * 0.5
            });
          }
        });
      }

      const centerX = 600;
      const centerY = 600;

      ctx.clearRect(0, 0, 1200, 1200);

      // Cordel style Alfaia Drum
      const drumRadius = 560;
      const rimRadius = 540;
      const innerSkinRadius = 522;

      // 1. Ropes (Cordas) - drawn with black ink style
      const numCords = 16;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < numCords; i++) {
        const a1 = (i * Math.PI * 2) / numCords;
        const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
        
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(a1) * (rimRadius - 5), centerY + Math.sin(a1) * (rimRadius - 5));
        ctx.lineTo(centerX + Math.cos(a2) * drumRadius, centerY + Math.sin(a2) * drumRadius);
        const a3 = ((i + 1) * Math.PI * 2) / numCords;
        ctx.lineTo(centerX + Math.cos(a3) * (rimRadius - 5), centerY + Math.sin(a3) * (rimRadius - 5));
        ctx.stroke();
      }

      // 2. Wooden Rim (Aro) - flat dark wood that fits Cordel
      ctx.beginPath();
      ctx.arc(centerX, centerY, rimRadius, 0, Math.PI * 2);
      ctx.lineWidth = 36;
      ctx.strokeStyle = '#2c1e16'; // Very dark wood brown
      ctx.stroke();

      // Rim ink outlines
      ctx.beginPath();
      ctx.arc(centerX, centerY, rimRadius - 18, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1a1a1a';
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, rimRadius + 18, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1a1a1a';
      ctx.stroke();

      // 3. Animal Skin (Couro) - Cream paper
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 236, 216, 0.85)';
      ctx.fill();

      // Skin edge ink shadow
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#1a1a1a';
      ctx.stroke();

      // Inner decorative ring (Cordel style dashes)
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerSkinRadius - 15, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#1a1a1a';
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Render Time markers around the rim
      const sigValue = (localTicks === 144) ? '12/8' : (localTicks === 72 ? '3/4' : (localTicks === 48 ? '2/4' : '4/4'));
      const markers = getMarkers(sigValue as any, localTicks);
      markers.forEach((tick, idx) => {
        const angle = -Math.PI / 2 + ((tick / localTicks) * Math.PI * 2);
        const inRad = innerSkinRadius - 35, outRad = innerSkinRadius - 20;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * inRad, centerY + Math.sin(angle) * inRad);
        ctx.lineTo(centerX + Math.cos(angle) * outRad, centerY + Math.sin(angle) * outRad);
        ctx.strokeStyle = (tick === 0) ? '#1a1a1a' : 'rgba(26,26,26,0.3)';
        ctx.lineWidth = (tick === 0) ? 4 : 2;
        ctx.stroke();

        const textRad = innerSkinRadius - 50;
        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const strVal = (idx + 1).toString();
        ctx.fillText(strVal, centerX + Math.cos(angle) * textRad, centerY + Math.sin(angle) * textRad);
      });

      // Metronome Flash (if active)
      if (localMetroOn && flashAlpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26, 26, 26, ${flashAlpha * 0.15})`;
        ctx.fill();
        ctx.restore();
      }

      // Animated golden beat indicators glow
      const ticksPerBeat = localTicks / markers.length;
      const currentBeat = localStep >= 0 ? Math.floor(localStep / ticksPerBeat) : -1;
      
      if (localPlaying && localMetroOn && currentBeat !== -1 && currentBeat !== lastFlashBeat) {
        flashAlpha = 1.0;
        lastFlashBeat = currentBeat;
      } else if (!localPlaying) {
        lastFlashBeat = -1;
      }

      if (flashAlpha > 0) {
        flashAlpha -= 0.05;
      }

      // Rotate Drumstick indicating active play head step
      if (localPlaying && localStep !== -1) {
        stickAngle = -Math.PI / 2 + ((localStep / localTicks) * Math.PI * 2);
      } else if (localStep === -1) {
        stickAngle = -Math.PI / 2;
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(stickAngle);
      const stickLength = currentTracks.length > 0 ? (currentTracks[currentTracks.length - 1].radius || 0) + 35 : 120;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(stickLength - 10, -1);
      ctx.lineTo(stickLength - 10, 1);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(stickLength - 5, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
      ctx.restore();

      // Dynamic scale multiplier
      const maxTracks = 10;
      const countClamped = Math.min(currentTracks.length, maxTracks);
      const dynamicScale = currentTracks.length > 0 ? 1 + ((maxTracks - countClamped) * 0.08) : 1;

      // Render Ripples (Ondes de choc)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.015;
        if (r.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.min(1, r.alpha);
        ctx.strokeStyle = r.color;
        ctx.stroke();
        ctx.restore();
      }

      // Render concentric sequencer tracks
      currentTracks.forEach((track) => {
        if (track.isHidden) return;

        const activePatternId = localActiveByInst[track.instrumentIdx] || track.selectedPatternId;
        const activePattern = track.patterns.find(p => p.id === activePatternId);
        if (!activePattern) return;

        const inst = instrumentsConfig[track.instrumentIdx];
        const hasSolo = currentTracks.some(t => t.isSolo);
        const hasAnyNotes = activePattern.activeSteps.some(s => s !== 0);
        // Muted or solo logic
        const isMutedOut = hasSolo ? !track.isSolo : track.isMute;
        // "Waiting" = another track of same instrument is currently active
        const groupActiveId = localActiveByInst[track.instrumentIdx];
        const isWaiting = localPlaying && groupActiveId !== undefined && groupActiveId !== null && groupActiveId !== activePatternId;
        const isActiveState = !isMutedOut && hasAnyNotes;

        ctx.save();
        ctx.globalAlpha = isWaiting ? 0.15 : (isActiveState ? 1.0 : 0.25);
        ctx.beginPath();
        const tRad = track.radius || 0;
        ctx.arc(centerX, centerY, tRad, 0, Math.PI * 2);
        ctx.strokeStyle = track.isSolo ? '#1a1a1a' : 'rgba(26,26,26,0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        const currentStep = (localPlaying && localStep >= 0) ? Math.floor((localStep / localTicks) * activePattern.steps) : -1;

        for (let i = 0; i < activePattern.steps; i++) {
          const stepAngle = -Math.PI / 2 + (i * (Math.PI * 2 / activePattern.steps));
          const x = centerX + Math.cos(stepAngle) * tRad;
          const y = centerY + Math.sin(stepAngle) * tRad;

          const state = activePattern.activeSteps[i];
          let fillColor = 'rgba(255,255,255,0.2)';
          let radiusSize = 6 * dynamicScale;
          let isAccent = false;
          let textSymbol = String(state);

          if (state !== 0) {
            radiusSize = 13 * dynamicScale;
            if (inst.type === 'voice') {
              radiusSize = 22 * dynamicScale;
              fillColor = (state === 'P') ? inst.colors['P'] : inst.colors['C'];
              let syl = activePattern.lyrics[i] || 'X';
              textSymbol = String(syl).endsWith('-') ? String(syl).slice(0, -1) : String(syl);
            } else {
              const stateStr = String(state);
              fillColor = inst.colors[state] || '#fff';
              isAccent = (stateStr === stateStr.toUpperCase());
              radiusSize = (isAccent ? 15 : 12) * dynamicScale;

              if (inst.type === 'gongue') {
                if (state === 'GRV') textSymbol = 'G';
                else if (state === 'grv') textSymbol = 'g';
                else if (state === 'AIG') textSymbol = 'A';
                else if (state === 'aig') textSymbol = 'a';
              } else if (inst.id === 'mineiro') {
                if (stateStr.toLowerCase() === 'p') textSymbol = '↑';
                else if (stateStr.toLowerCase() === 't') textSymbol = '↓';
              } else if (inst.id === 'agbe') {
                if (stateStr.toLowerCase() === 'g') textSymbol = '←';
                else if (stateStr.toLowerCase() === 'd') textSymbol = '→';
              }
            }
          }

          // Highlight playhead match step
          if (i === currentStep) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#8b2a1a';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Accent ring decoration
          if (isAccent) {
            ctx.beginPath();
            ctx.arc(x, y, radiusSize + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(x, y, radiusSize, 0, Math.PI * 2);
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Render letter/direction marker on top of step
          if (state !== 0) {
            let txtColor = inst.type === 'voice' ? '#1a1a1a' : '#f4ecd8';
            ctx.fillStyle = txtColor;
            const fontSize = Math.max(10, Math.floor((textSymbol.length > 1 ? 15 : 20) * dynamicScale * 0.9));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(textSymbol, x, y + 2);
          }

          // Name overlay on step 0
          if (i === 0) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#1a1a1a';
            ctx.font = 'bold 10px serif';
            ctx.textAlign = 'left';
            let labelText = inst.name;
            const identicals = currentTracks.filter(t => t.instrumentIdx === track.instrumentIdx);
            if (identicals.length > 1) {
              labelText += ` ${identicals.indexOf(track) + 1}`;
            }
            if (track.patterns.length > 1) {
              labelText += ` (P${track.patterns.findIndex(p => p.id === activePatternId) + 1})`;
            }
            ctx.fillText(labelText, x + 20, y + 3);
            ctx.restore();
          }
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(drawLoop);
    };

    drawLoop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      id="circle-sequencer-panel"
      className="flex-grow flex items-center justify-center bg-[#0a0807] relative p-2.5 overflow-hidden w-full h-full select-none"
      style={{
        backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex-1 min-h-0 relative w-full h-full max-w-[800px] mx-auto flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1200}
          height={1200}
          onClick={handleCanvasClick}
          className="max-w-full max-h-full aspect-square cursor-pointer block select-none"
        />
      </div>
      <div className="absolute top-2 right-3 text-[10px] text-[#eaddcf]/40 pointer-events-none select-none font-medium tracking-wide">
        Créé par Julian Biblocq | Art: Toni Braga
      </div>
    </div>
  );
};
