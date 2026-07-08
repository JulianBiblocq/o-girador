import { useSequencerStore } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState, useRef } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig } from '../data';

// Import SVG components
import {
  AlfaiaMacaneta,
  AlfaiaBacalhau,
  DrumStick,
  TimbalHandLeft,
  TimbalHandRight,
  GongueStick,
  MineiroStick,
} from './AoVivo/InstrumentGraphics';

import {
  generateAlfaiaKeyframes,
  generateDrumKeyframes,
  generateGongueKeyframes,
  generateMineiroKeyframes,
  generateAgbeKeyframes,
  KEYFRAMES_TIMBAL_G,
  KEYFRAMES_TIMBAL_A,
  KEYFRAMES_TIMBAL_S,
  KEYFRAMES_TIMBAL_S_WEAK,
  KEYFRAMES_TIMBAL_D,
  KEYFRAMES_TIMBAL_P,
  KEYFRAMES_AGBE_STRETCH_Y_STRONG,
  KEYFRAMES_AGBE_STRETCH_Y_WEAK,
  KEYFRAMES_AGBE_STRETCH_X_STRONG,
  KEYFRAMES_AGBE_STRETCH_X_WEAK,
  KEYFRAMES_AGBE_SHAKE,
  KEYFRAMES_HALO,
} from './AoVivo/animationGenerators';

const EMPTY_ARRAY: any[] = [];

