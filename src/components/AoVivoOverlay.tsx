import { useSequencerStore } from '../stores/useSequencerStore';
import React, { useEffect, useState, useRef } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig } from '../data';

// --- WAAPI Keyframe Constants ---
// Alfaia Keyframes (easing: cubic-bezier(0.15, 1.15, 0.3, 1))
const KEYFRAMES_ALFAIA_STRONG = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(-280px) rotateX(60deg)', offset: 0.3, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];
const KEYFRAMES_ALFAIA_NORMAL = [
  { transform: 'translateY(0px) rotateX(0deg) scale(1)', easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(-180px) rotateX(40deg) scale(0.9)', offset: 0.3, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(0px) rotateX(0deg) scale(1)' }
];
const KEYFRAMES_ALFAIA_WEAK = [
  { transform: 'translateY(0px) rotateX(0deg) scale(1)', easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(-130px) rotateX(25deg) scale(0.95)', offset: 0.3, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(0px) rotateX(0deg) scale(1)' }
];
const KEYFRAMES_ALFAIA_MICRO = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(-60px) rotateX(15deg)', offset: 0.3, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

// Drum Keyframes (Caixa/Tarol) (easing: cubic-bezier(0.1, 2.0, 0.3, 1))
const KEYFRAMES_DRUM_STRONG = KEYFRAMES_ALFAIA_STRONG;
const KEYFRAMES_DRUM_NORMAL = [
  { transform: 'translateY(0px) rotateX(0deg) scale(1)', easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(-180px) rotateX(40deg) scale(0.9)', offset: 0.3, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(0px) rotateX(0deg) scale(1)' }
];
const KEYFRAMES_DRUM_WEAK = KEYFRAMES_ALFAIA_WEAK;
const KEYFRAMES_DRUM_MICRO = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(-60px) rotateX(15deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

const KEYFRAMES_GONGUE_STRONG = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)' },
  { transform: 'translateY(-40px) rotateX(8deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];
const KEYFRAMES_GONGUE_MICRO = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)' },
  { transform: 'translateY(-15px) rotateX(3deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

const KEYFRAMES_CROSS_LEFT = [
  { transform: 'translateY(0px) rotateZ(0deg)', easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(-150px) rotateZ(16deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(0px) rotateZ(0deg)' }
];
const KEYFRAMES_CROSS_RIGHT = [
  { transform: 'translateY(0px) rotateZ(0deg)', easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(-150px) rotateZ(-16deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(0px) rotateZ(0deg)' }
];
const KEYFRAMES_OUT_LEFT = [
  { transform: 'translateY(0px) rotateZ(0deg)', easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(-100px) rotateZ(-16deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(0px) rotateZ(0deg)' }
];
const KEYFRAMES_OUT_RIGHT = [
  { transform: 'translateY(0px) rotateZ(0deg)', easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(-100px) rotateZ(16deg)', offset: 0.3, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
  { transform: 'translateY(0px) rotateZ(0deg)' }
];

const KEYFRAMES_SHAKE = [
  { transform: 'translateX(0) translateY(0) rotateZ(0deg)', easing: 'ease-in-out' },
  { transform: 'translateX(-18px) translateY(-18px) rotateZ(-5deg)', offset: 0.25, easing: 'ease-in-out' },
  { transform: 'translateX(18px) translateY(18px) rotateZ(5deg)', offset: 0.5, easing: 'ease-in-out' },
  { transform: 'translateX(-18px) translateY(18px) rotateZ(-5deg)', offset: 0.75, easing: 'ease-in-out' },
  { transform: 'translateX(0) translateY(0) rotateZ(0deg)' }
];

const KEYFRAMES_RUFADA = [
  { transform: 'translateY(0px) rotateZ(0deg)', easing: 'linear' },
  { transform: 'translateY(-16px) rotateZ(-3deg)', offset: 0.16, easing: 'linear' },
  { transform: 'translateY(12px) rotateZ(2.5deg)', offset: 0.33, easing: 'linear' },
  { transform: 'translateY(-12px) rotateZ(-2deg)', offset: 0.5, easing: 'linear' },
  { transform: 'translateY(8px) rotateZ(1.5deg)', offset: 0.66, easing: 'linear' },
  { transform: 'translateY(-4px) rotateZ(-1deg)', offset: 0.83, easing: 'linear' },
  { transform: 'translateY(0px) rotateZ(0deg)' }
];

const KEYFRAMES_MINEIRO_PUSH_STRONG = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(0, -50px) scale(0.6)', offset: 0.3 },
  { transform: 'translate(0, 0) scale(1)' }
];
const KEYFRAMES_MINEIRO_PUSH_WEAK = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(0, -20px) scale(0.85)', offset: 0.3 },
  { transform: 'translate(0, 0) scale(1)' }
];
const KEYFRAMES_MINEIRO_PULL_STRONG = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(0, 50px) scale(1.6)', offset: 0.3 },
  { transform: 'translate(0, 0) scale(1)' }
];
const KEYFRAMES_MINEIRO_PULL_WEAK = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(0, 20px) scale(1.2)', offset: 0.3 },
  { transform: 'translate(0, 0) scale(1)' }
];
const KEYFRAMES_MINEIRO_LEFT = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(-200px, 0) scale(1)', offset: 0.3 },
  { transform: 'translate(0, 0) scale(1)' }
];
const KEYFRAMES_MINEIRO_SHAKE = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(-15px, 0) scale(1)', offset: 0.1 },
  { transform: 'translate(15px, 0) scale(1)', offset: 0.2 },
  { transform: 'translate(-15px, 0) scale(1)', offset: 0.3 },
  { transform: 'translate(15px, 0) scale(1)', offset: 0.4 },
  { transform: 'translate(-15px, 0) scale(1)', offset: 0.5 },
  { transform: 'translate(15px, 0) scale(1)', offset: 0.6 },
  { transform: 'translate(-15px, 0) scale(1)', offset: 0.7 },
  { transform: 'translate(15px, 0) scale(1)', offset: 0.8 },
  { transform: 'translate(-15px, 0) scale(1)', offset: 0.9 },
  { transform: 'translate(0, 0) scale(1)' }
];

const KEYFRAMES_AGBE_STRETCH_Y_STRONG = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.15)', offset: 0.3 },
  { transform: 'scaleY(1)' }
];
const KEYFRAMES_AGBE_STRETCH_Y_WEAK = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.08)', offset: 0.3 },
  { transform: 'scaleY(1)' }
];
const KEYFRAMES_AGBE_STRETCH_X_STRONG = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.15)', offset: 0.3 },
  { transform: 'scaleX(1)' }
];
const KEYFRAMES_AGBE_STRETCH_X_WEAK = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.08)', offset: 0.3 },
  { transform: 'scaleX(1)' }
];
const KEYFRAMES_AGBE_SHAKE = [
  { transform: 'translate(0, 0) scale(1)' },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.1 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.2 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.3 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.4 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.5 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.6 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.7 },
  { transform: 'translate(10px, 5px) scale(1.02)', offset: 0.8 },
  { transform: 'translate(-10px, -5px) scale(0.98)', offset: 0.9 },
  { transform: 'translate(0, 0) scale(1)' }
];

