/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Circle, Language } from '../types';
import { instrumentsConfig, getMarkers, ASSETS_BASE_URL } from '../data';

interface CircleSequencerProps {
  lang: Language;
  circles: Circle[];
  isPlaying: boolean;
  currentStepIndex: number;
  maxTicks: number;
  onTogglePlay: () => void;
  onStepChange: (circleId: number, stepIdx: number, newState: string | number, lyric?: string, note?: string) => void;
  langPromptVoiceText: string;
  isMetroOn?: boolean;
  activeCircleIdByInst?: { [instIdx: number]: number | null };
}

export const CircleSequencer: React.FC<CircleSequencerProps> = ({
  lang,
  circles,
  isPlaying,
  currentStepIndex,
  maxTicks,
  onTogglePlay,
  onStepChange,
  langPromptVoiceText,
  isMetroOn,
  activeCircleIdByInst,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use refs in the animation loop to avoid stale closure issues
  const stateRef = useRef({
    circles,
    isPlaying,
    currentStepIndex,
    maxTicks,
    lang,
    isMetroOn,
    activeCircleIdByInst,
  });

  useEffect(() => {
    stateRef.current = {
      circles,
      isPlaying,
      currentStepIndex,
      maxTicks,
      lang,
      isMetroOn,
      activeCircleIdByInst,
    };
  }, [circles, isPlaying, currentStepIndex, maxTicks, lang, isMetroOn, activeCircleIdByInst]);

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

    const currentCircles = stateRef.current.circles;

    // Detect click on any circle track
    currentCircles.forEach((circle) => {
      if (circle.isHidden) return;
      if (Math.abs(distance - circle.radius) < 18) {
        let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
        if (clickAngle < 0) clickAngle += Math.PI * 2;

        const stepAngleSize = (Math.PI * 2) / circle.steps;

        for (let i = 0; i < circle.steps; i++) {
          const targetAngle = i * stepAngleSize;
          let angleDiff = Math.abs(clickAngle - targetAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          // Inside target step hitbox
          if (angleDiff < stepAngleSize / 2) {
            const inst = instrumentsConfig[circle.instrumentIdx];
            const currentVal = circle.activeSteps[i];

            if (inst.id === 'mineiro') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'p';
              else if (currentVal === 'p') nextState = 'P';
              else if (currentVal === 'P') nextState = 't';
              else if (currentVal === 't') nextState = 'T';
              onStepChange(circle.id, i, nextState);
            } else if (inst.id === 'agbe') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'g';
              else if (currentVal === 'g') nextState = 'G';
              else if (currentVal === 'G') nextState = 'd';
              else if (currentVal === 'd') nextState = 'D';
              onStepChange(circle.id, i, nextState);
            } else if (inst.type === 'gongue') {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'grv';
              else if (currentVal === 'grv') nextState = 'GRV';
              else if (currentVal === 'GRV') nextState = 'aig';
              else if (currentVal === 'aig') nextState = 'AIG';
              onStepChange(circle.id, i, nextState);
            } else if (inst.type === 'voice') {
              // Dialog prompt to customize vocals
              const currentNote = (circle.notes && circle.notes[i]) ? circle.notes[i] + ':' : '';
              const lyricPrompt = currentNote + (currentVal === 'P' ? '*' : '') + (circle.lyrics[i] || '');
              const typed = window.prompt(langPromptVoiceText, lyricPrompt);

              if (typed !== null) {
                const trimmed = typed.trim();
                if (trimmed === '') {
                  onStepChange(circle.id, i, 0, '', '');
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

                  onStepChange(circle.id, i, activeType, parsedSyllable, parsedNote.toUpperCase());
                }
              }
            } else {
              let nextState: string | number = 0;
              if (currentVal === 0) nextState = 'd';
              else if (currentVal === 'd') nextState = 'D';
              else if (currentVal === 'D') nextState = 'g';
              else if (currentVal === 'g') nextState = 'G';
              onStepChange(circle.id, i, nextState);
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

    const drawLoop = () => {
      const { circles: activeCircles, isPlaying: localPlaying, currentStepIndex: localStep, maxTicks: localTicks, lang: localLang, isMetroOn: localMetroOn, activeCircleIdByInst: localActiveByInst } = stateRef.current;

      ctx.clearRect(0, 0, 1200, 1200);
      const centerX = 600;
      const centerY = 600;

      ctx.save();
      ctx.save();
      // Drop shadow for the whole drum
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 15;

      const drumRadius = 560;
      const rimRadius = 540;
      const innerSkinRadius = 522;

      // 1. Alfaia Body Outer Edge (underneath ropes)
      ctx.beginPath();
      ctx.arc(centerX, centerY, drumRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1c110a';
      ctx.fill();

      // Reset shadow for internal elements
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 2. Ropes (Cordas) - drawn over the body edge, pulling the rim
      const numCords = 16;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#cda579'; // Natural sisal/rope color
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < numCords; i++) {
        const a1 = (i * Math.PI * 2) / numCords;
        const a2 = ((i + 0.5) * Math.PI * 2) / numCords;
        
        // Rope going down and out
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(a1) * (rimRadius - 5), centerY + Math.sin(a1) * (rimRadius - 5));
        ctx.lineTo(centerX + Math.cos(a2) * drumRadius, centerY + Math.sin(a2) * drumRadius);
        const a3 = ((i + 1) * Math.PI * 2) / numCords;
        ctx.lineTo(centerX + Math.cos(a3) * (rimRadius - 5), centerY + Math.sin(a3) * (rimRadius - 5));
        ctx.stroke();

        // Add a slight shadow/highlight to the rope
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ebd1b7';
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#cda579';
      }

      // 3. Wooden Rim (Aro de madeira)
      const woodGradient = ctx.createRadialGradient(centerX, centerY, innerSkinRadius, centerX, centerY, drumRadius);
      woodGradient.addColorStop(0, '#2e190e'); // dark inner edge
      woodGradient.addColorStop(0.3, '#5c351c'); // main wood color
      woodGradient.addColorStop(0.7, '#4a2914'); // grain variation
      woodGradient.addColorStop(1, '#1f1008'); // dark outer edge

      ctx.beginPath();
      ctx.arc(centerX, centerY, rimRadius, 0, Math.PI * 2);
      ctx.lineWidth = 36;
      ctx.strokeStyle = woodGradient;
      ctx.stroke();

      // Wood rim highlights/shadows for 3D effect
      ctx.beginPath();
      ctx.arc(centerX, centerY, rimRadius - 17, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, rimRadius + 17, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();

      // 4. Animal Skin (Couro)
      const skinGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerSkinRadius);
      // Keep it dark enough for the sequencer to be highly visible, but with a natural tone
      skinGradient.addColorStop(0, '#26201b'); 
      skinGradient.addColorStop(0.6, '#1a1512');
      skinGradient.addColorStop(0.9, '#120d0a');
      skinGradient.addColorStop(1, '#080504');

      ctx.beginPath();
      ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
      ctx.fillStyle = skinGradient;
      ctx.fill();

      // Add subtle skin texture (nuances) - Pre-calculated or removed to avoid flickering
      // Removed the random loop since it causes 60fps flickering without a cached texture.

      // Skin edge shadow (where it meets the rim)
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerSkinRadius, 0, Math.PI * 2);
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.stroke();

      // Render Time markers around the rim
      const sigValue = (localTicks === 144) ? '12/8' : (localTicks === 72 ? '3/4' : (localTicks === 48 ? '2/4' : '4/4'));
      const markers = getMarkers(sigValue as any, localTicks);
      markers.forEach((tick, idx) => {
        const angle = -Math.PI / 2 + ((tick / localTicks) * Math.PI * 2);
        const inRad = 525, outRad = 538;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * inRad, centerY + Math.sin(angle) * inRad);
        ctx.lineTo(centerX + Math.cos(angle) * outRad, centerY + Math.sin(angle) * outRad);
        ctx.strokeStyle = (tick === 0) ? '#f1c40f' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = (tick === 0) ? 4 : 2;
        ctx.stroke();

        const textRad = 548;
        ctx.fillStyle = (tick === 0) ? '#f1c40f' : 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const strVal = (idx + 1).toString();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(strVal, centerX + Math.cos(angle) * textRad, centerY + Math.sin(angle) * textRad);
        ctx.fillText(strVal, centerX + Math.cos(angle) * textRad, centerY + Math.sin(angle) * textRad);
      });

      // Metronome Halo
      if (localMetroOn) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 566, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.3)';
        ctx.lineWidth = 6;
        ctx.shadowColor = 'rgba(241, 196, 15, 0.8)';
        ctx.shadowBlur = 15;
        ctx.stroke();
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
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 568, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(241, 196, 15, ${flashAlpha})`;
        ctx.lineWidth = 4 + (flashAlpha * 6);
        ctx.shadowColor = 'rgba(241, 196, 15, 1)';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
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
      const stickLength = activeCircles.length > 0 ? activeCircles[activeCircles.length - 1].radius + 35 : 120;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(stickLength - 20, -4);
      ctx.lineTo(stickLength - 20, 4);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fillStyle = '#e0ae6f';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(stickLength - 10, 0, 10, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#c69552';
      ctx.fill();
      ctx.restore();

      // Dynamic scale multiplier
      const maxTracks = 10;
      const countClamped = Math.min(activeCircles.length, maxTracks);
      const dynamicScale = activeCircles.length > 0 ? 1 + ((maxTracks - countClamped) * 0.08) : 1;

      // Render concentric sequencer tracks
      activeCircles.forEach((circle) => {
        if (circle.isHidden) return;

        const inst = instrumentsConfig[circle.instrumentIdx];
        const hasSolo = activeCircles.some(c => c.isSolo);
        const hasAnyNotes = circle.activeSteps.some(s => s !== 0);
        // Muted or solo logic
        const isMutedOut = hasSolo ? !circle.isSolo : circle.isMute;
        // "Waiting" = another circle of same instrument is currently active
        const groupActiveId = localActiveByInst ? localActiveByInst[circle.instrumentIdx] : undefined;
        const isWaiting = localPlaying && groupActiveId !== undefined && groupActiveId !== null && groupActiveId !== circle.id;
        const isActiveState = !isMutedOut && hasAnyNotes;

        ctx.save();
        ctx.globalAlpha = isWaiting ? 0.08 : (isActiveState ? 1.0 : 0.05);
        ctx.beginPath();
        ctx.arc(centerX, centerY, circle.radius, 0, Math.PI * 2);
        ctx.strokeStyle = circle.isSolo ? '#f1c40f' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const currentStep = (localPlaying && localStep >= 0) ? Math.floor((localStep / localTicks) * circle.steps) : -1;

        for (let i = 0; i < circle.steps; i++) {
          const stepAngle = -Math.PI / 2 + (i * (Math.PI * 2 / circle.steps));
          const x = centerX + Math.cos(stepAngle) * circle.radius;
          const y = centerY + Math.sin(stepAngle) * circle.radius;

          const state = circle.activeSteps[i];
          let fillColor = 'rgba(255,255,255,0.2)';
          let radiusSize = 6 * dynamicScale;
          let isAccent = false;
          let textSymbol = String(state);

          if (state !== 0) {
            radiusSize = 13 * dynamicScale;
            if (inst.type === 'voice') {
              fillColor = (state === 'P') ? inst.colors['P'] : inst.colors['C'];
              let syl = circle.lyrics[i] || 'X';
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
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.7)';
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
          ctx.strokeStyle = '#121212';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Render letter/direction marker on top of step
          if (state !== 0) {
            let txtColor = inst.colors.text || '#fff';
            if (inst.id === 'gongue' && (state === 'aig' || state === 'AIG')) {
              txtColor = '#000000';
            }
            if (inst.type === 'voice') {
              txtColor = '#121212';
            }

            ctx.fillStyle = txtColor;
            const fontSize = Math.max(10, Math.floor(((inst.type === 'shake' || inst.id === 'agbe') ? 16 : 14) * dynamicScale * 0.9));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(textSymbol.substring(0, 15), x, y + 1);
          }

          // Name overlay on step 0
          if (i === 0) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#bbb';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'left';
            let labelText = inst.name;
            const identicals = activeCircles.filter(c => c.instrumentIdx === circle.instrumentIdx);
            if (identicals.length > 1) {
              labelText += ` ${identicals.indexOf(circle) + 1}`;
            }
            ctx.fillText(labelText, x + 20, y + 3);
            ctx.restore();
          }
        }
        ctx.restore();
      });

      // Play / Pause central button
      ctx.beginPath();
      ctx.arc(centerX, centerY, 55, 0, Math.PI * 2);
      ctx.fillStyle = localPlaying ? 'rgba(231, 76, 60, 0.9)' : 'rgba(46, 204, 113, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#121212';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(localPlaying ? '⏸' : '▶', localPlaying ? centerX : centerX + 5, centerY + 2);

      animId = requestAnimationFrame(drawLoop);
    };

    let isStepChangeDetected = false;
    let priorStep = -1;

    const tickWatcher = () => {
      const { currentStepIndex: step } = stateRef.current;
      if (step !== priorStep) {
        isStepChangeDetected = true;
        priorStep = step;
      }
      setTimeout(tickWatcher, 1);
    };

    tickWatcher();
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
      <canvas
        ref={canvasRef}
        width={1200}
        height={1200}
        onClick={handleCanvasClick}
        className="max-w-full max-h-full aspect-square cursor-pointer block select-none"
      />
      <div className="absolute top-2 right-3 text-[10px] text-[#eaddcf]/40 pointer-events-none select-none font-medium tracking-wide">
        Créé par Julian Biblocq | Art: Toni Braga
      </div>
    </div>
  );
};