// Inner animation component.
// Only mounted when isEco is false and activeAoVivoTrackId is not null.
// This guarantees that no animation hooks are executed when animations are inactive.
const AoVivoOverlayInner: React.FC<{ activeAoVivoTrackId: string | number }> = ({ activeAoVivoTrackId }) => {
  const { isLeftHanded, activeVariationsRef, lang } = useSequencer();
  const tracks = useSequencerStore(useShallow(state => {
    return state.tracks.filter(t => t.id === activeAoVivoTrackId);
  }));

  const activeTrack = tracks.find(t => t.id === activeAoVivoTrackId);
  const inst = activeTrack ? instrumentsConfig[activeTrack.instrumentIdx] : undefined;

  // Lower frequency React states (only update when the pattern structure changes at measure boundaries)
  const [currentPatternId, setCurrentPatternId] = useState<number | null>(null);
  const [currentMeasureIdx, setCurrentMeasureIdx] = useState<number>(-1);

  // References to static DOM elements to avoid React re-renders (Zero Render Thrashing)
  const leftWrapperRef = useRef<HTMLDivElement>(null);
  const rightWrapperRef = useRef<HTMLDivElement>(null);
  const mineiroWrapperRef = useRef<HTMLDivElement>(null);
  const agbeWrapperRef = useRef<HTMLDivElement>(null);
  const gongueWrapperRef = useRef<HTMLDivElement>(null);
  const voiceWrapperRef = useRef<HTMLDivElement>(null);

  const leftStickRef = useRef<SVGSVGElement>(null);
  const rightStickRef = useRef<SVGSVGElement>(null);
  const mineiroStickRef = useRef<SVGSVGElement>(null);
  const agbeWholeRef = useRef<SVGGElement>(null);
  const agbeLeftRef = useRef<SVGGElement>(null);
  const agbeRightRef = useRef<SVGGElement>(null);
  const agbeTopRef = useRef<SVGGElement>(null);
  const agbeBottomRef = useRef<SVGGElement>(null);
  const gongueStickRef = useRef<SVGSVGElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  // Layout target position and geometry cache (Zero Layout Thrashing)
  const geometryRef = useRef({ targetX: 0, targetY: 0, width: 0, height: 0 });

  // Sync refs for the o-girador-tick event listener closure
  const currentPatternIdRef = useRef<number | null>(null);
  const currentMeasureIdxRef = useRef<number>(-1);
  const lastVuStepRef = useRef<number>(-1);

  // Early return if active track or instrument config is missing, after hooks are declared
  if (!activeTrack || !inst) return null;

  // --- PASSIVE RESIZE OBSERVER (0 LAYOUT THRASHING) ---
  useEffect(() => {
    const updateGeometry = () => {
      const panel = document.getElementById('circle-sequencer-panel');
      if (!panel) return;
      
      const rect = panel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const targetX = centerX;
      const targetY = centerY + 20;

      const width = window.innerWidth;
      const height = window.innerHeight;

      geometryRef.current = { targetX, targetY, width, height };

      // Apply wrapper dimensions directly to DOM elements
      const handSpread = Math.min(width * 0.45, 550);

      const isTimbal = activeTrack.instrumentIdx !== undefined && instrumentsConfig[activeTrack.instrumentIdx]?.id === 'timbal';
      const xOffset = isTimbal ? 30 : 160;

      if (leftWrapperRef.current) {
        const leftX = targetX - xOffset;
        const leftY = targetY;
        const originLeftX = width / 2 - handSpread;
        const originLeftY = height + 350;
        const dLeftX = leftX - originLeftX;
        const dLeftY = leftY - originLeftY;
        const angleLeft = Math.atan2(dLeftY, dLeftX) * (180 / Math.PI) + 90;
        const distLeft = Math.hypot(dLeftX, dLeftY);

        leftWrapperRef.current.style.left = `${originLeftX}px`;
        leftWrapperRef.current.style.height = `${distLeft}px`;
        leftWrapperRef.current.style.transform = `translateX(-50%) rotate(${angleLeft}deg)`;
      }

      if (rightWrapperRef.current) {
        const rightX = targetX + xOffset;
        const rightY = targetY;
        const originRightX = width / 2 + handSpread;
        const originRightY = height + 350;
        const dRightX = rightX - originRightX;
        const dRightY = rightY - originRightY;
        const angleRight = Math.atan2(dRightY, dRightX) * (180 / Math.PI) + 90;
        const distRight = Math.hypot(dRightX, dRightY);

        rightWrapperRef.current.style.left = `${originRightX}px`;
        rightWrapperRef.current.style.height = `${distRight}px`;
        rightWrapperRef.current.style.transform = `translateX(-50%) rotate(${angleRight}deg)`;
      }

      if (mineiroWrapperRef.current) {
        const offsetVal = width < 400 ? 50 : width < 640 ? 80 : 120;
        mineiroWrapperRef.current.style.left = `${targetX}px`;
        mineiroWrapperRef.current.style.top = `${targetY - offsetVal}px`;
      }

      if (agbeWrapperRef.current) {
        agbeWrapperRef.current.style.left = `${targetX}px`;
        agbeWrapperRef.current.style.top = `${targetY - 30}px`;
      }

      if (voiceWrapperRef.current) {
        voiceWrapperRef.current.style.left = `${targetX}px`;
        voiceWrapperRef.current.style.top = `${targetY}px`;
      }

      if (gongueWrapperRef.current) {
        const offset = isLeftHanded ? -handSpread : handSpread;
        const originX = width / 2 + offset;
        const originY = height + 350;
        const dx = targetX - originX;
        const dy = (targetY - 30) - originY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        const distance = Math.hypot(dx, dy);

        gongueWrapperRef.current.style.left = `${originX}px`;
        gongueWrapperRef.current.style.height = `${distance}px`;
        gongueWrapperRef.current.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      }
    };

    updateGeometry();

    const panel = document.getElementById('circle-sequencer-panel');
    if (!panel) return;

    const resizeObserver = new ResizeObserver(() => {
      updateGeometry();
    });
    resizeObserver.observe(panel);
    window.addEventListener('resize', updateGeometry);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGeometry);
    };
  }, [activeAoVivoTrackId, isLeftHanded, activeTrack]);

  // --- AUDIO TICK LISTENERS AND GPU ANIMATIONS (WAAPI) ---
  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      
      if (step < 0) {
        lastVuStepRef.current = -1;
        // Clean highlights on stop
        if (inst.id === 'voice' && voiceWrapperRef.current) {
          const stepSpans = voiceWrapperRef.current.querySelectorAll('[data-step-idx]');
          stepSpans.forEach(el => el.classList.remove('underline', 'decoration-4', 'underline-offset-4'));
          const wordSpans = voiceWrapperRef.current.querySelectorAll('[data-word-idx]');
          wordSpans.forEach(el => {
            el.classList.add('opacity-40');
            el.classList.remove('text-[#8b2a1a]', 'scale-110', 'transform');
          });
        }
        return;
      }

      const currentLivePattern = activeTrack.patterns.find(p => p.measureAssignments[measure]);
      if (!currentLivePattern) {
        lastVuStepRef.current = -1;
        return;
      }

      // Check if measure pattern changed (low-frequency React render trigger)
      if (currentLivePattern.id !== currentPatternIdRef.current || measure !== currentMeasureIdxRef.current) {
        currentPatternIdRef.current = currentLivePattern.id;
        currentMeasureIdxRef.current = measure;
        setCurrentPatternId(currentLivePattern.id);
        setCurrentMeasureIdx(measure);
      }

      const targetStep = Math.floor(ratio * currentLivePattern.steps);

      // Highlight active steps for Voice (Karaoke) via Vanilla DOM mutations
      if (inst.id === 'voice' && voiceWrapperRef.current) {
        const stepSpans = voiceWrapperRef.current.querySelectorAll('[data-step-idx]');
        stepSpans.forEach((spanEl) => {
          const el = spanEl as HTMLElement;
          const stepIdx = parseInt(el.getAttribute('data-step-idx') || '-1', 10);
          if (stepIdx === targetStep) {
            el.classList.add('underline', 'decoration-4', 'underline-offset-4');
          } else {
            el.classList.remove('underline', 'decoration-4', 'underline-offset-4');
          }
        });

        const wordSpans = voiceWrapperRef.current.querySelectorAll('[data-word-idx]');
        wordSpans.forEach((wordEl) => {
          const el = wordEl as HTMLElement;
          const hasActiveStep = el.querySelector(`[data-step-idx="${targetStep}"]`) !== null;
          if (hasActiveStep) {
            el.classList.remove('opacity-40');
            el.classList.add('text-[#8b2a1a]', 'scale-110', 'transform');
          } else {
            el.classList.add('opacity-40');
            el.classList.remove('text-[#8b2a1a]', 'scale-110', 'transform');
          }
        });
      }

      if (targetStep !== lastVuStepRef.current) {
        lastVuStepRef.current = targetStep;
        if (!activeTrack.isMute) {
          const activePlayingSteps = activeVariationsRef?.current[activeTrack.id] || currentLivePattern.activeSteps;
          const val = activePlayingSteps[targetStep];
          const isHit = val !== undefined && val !== 0 && val !== '0' && val !== '';
          
          if (isHit) {
            const stroke = String(val);
            const isVibrate = stroke === 'b' || stroke === 'B';

            // --- 1. Alfaia Sticks ---
            if (['marcante', 'meiao', 'repique'].includes(inst.id)) {
              let keyframesLeft: Keyframe[] | null = null;
              let keyframesRight: Keyframe[] | null = null;
              let triggerLeft = false;
              let triggerRight = false;
              let animHalo = false;
              let animHaloOffsetY = 0;

              if (isVibrate) {
                keyframesLeft = generateAlfaiaKeyframes(stroke, true);
                keyframesRight = generateAlfaiaKeyframes(stroke, false);
                triggerLeft = true;
                triggerRight = true;
              } else {
                if (stroke === 'D') {
                  if (isLeftHanded) { keyframesLeft = generateAlfaiaKeyframes('D', true); triggerLeft = true; }
                  else { keyframesRight = generateAlfaiaKeyframes('D', false); triggerRight = true; }
                } else if (stroke === 'd') {
                  if (isLeftHanded) { keyframesLeft = generateAlfaiaKeyframes('d', true); triggerLeft = true; }
                  else { keyframesRight = generateAlfaiaKeyframes('d', false); triggerRight = true; }
                } else if (stroke === 'E') {
                  if (isLeftHanded) { keyframesRight = generateAlfaiaKeyframes('E', false); triggerRight = true; }
                  else { keyframesLeft = generateAlfaiaKeyframes('E', true); triggerLeft = true; }
                } else if (stroke === 'e') {
                  if (isLeftHanded) { keyframesRight = generateAlfaiaKeyframes('e', false); triggerRight = true; }
                  else { keyframesLeft = generateAlfaiaKeyframes('e', true); triggerLeft = true; }
                } else if (stroke === 'i' || stroke === 'I') {
                  if (isLeftHanded) { keyframesRight = generateAlfaiaKeyframes(stroke, false); triggerRight = true; }
                  else { keyframesLeft = generateAlfaiaKeyframes(stroke, true); triggerLeft = true; }
                } else if (stroke === 'x' || stroke === 'X') {
                  keyframesLeft = generateAlfaiaKeyframes(stroke, true);
                  keyframesRight = generateAlfaiaKeyframes(stroke, false);
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -100;
                } else if (stroke === 'c' || stroke === 'C') {
                  keyframesLeft = generateAlfaiaKeyframes(stroke, true);
                  keyframesRight = generateAlfaiaKeyframes(stroke, false);
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -150;
                }
              }

              if (triggerLeft && leftStickRef.current && keyframesLeft) {
                leftStickRef.current.animate(keyframesLeft, {
                  duration: isVibrate ? 100 : 350,
                  iterations: isVibrate ? Infinity : 1,
                  easing: isVibrate ? 'linear' : undefined
                });
              }
              if (triggerRight && rightStickRef.current && keyframesRight) {
                rightStickRef.current.animate(keyframesRight, {
                  duration: isVibrate ? 100 : 350,
                  iterations: isVibrate ? Infinity : 1,
                  easing: isVibrate ? 'linear' : undefined
                });
              }
              if (animHalo && haloRef.current) {
                const { targetX, targetY } = geometryRef.current;
                haloRef.current.style.left = `${targetX}px`;
                haloRef.current.style.top = `${targetY + animHaloOffsetY}px`;
                haloRef.current.animate(KEYFRAMES_HALO, { duration: 400, easing: 'ease-out' });
              }
            }

            // --- 2. Caixa / Tarol ---
            else if (['caixa', 'tarol'].includes(inst.id)) {
              let keyframesLeft: Keyframe[] | null = null;
              let keyframesRight: Keyframe[] | null = null;
              let triggerLeft = false;
              let triggerRight = false;
              let animHalo = false;
              let animHaloOffsetY = 0;

              if (isVibrate) {
                keyframesLeft = generateDrumKeyframes(stroke, true);
                keyframesRight = generateDrumKeyframes(stroke, false);
                triggerLeft = true;
                triggerRight = true;
              } else {
                if (stroke === 'D') {
                  if (isLeftHanded) { keyframesLeft = generateDrumKeyframes('D', true); triggerLeft = true; }
                  else { keyframesRight = generateDrumKeyframes('D', false); triggerRight = true; }
                } else if (stroke === 'd') {
                  if (isLeftHanded) { keyframesLeft = generateDrumKeyframes('d', true); triggerLeft = true; }
                  else { keyframesRight = generateDrumKeyframes('d', false); triggerRight = true; }
                } else if (stroke === 'E') {
                  if (isLeftHanded) { keyframesRight = generateDrumKeyframes('E', false); triggerRight = true; }
                  else { keyframesLeft = generateDrumKeyframes('E', true); triggerLeft = true; }
                } else if (stroke === 'e') {
                  if (isLeftHanded) { keyframesRight = generateDrumKeyframes('e', false); triggerRight = true; }
                  else { keyframesLeft = generateDrumKeyframes('e', true); triggerLeft = true; }
                } else if (stroke === 'R' || stroke === 'r') {
                  if (isLeftHanded) { keyframesLeft = generateDrumKeyframes(stroke, true); triggerLeft = true; }
                  else { keyframesRight = generateDrumKeyframes(stroke, false); triggerRight = true; }
                } else if (stroke === 'f' || stroke === 'F') {
                  keyframesLeft = generateDrumKeyframes(stroke, true);
                  keyframesRight = generateDrumKeyframes(stroke, false);
                  triggerLeft = true;
                  triggerRight = true;
                } else if (stroke === 'x' || stroke === 'X') {
                  keyframesLeft = generateDrumKeyframes(stroke, true);
                  keyframesRight = generateDrumKeyframes(stroke, false);
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -100;
                } else if (stroke === 'c' || stroke === 'C') {
                  keyframesLeft = generateDrumKeyframes(stroke, true);
                  keyframesRight = generateDrumKeyframes(stroke, false);
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -150;
                }
              }

              if (triggerLeft && leftStickRef.current && keyframesLeft) {
                leftStickRef.current.animate(keyframesLeft, {
                  duration: isVibrate ? 100 : 350,
                  iterations: isVibrate ? Infinity : 1,
                  easing: isVibrate ? 'linear' : undefined
                });
              }
              if (triggerRight && rightStickRef.current && keyframesRight) {
                rightStickRef.current.animate(keyframesRight, {
                  duration: isVibrate ? 100 : 350,
                  iterations: isVibrate ? Infinity : 1,
                  easing: isVibrate ? 'linear' : undefined
                });
              }
              if (animHalo && haloRef.current) {
                const { targetX, targetY } = geometryRef.current;
                haloRef.current.style.left = `${targetX}px`;
                haloRef.current.style.top = `${targetY + animHaloOffsetY}px`;
                haloRef.current.animate(KEYFRAMES_HALO, { duration: 400, easing: 'ease-out' });
              }
            }

            // --- 2.5 Timbal ---
            else if (inst.id === 'timbal') {
              let keyframesLeft: Keyframe[] = KEYFRAMES_TIMBAL_A;
              let keyframesRight: Keyframe[] = KEYFRAMES_TIMBAL_A;
              let triggerLeft = false;
              let triggerRight = false;
              let animHalo = false;
              let animHaloOffsetY = 0;

              if (isVibrate) {
                keyframesLeft = generateAlfaiaKeyframes(stroke, true); // Fallback to shake
                keyframesRight = generateAlfaiaKeyframes(stroke, false);
                triggerLeft = true;
                triggerRight = true;
              } else {
                const isForte = ['G', 'A', 'S', 'D', 'P'].includes(stroke);
                const isFaible = ['g', 'a', 's', 'd', 'p'].includes(stroke);

                let selectedKeyframes = KEYFRAMES_TIMBAL_A;
                if (stroke === 'G' || stroke === 'g') {
                  selectedKeyframes = KEYFRAMES_TIMBAL_G;
                } else if (stroke === 'A' || stroke === 'a') {
                  selectedKeyframes = KEYFRAMES_TIMBAL_A;
                } else if (stroke === 'S') {
                  selectedKeyframes = KEYFRAMES_TIMBAL_S;
                } else if (stroke === 's') {
                  selectedKeyframes = KEYFRAMES_TIMBAL_S_WEAK;
                } else if (stroke === 'D' || stroke === 'd') {
                  selectedKeyframes = KEYFRAMES_TIMBAL_D;
                } else if (stroke === 'P' || stroke === 'p') {
                  selectedKeyframes = KEYFRAMES_TIMBAL_P;
                }

                if (isForte) {
                  if (isLeftHanded) { keyframesLeft = selectedKeyframes; triggerLeft = true; }
                  else { keyframesRight = selectedKeyframes; triggerRight = true; }
                } else if (isFaible) {
                  if (isLeftHanded) { keyframesRight = selectedKeyframes; triggerRight = true; }
                  else { keyframesLeft = selectedKeyframes; triggerLeft = true; }
                } else if (stroke === 'F' || stroke === 'f') {
                  keyframesLeft = KEYFRAMES_TIMBAL_A;
                  keyframesRight = KEYFRAMES_TIMBAL_A;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -80;
                } else if (stroke === 'V') {
                  keyframesLeft = KEYFRAMES_TIMBAL_S;
                  keyframesRight = KEYFRAMES_TIMBAL_S;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -50;
                } else if (stroke === 'v') {
                  keyframesLeft = KEYFRAMES_TIMBAL_S_WEAK;
                  keyframesRight = KEYFRAMES_TIMBAL_S_WEAK;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -50;
                } else if (stroke === 'C' || stroke === 'c') {
                  keyframesLeft = generateAlfaiaKeyframes('c', true); // Fallback cross
                  keyframesRight = generateAlfaiaKeyframes('c', false);
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -100;
                }
              }

              if (triggerLeft && leftStickRef.current) {
                leftStickRef.current.animate(keyframesLeft, {
                  duration: isVibrate ? 100 : 350,
                  iterations: isVibrate ? Infinity : 1,
                  easing: isVibrate ? 'linear' : undefined
                });
              }
              if (triggerRight && rightStickRef.current) {
                rightStickRef.current.animate(keyframesRight, {
                  duration: isVibrate ? 100 : 350,
                  iterations: isVibrate ? Infinity : 1,
                  easing: isVibrate ? 'linear' : undefined
                });
              }
              if (animHalo && haloRef.current) {
                const { targetX, targetY } = geometryRef.current;
                haloRef.current.style.left = `${targetX}px`;
                haloRef.current.style.top = `${targetY + animHaloOffsetY}px`;
                haloRef.current.animate(KEYFRAMES_HALO, { duration: 400, easing: 'ease-out' });
              }
            }

            // --- 3. Mineiro ---
            else if (inst.id === 'mineiro') {
              const keyframes = generateMineiroKeyframes(stroke);

              if (mineiroStickRef.current) {
                mineiroStickRef.current.animate(keyframes, {
                  duration: 300,
                  fill: 'forwards'
                });
              }
            }

            // --- 4. Agbê ---
            else if (inst.id === 'agbe') {
              if (agbeWholeRef.current && agbeLeftRef.current && agbeRightRef.current && agbeTopRef.current && agbeBottomRef.current) {
                agbeWholeRef.current.style.display = 'block';
                agbeLeftRef.current.style.display = 'none';
                agbeRightRef.current.style.display = 'none';
                agbeTopRef.current.style.display = 'none';
                agbeBottomRef.current.style.display = 'none';

                const keyframes = generateAgbeKeyframes(stroke);
                agbeWholeRef.current.animate(keyframes, {
                  duration: 350,
                  easing: 'linear'
                });
              }
            }

            // --- 5. Gonguê ---
            else if (inst.id === 'gongue') {
              const { targetX, targetY, width, height } = geometryRef.current;
              const handSpread = Math.min(width * 0.45, 550);
              const offset = isLeftHanded ? -handSpread : handSpread;
              
              const hitTargetY = (stroke === 'G' || stroke === 'g') ? targetY - 300 : (stroke === 'A' || stroke === 'a') ? targetY + 250 : targetY - 30;
              const hitTargetX = targetX;

              const originX = width / 2 + offset;
              const originY = height + 350;

              const dx = hitTargetX - originX;
              const dy = hitTargetY - originY;
              const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
              const distance = Math.hypot(dx, dy);

              if (gongueWrapperRef.current) {
                gongueWrapperRef.current.style.left = `${originX}px`;
                gongueWrapperRef.current.style.height = `${distance}px`;
                gongueWrapperRef.current.style.transform = `translateX(-50%) rotate(${angle}deg)`;
              }

              const keyframes = generateGongueKeyframes(stroke);

              if (gongueStickRef.current) {
                gongueStickRef.current.animate(keyframes, {
                  duration: 150,
                  easing: 'linear'
                });
              }
            }
          }
        }
      }
    };

    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
    };
  }, [activeAoVivoTrackId, isLeftHanded, activeTrack, inst]);

  // static helper for Agbê net rendering
  const renderNet = () => {
    const numPoints = 80;
    const radius = 340;
    const amplitude = 30;
    
    const outerZigZag = [];
    const innerZigZag = [];
    const beads = [];

    for (let i = 0; i <= numPoints; i++) {
      const angle1 = (i / numPoints) * Math.PI * 2;
      const angle2 = ((i + 0.5) / numPoints) * Math.PI * 2;
      
      outerZigZag.push(`${i === 0 ? 'M' : 'L'} ${500 + Math.cos(angle1)*(radius-amplitude)} ${500 + Math.sin(angle1)*(radius-amplitude)}`);
      outerZigZag.push(`L ${500 + Math.cos(angle2)*(radius+amplitude)} ${500 + Math.sin(angle2)*(radius+amplitude)}`);
      
      innerZigZag.push(`${i === 0 ? 'M' : 'L'} ${500 + Math.cos(angle1)*(radius+amplitude)} ${500 + Math.sin(angle1)*(radius+amplitude)}`);
      innerZigZag.push(`L ${500 + Math.cos(angle2)*(radius-amplitude)} ${500 + Math.sin(angle2)*(radius-amplitude)}`);
      
      if (i < numPoints) {
         beads.push({ cx: 500 + Math.cos(angle2)*(radius+amplitude), cy: 500 + Math.sin(angle2)*(radius+amplitude), r: 8 });
         beads.push({ cx: 500 + Math.cos(angle1)*(radius-amplitude), cy: 500 + Math.sin(angle1)*(radius-amplitude), r: 8 });
         const angleMid1 = ((i + 0.25) / numPoints) * Math.PI * 2;
         beads.push({ cx: 500 + Math.cos(angleMid1)*radius, cy: 500 + Math.sin(angleMid1)*radius, r: 10 });
         const angleMid2 = ((i + 0.75) / numPoints) * Math.PI * 2;
         beads.push({ cx: 500 + Math.cos(angleMid2)*radius, cy: 500 + Math.sin(angleMid2)*radius, r: 10 });
      }
    }

    return (
      <>
        <path d={outerZigZag.join(' ')} fill="none" stroke="#f4ecd8" strokeWidth="4" />
        <path d={innerZigZag.join(' ')} fill="none" stroke="#f4ecd8" strokeWidth="4" />
        {beads.map((b, idx) => (
          <circle key={idx} cx={b.cx} cy={b.cy} r={b.r} fill="#ea580c" />
        ))}
      </>
    );
  };

  const renderInstruments = () => {
    switch (inst.id) {
      case 'marcante':
      case 'meiao':
      case 'repique': {
        return (
          <>
            <div 
              ref={haloRef} 
              className="absolute pointer-events-none opacity-0"
              style={{
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 5
              }}
            >
              <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[8px] border-[#f4ecd8] shadow-[0_0_80px_rgba(255,255,255,1)]" />
            </div>
            <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
              {isLeftHanded ? (
                <AlfaiaMacaneta ref={leftStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(30deg)' }} />
              ) : (
                <AlfaiaBacalhau ref={leftStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(30deg)' }} />
              )}
            </div>
            <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
              {isLeftHanded ? (
                <AlfaiaBacalhau ref={rightStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(30deg)' }} />
              ) : (
                <AlfaiaMacaneta ref={rightStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(30deg)' }} />
              )}
            </div>
          </>
        );
      }

      case 'caixa':
      case 'tarol': {
        return (
          <>
            <div 
              ref={haloRef} 
              className="absolute pointer-events-none opacity-0"
              style={{
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 5
              }}
            >
              <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[8px] border-[#f4ecd8] shadow-[0_0_80px_rgba(255,255,255,1)]" />
            </div>
            <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
              <DrumStick ref={leftStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(25deg)' }} />
            </div>
            <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
              <DrumStick ref={rightStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(25deg)' }} />
            </div>
          </>
        );
      }

      case 'timbal': {
        return (
          <>
            <div 
              ref={haloRef} 
              className="absolute pointer-events-none opacity-0"
              style={{
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 5
              }}
            >
              <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[8px] border-[#f4ecd8] shadow-[0_0_80px_rgba(255,255,255,1)]" />
            </div>
            <div ref={leftWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '600px', transformOrigin: 'bottom center' }}>
              <TimbalHandLeft ref={leftStickRef} style={{ height: '100%', width: '100%' }} />
            </div>
            <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '600px', transformOrigin: 'bottom center' }}>
              <TimbalHandRight ref={rightStickRef} style={{ height: '100%', width: '100%' }} />
            </div>
          </>
        );
      }

      case 'mineiro': {
        return (
          <div ref={mineiroWrapperRef} className="absolute flex justify-center items-center pointer-events-none w-[220px] h-[48px] min-[400px]:w-[380px] min-[400px]:h-[80px] sm:w-[550px] sm:h-[120px] z-10" style={{ transform: 'translate(-50%, -50%)' }}>
            <MineiroStick ref={mineiroStickRef} />
          </div>
        );
      }

      case 'agbe': {
        return (
          <div ref={agbeWrapperRef} className="absolute w-[240px] h-[240px] min-[400px]:w-[500px] min-[400px]:h-[500px] sm:w-[800px] sm:h-[800px] pointer-events-none z-10" style={{ transform: 'translate(-50%, -50%)' }}>
            <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] opacity-90">
              <g ref={agbeWholeRef} className="origin-[500px_500px]">
                {renderNet()}
              </g>
              <g ref={agbeLeftRef} className="origin-[500px_500px]" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)', display: 'none' }}>
                {renderNet()}
              </g>
              <g ref={agbeRightRef} className="origin-[500px_500px]" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)', display: 'none' }}>
                {renderNet()}
              </g>
              <g ref={agbeTopRef} className="origin-[500px_500px]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)', display: 'none' }}>
                {renderNet()}
              </g>
              <g ref={agbeBottomRef} className="origin-[500px_500px]" style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)', display: 'none' }}>
                {renderNet()}
              </g>
            </svg>
          </div>
        );
      }

      case 'gongue': {
        return (
          <div ref={gongueWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
            <GongueStick ref={gongueStickRef} style={{ height: '100%', width: '100%', transform: 'translateY(0px) rotateX(4deg)' }} />
          </div>
        );
      }

      case 'voice': {
        const currentLivePattern = currentMeasureIdx >= 0
          ? activeTrack.patterns.find(p => p.measureAssignments[currentMeasureIdx])
          : activeTrack.patterns[0];

        if (!currentLivePattern) return null;

        const karaokeWords: { text: string; index: number }[][] = [];
        let currentWord: { text: string; index: number }[] = [];

        for (let idx = 0; idx < currentLivePattern.steps; idx++) {
          const active = currentLivePattern.activeSteps[idx] !== 0;
          const syl = currentLivePattern.lyrics?.[idx] || '';
          if (active && syl) {
            currentWord.push({ text: syl, index: idx });
            if (syl.endsWith(' ') || idx === currentLivePattern.steps - 1) {
              karaokeWords.push([...currentWord]);
              currentWord = [];
            }
          }
        }
        if (currentWord.length > 0) {
          karaokeWords.push(currentWord);
        }

        return (
          <div 
            ref={voiceWrapperRef}
            className="absolute z-50 pointer-events-none flex flex-col items-center justify-center w-full max-w-2xl px-6 text-center"
            style={{
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="bg-[#ece4d0]/80 backdrop-blur-[2px] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a] p-6 w-full flex flex-col gap-2 font-sans select-none cordel-border">
              <div className="text-lg opacity-60 mb-0.5">
                🎙️
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-2xl font-black font-cactus uppercase">
                {karaokeWords.length === 0 ? (
                  <span className="italic opacity-55 text-lg">
                    {lang === 'fr' ? 'Paroles vides' : 'Sem letras'}
                  </span>
                ) : (
                  karaokeWords.map((word, wIdx) => {
                    return (
                      <span
                        key={wIdx}
                        data-word-idx={wIdx}
                        className="transition-all duration-100 opacity-40"
                      >
                        {word.map((item, sIdx) => {
                          return (
                            <span 
                              key={sIdx} 
                              data-step-idx={item.index}
                            >
                              {item.text}
                            </span>
                          );
                        })}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 z-[10] overflow-hidden pointer-events-none perspective-[1000px]">
      {renderInstruments()}
    </div>
  );
};

export const AoVivoOverlay: React.FC = () => {
  const isEco = useSequencerStore(state => state.isEcoMode);
  const { activeAoVivoTrackId } = useSequencer();

  // If eco mode is enabled or no track is active for Ao Vivo,
  // return null immediately, avoiding any animation hook execution (Zero Cost basis).
  if (isEco || activeAoVivoTrackId === null) {
    return null;
  }

  return <AoVivoOverlayInner activeAoVivoTrackId={activeAoVivoTrackId} />;
};