const KEYFRAMES_HALO = [
  { opacity: 0, transform: 'scale(0.6)' },
  { opacity: 1, transform: 'scale(1.05)', offset: 0.3 },
  { opacity: 0, transform: 'scale(1.2)' }
];

// --- forwardRef SVG Components ---
const AlfaiaMacaneta = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="25" y="45" width="50" height="755" fill="#7A3B12" rx="20" />
    <circle cx="50" cy="45" r="45" fill="#D2B48C" stroke="#5C3A21" strokeWidth="4" />
    <line x1="40" y1="90" x2="40" y2="800" stroke="#5C3A21" strokeWidth="4" strokeDasharray="30 20" opacity="0.4" />
    <line x1="60" y1="120" x2="60" y2="800" stroke="#5C3A21" strokeWidth="2" strokeDasharray="15 25" opacity="0.3" />
  </svg>
));
AlfaiaMacaneta.displayName = 'AlfaiaMacaneta';

const AlfaiaBacalhau = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="25" y="0" width="50" height="800" fill="#DEB887" rx="10" />
    <line x1="40" y1="0" x2="40" y2="800" stroke="#8B4513" strokeWidth="4" strokeDasharray="35 15" opacity="0.3" />
    <line x1="60" y1="20" x2="60" y2="800" stroke="#8B4513" strokeWidth="2" strokeDasharray="20 20" opacity="0.2" />
  </svg>
));
AlfaiaBacalhau.displayName = 'AlfaiaBacalhau';

const DrumStick = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="35" y="20" width="30" height="780" fill="#E6C280" rx="15" />
    <rect x="55" y="20" width="10" height="780" fill="#C49B5A" rx="5" />
    <path d="M40 100 Q45 150 40 200 T45 300 T38 400 T42 500 T38 600 T45 700" stroke="#C49B5A" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 Q55 120 48 180 T52 280 T48 380 T55 480 T49 580 T52 750" stroke="#D9AE6B" strokeWidth="2" fill="none" opacity="0.5" />
    <circle cx="50" cy="20" r="20" fill="#E6C280" />
    <path d="M64 6 A 20 20 0 0 1 50 40 A 20 20 0 0 0 64 6" fill="#C49B5A" />
  </svg>
));
DrumStick.displayName = 'DrumStick';

const GongueStick = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom" style={props.style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="30" y="0" width="40" height="800" fill="#F8F9FA" rx="4" />
    <rect x="38" y="0" width="10" height="800" fill="#FFFFFF" rx="2" />
  </svg>
));
GongueStick.displayName = 'GongueStick';

const MineiroStick = React.forwardRef<SVGSVGElement, { style?: React.CSSProperties }>((props, ref) => (
  <svg ref={ref} className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-full h-full" style={props.style} viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
    <rect x="20" y="10" width="560" height="100" fill="#B0BEC5" rx="10" />
    <rect x="20" y="30" width="560" height="20" fill="#FFFFFF" opacity="0.7" rx="5" />
    <line x1="20" y1="20" x2="580" y2="20" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="50" x2="580" y2="50" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="70" x2="580" y2="70" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="90" x2="580" y2="90" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <rect x="10" y="5" width="20" height="110" fill="#455A64" rx="5" />
    <rect x="570" y="5" width="20" height="110" fill="#455A64" rx="5" />
  </svg>
));
MineiroStick.displayName = 'MineiroStick';

export const AoVivoOverlay: React.FC = () => {
  const { activeAoVivoTrackId, isLeftHanded, activeVariationsRef, lang } = useSequencer();
  const tracks = useSequencerStore(state => state.tracks);

  const [isEco, setIsEco] = useState<boolean>(() => !!(window as any).oGiradorEcoMode);
  
  // Lower frequency React states (only update when the pattern structure changes at measure boundaries)
  const [currentPatternId, setCurrentPatternId] = useState<number | null>(null);
  const [currentMeasureIdx, setCurrentMeasureIdx] = useState<number>(-1);

  // References to static DOM elements to avoid React re-renders
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

  // Layout target position and geometry cache
  const geometryRef = useRef({ targetX: 0, targetY: 0, width: 0, height: 0 });

  // Sync refs for the o-girador-tick event listener closure
  const currentPatternIdRef = useRef<number | null>(null);
  const currentMeasureIdxRef = useRef<number>(-1);
  const lastVuStepRef = useRef<number>(-1);

  useEffect(() => {
    const handleEcoChange = () => setIsEco(!!(window as any).oGiradorEcoMode);
    window.addEventListener('eco-mode-changed', handleEcoChange);
    return () => window.removeEventListener('eco-mode-changed', handleEcoChange);
  }, []);

  // --- PASSIVE RESIZE OBSERVER (0 LAYOUT THRASHING) ---
  useEffect(() => {
    if (isEco || activeAoVivoTrackId === null) return;

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

      if (leftWrapperRef.current) {
        const leftX = targetX - 160;
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
        const rightX = targetX + 160;
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
  }, [isEco, activeAoVivoTrackId, isLeftHanded]);

  // --- AUDIO TICK LISTENERS AND GPU ANIMATIONS (WAAPI) ---
  useEffect(() => {
    if (isEco || activeAoVivoTrackId === null) return;
    const activeTrack = tracks.find(t => t.id === activeAoVivoTrackId);
    if (!activeTrack) return;

    const inst = instrumentsConfig[activeTrack.instrumentIdx];
    if (!inst) return;

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
              let keyframesLeft: Keyframe[] = KEYFRAMES_ALFAIA_NORMAL;
              let keyframesRight: Keyframe[] = KEYFRAMES_ALFAIA_NORMAL;
              let triggerLeft = false;
              let triggerRight = false;
              let animHalo = false;
              let animHaloOffsetY = 0;

              if (isVibrate) {
                keyframesLeft = KEYFRAMES_SHAKE;
                keyframesRight = KEYFRAMES_SHAKE;
                triggerLeft = true;
                triggerRight = true;
              } else {
                if (stroke === 'D') {
                  if (isLeftHanded) { keyframesLeft = KEYFRAMES_ALFAIA_STRONG; triggerLeft = true; }
                  else { keyframesRight = KEYFRAMES_ALFAIA_STRONG; triggerRight = true; }
                } else if (stroke === 'd') {
                  if (isLeftHanded) { keyframesLeft = KEYFRAMES_ALFAIA_NORMAL; triggerLeft = true; }
                  else { keyframesRight = KEYFRAMES_ALFAIA_NORMAL; triggerRight = true; }
                } else if (stroke === 'E') {
                  if (isLeftHanded) { keyframesRight = KEYFRAMES_ALFAIA_STRONG; triggerRight = true; }
                  else { keyframesLeft = KEYFRAMES_ALFAIA_STRONG; triggerLeft = true; }
                } else if (stroke === 'e') {
                  if (isLeftHanded) { keyframesRight = KEYFRAMES_ALFAIA_NORMAL; triggerRight = true; }
                  else { keyframesLeft = KEYFRAMES_ALFAIA_NORMAL; triggerLeft = true; }
                } else if (stroke === 'i' || stroke === 'I') {
                  if (isLeftHanded) { keyframesRight = KEYFRAMES_ALFAIA_WEAK; triggerRight = true; }
                  else { keyframesLeft = KEYFRAMES_ALFAIA_WEAK; triggerLeft = true; }
                } else if (stroke === 'x' || stroke === 'X') {
                  keyframesLeft = KEYFRAMES_OUT_LEFT;
                  keyframesRight = KEYFRAMES_OUT_RIGHT;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -100;
                } else if (stroke === 'c' || stroke === 'C') {
                  keyframesLeft = KEYFRAMES_CROSS_LEFT;
                  keyframesRight = KEYFRAMES_CROSS_RIGHT;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -150;
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

            // --- 2. Caixa / Tarol ---
            else if (['caixa', 'tarol'].includes(inst.id)) {
              let keyframesLeft: Keyframe[] = KEYFRAMES_DRUM_NORMAL;
              let keyframesRight: Keyframe[] = KEYFRAMES_DRUM_NORMAL;
              let triggerLeft = false;
              let triggerRight = false;
              let animHalo = false;
              let animHaloOffsetY = 0;

              if (isVibrate) {
                keyframesLeft = KEYFRAMES_SHAKE;
                keyframesRight = KEYFRAMES_SHAKE;
                triggerLeft = true;
                triggerRight = true;
              } else {
                if (stroke === 'D') {
                  if (isLeftHanded) { keyframesLeft = KEYFRAMES_DRUM_NORMAL; triggerLeft = true; }
                  else { keyframesRight = KEYFRAMES_DRUM_NORMAL; triggerRight = true; }
                } else if (stroke === 'd') {
                  if (isLeftHanded) { keyframesLeft = KEYFRAMES_DRUM_MICRO; triggerLeft = true; }
                  else { keyframesRight = KEYFRAMES_DRUM_MICRO; triggerRight = true; }
                } else if (stroke === 'E') {
                  if (isLeftHanded) { keyframesRight = KEYFRAMES_DRUM_NORMAL; triggerRight = true; }
                  else { keyframesLeft = KEYFRAMES_DRUM_NORMAL; triggerLeft = true; }
                } else if (stroke === 'e') {
                  if (isLeftHanded) { keyframesRight = KEYFRAMES_DRUM_MICRO; triggerRight = true; }
                  else { keyframesLeft = KEYFRAMES_DRUM_MICRO; triggerLeft = true; }
                } else if (stroke === 'R') {
                  if (isLeftHanded) { keyframesLeft = KEYFRAMES_RUFADA; triggerLeft = true; }
                  else { keyframesRight = KEYFRAMES_RUFADA; triggerRight = true; }
                } else if (stroke === 'r') {
                  if (isLeftHanded) { keyframesRight = KEYFRAMES_RUFADA; triggerRight = true; }
                  else { keyframesLeft = KEYFRAMES_RUFADA; triggerLeft = true; }
                } else if (stroke === 'f' || stroke === 'F') {
                  keyframesLeft = KEYFRAMES_CROSS_LEFT;
                  keyframesRight = KEYFRAMES_CROSS_RIGHT;
                  triggerLeft = true;
                  triggerRight = true;
                } else if (stroke === 'x' || stroke === 'X') {
                  keyframesLeft = KEYFRAMES_OUT_LEFT;
                  keyframesRight = KEYFRAMES_OUT_RIGHT;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -100;
                } else if (stroke === 'c' || stroke === 'C') {
                  keyframesLeft = KEYFRAMES_CROSS_LEFT;
                  keyframesRight = KEYFRAMES_CROSS_RIGHT;
                  triggerLeft = true;
                  triggerRight = true;
                  animHalo = true;
                  animHaloOffsetY = -150;
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
              let keyframes = KEYFRAMES_MINEIRO_PUSH_WEAK;
              if (stroke === 'P') keyframes = KEYFRAMES_MINEIRO_PUSH_STRONG;
              else if (stroke === 'p') keyframes = KEYFRAMES_MINEIRO_PUSH_WEAK;
              else if (stroke === 'T') keyframes = KEYFRAMES_MINEIRO_PULL_STRONG;
              else if (stroke === 't') keyframes = KEYFRAMES_MINEIRO_PULL_WEAK;
              else if (stroke === 'L' || stroke === 'l') keyframes = KEYFRAMES_MINEIRO_LEFT;
              else if (stroke === 'B' || stroke === 'b') keyframes = KEYFRAMES_MINEIRO_SHAKE;

              if (mineiroStickRef.current) {
                mineiroStickRef.current.animate(keyframes, {
                  duration: 350,
                  easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)'
                });
              }
            }

            // --- 4. Agbê ---
            else if (inst.id === 'agbe') {
              const isShake = stroke === 'B' || stroke === 'b';
              const isLeftRight = ['D', 'd', 'E', 'e'].includes(stroke);
              const isTopBottom = ['S', 's', 'V', 'v'].includes(stroke);

              if (agbeWholeRef.current && agbeLeftRef.current && agbeRightRef.current && agbeTopRef.current && agbeBottomRef.current) {
                if (isShake) {
                  agbeWholeRef.current.style.display = 'block';
                  agbeLeftRef.current.style.display = 'none';
                  agbeRightRef.current.style.display = 'none';
                  agbeTopRef.current.style.display = 'none';
                  agbeBottomRef.current.style.display = 'none';
                  
                  agbeWholeRef.current.animate(KEYFRAMES_AGBE_SHAKE, { duration: 350, easing: 'linear' });
                } else if (isLeftRight) {
                  agbeWholeRef.current.style.display = 'none';
                  agbeLeftRef.current.style.display = 'block';
                  agbeRightRef.current.style.display = 'block';
                  agbeTopRef.current.style.display = 'none';
                  agbeBottomRef.current.style.display = 'none';

                  if (stroke === 'D') {
                    agbeRightRef.current.animate(KEYFRAMES_AGBE_STRETCH_X_STRONG, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  } else if (stroke === 'd') {
                    agbeRightRef.current.animate(KEYFRAMES_AGBE_STRETCH_X_WEAK, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  } else if (stroke === 'E') {
                    agbeLeftRef.current.animate(KEYFRAMES_AGBE_STRETCH_X_STRONG, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  } else if (stroke === 'e') {
                    agbeLeftRef.current.animate(KEYFRAMES_AGBE_STRETCH_X_WEAK, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  }
                } else if (isTopBottom) {
                  agbeWholeRef.current.style.display = 'none';
                  agbeLeftRef.current.style.display = 'none';
                  agbeRightRef.current.style.display = 'none';
                  agbeTopRef.current.style.display = 'block';
                  agbeBottomRef.current.style.display = 'block';

                  if (stroke === 'S') {
                    agbeTopRef.current.animate(KEYFRAMES_AGBE_STRETCH_Y_STRONG, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  } else if (stroke === 's') {
                    agbeTopRef.current.animate(KEYFRAMES_AGBE_STRETCH_Y_WEAK, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  } else if (stroke === 'V') {
                    agbeBottomRef.current.animate(KEYFRAMES_AGBE_STRETCH_Y_STRONG, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  } else if (stroke === 'v') {
                    agbeBottomRef.current.animate(KEYFRAMES_AGBE_STRETCH_Y_WEAK, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                  }
                } else {
                  agbeWholeRef.current.style.display = 'block';
                  agbeLeftRef.current.style.display = 'none';
                  agbeRightRef.current.style.display = 'none';
                  agbeTopRef.current.style.display = 'none';
                  agbeBottomRef.current.style.display = 'none';

                  agbeWholeRef.current.animate(KEYFRAMES_AGBE_STRETCH_Y_WEAK, { duration: 350, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' });
                }
              }
            }

            // --- 5. Gonguê ---
            else if (inst.id === 'gongue') {
              const { targetX, targetY, width, height } = geometryRef.current;
              const handSpread = Math.min(width * 0.45, 550);
              const offset = isLeftHanded ? -handSpread : handSpread;
              
              const hitTargetY = (stroke === 'G' || stroke === 'g') ? targetY - 200 : (stroke === 'A' || stroke === 'a') ? targetY + 120 : targetY - 30;
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

              let keyframes: Keyframe[] = KEYFRAMES_GONGUE_MICRO;
              if (stroke === 'G' || stroke === 'A') keyframes = KEYFRAMES_GONGUE_STRONG;
              else if (stroke === 'g' || stroke === 'a') keyframes = KEYFRAMES_GONGUE_MICRO;
              else if (isVibrate) keyframes = KEYFRAMES_SHAKE;

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
  }, [isEco, activeAoVivoTrackId, isLeftHanded, tracks]);

  if (isEco || activeAoVivoTrackId === null) return null;

  const activeTrack = tracks.find(t => t.id === activeAoVivoTrackId);
  if (!activeTrack) return null;

  const inst = instrumentsConfig[activeTrack.instrumentIdx];
  if (!inst) return null;

  // static helper for Agbê net rendering
  const renderNet = () => {
    const numPoints = 80;
    const radius = 450;
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
                <AlfaiaMacaneta ref={leftStickRef} style={{ height: '100%', width: '100%' }} />
              ) : (
                <AlfaiaBacalhau ref={leftStickRef} style={{ height: '100%', width: '100%' }} />
              )}
            </div>
            <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
              {isLeftHanded ? (
                <AlfaiaBacalhau ref={rightStickRef} style={{ height: '100%', width: '100%' }} />
              ) : (
                <AlfaiaMacaneta ref={rightStickRef} style={{ height: '100%', width: '100%' }} />
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
              <DrumStick ref={leftStickRef} style={{ height: '100%', width: '100%' }} />
            </div>
            <div ref={rightWrapperRef} className="absolute flex justify-center items-end pointer-events-none z-10" style={{ bottom: '-350px', width: '400px', transformOrigin: 'bottom center' }}>
              <DrumStick ref={rightStickRef} style={{ height: '100%', width: '100%' }} />
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
            <GongueStick ref={gongueStickRef} style={{ height: '100%', width: '100%' }} />
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
