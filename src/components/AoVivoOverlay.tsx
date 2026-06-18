import React, { useEffect, useState, useRef } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { instrumentsConfig } from '../data';

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

const style = `
  @keyframes pov-hit {
    0% { transform: translateY(0px) rotateX(0deg) scale(1); }
    30% { transform: translateY(-180px) rotateX(40deg) scale(0.9); }
    100% { transform: translateY(0px) rotateX(0deg) scale(1); }
  }
  @keyframes pov-hit-strong {
    0% { transform: translateY(0px) rotateX(0deg); }
    30% { transform: translateY(-280px) rotateX(60deg); }
    100% { transform: translateY(0px) rotateX(0deg); }
  }
  @keyframes pov-hit-micro {
    0% { transform: translateY(0px) rotateX(0deg); }
    30% { transform: translateY(-60px) rotateX(15deg); }
    100% { transform: translateY(0px) rotateX(0deg); }
  }
  @keyframes pov-hit-weak {
    0% { transform: translateY(0px) rotateX(0deg) scale(1); }
    30% { transform: translateY(-130px) rotateX(25deg) scale(0.95); }
    100% { transform: translateY(0px) rotateX(0deg) scale(1); }
  }
  @keyframes pov-cross-left {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-150px) rotateZ(16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-cross-right {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-150px) rotateZ(-16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-out-left {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-100px) rotateZ(-16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-out-right {
    0% { transform: translateY(0px) rotateZ(0deg); }
    30% { transform: translateY(-100px) rotateZ(16deg); }
    100% { transform: translateY(0px) rotateZ(0deg); }
  }
  @keyframes pov-shake {
    0%, 100% { transform: translateX(0) translateY(0) rotateZ(0deg); }
    25% { transform: translateX(-8px) translateY(-8px) rotateZ(0deg); }
    50% { transform: translateX(8px) translateY(8px) rotateZ(0deg); }
    75% { transform: translateX(-8px) translateY(8px) rotateZ(0deg); }
  }
  @keyframes halo-flash {
    0% { opacity: 0; transform: scale(0.6); }
    30% { opacity: 1; transform: scale(1.05); box-shadow: 0 0 100px rgba(255,255,255,1); }
    100% { opacity: 0; transform: scale(1.2); }
  }

  /* Easing nerveux avec rebond : cubic-bezier(0.1, 2.0, 0.3, 1) */
  .pov-anim-hit { animation: pov-hit 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-hit-strong { animation: pov-hit-strong 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-hit-micro { animation: pov-hit-micro 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-hit-weak { animation: pov-hit-weak 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  
  /* Easing doux et long pour le Gonguê pour donner l'impression de revenir lentement */
  .pov-anim-gongue-hit-strong { animation: pov-hit-strong 0.5s cubic-bezier(0.1, 0.9, 0.2, 1); }
  .pov-anim-gongue-hit-micro { animation: pov-hit-micro 0.5s cubic-bezier(0.1, 0.9, 0.2, 1); }
  
  .pov-anim-cross-left { animation: pov-cross-left 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-cross-right { animation: pov-cross-right 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-out-left { animation: pov-out-left 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-out-right { animation: pov-out-right 0.4s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-shake { animation: pov-shake 0.1s infinite; }
  .pov-anim-fla-left { animation: pov-hit 0.35s cubic-bezier(0.1, 2.0, 0.3, 1); }
  .pov-anim-fla-right { animation: pov-hit 0.35s cubic-bezier(0.1, 2.0, 0.3, 1) 0.05s backwards; }
  .pov-anim-halo { animation: halo-flash 0.4s ease-out; }

  /* Animations pour le Mineiro */
  @keyframes pov-mineiro-push-strong {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, -50px) scale(0.6); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-push-weak {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, -20px) scale(0.85); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-pull-strong {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, 50px) scale(1.6); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-pull-weak {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(0, 20px) scale(1.2); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-left {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(-200px, 0) scale(1); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes pov-mineiro-shake {
    0%, 100% { transform: translate(0, 0) scale(1); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-15px, 0) scale(1); }
    20%, 40%, 60%, 80% { transform: translate(15px, 0) scale(1); }
  }

  .pov-anim-mineiro-push-strong { animation: pov-mineiro-push-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-push-weak { animation: pov-mineiro-push-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-pull-strong { animation: pov-mineiro-pull-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-pull-weak { animation: pov-mineiro-pull-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-left { animation: pov-mineiro-left 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-mineiro-shake { animation: pov-mineiro-shake 0.35s linear; }

  /* Animations pour l'Agbê (filet dynamique) */
  @keyframes pov-agbe-stretch-x-strong {
    0% { transform: scaleX(1); }
    30% { transform: scaleX(1.15); }
    100% { transform: scaleX(1); }
  }
  @keyframes pov-agbe-stretch-x-weak {
    0% { transform: scaleX(1); }
    30% { transform: scaleX(1.08); }
    100% { transform: scaleX(1); }
  }
  @keyframes pov-agbe-stretch-y-strong {
    0% { transform: scaleY(1); }
    30% { transform: scaleY(1.15); }
    100% { transform: scaleY(1); }
  }
  @keyframes pov-agbe-stretch-y-weak {
    0% { transform: scaleY(1); }
    30% { transform: scaleY(1.08); }
    100% { transform: scaleY(1); }
  }
  @keyframes pov-agbe-shake {
    0%, 100% { transform: translate(0, 0) scale(1); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-10px, -5px) scale(0.98); }
    20%, 40%, 60%, 80% { transform: translate(10px, 5px) scale(1.02); }
  }

  .pov-anim-agbe-secoche-strong { animation: pov-agbe-stretch-y-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-secoche-weak { animation: pov-agbe-stretch-y-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-ventre-strong { animation: pov-agbe-stretch-y-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-ventre-weak { animation: pov-agbe-stretch-y-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }

  .pov-anim-agbe-dos-strong { animation: pov-agbe-stretch-x-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-dos-weak { animation: pov-agbe-stretch-x-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-haut-strong { animation: pov-agbe-stretch-x-strong 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }
  .pov-anim-agbe-haut-weak { animation: pov-agbe-stretch-x-weak 0.35s cubic-bezier(0.2, 0.8, 0.4, 1); }

  .pov-anim-agbe-shake { animation: pov-agbe-shake 0.35s linear; }
`;

type HitEvent = { stroke: string; time: number };

// Helper pour le ciblage dynamique de la Roda
const useRodaTarget = () => {
  const [targetPoint, setTargetPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId: number;
    let lastX = -1;
    let lastY = -1;

    const checkPosition = () => {
      const panel = document.getElementById('circle-sequencer-panel');
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const radius = Math.min(rect.width, rect.height) / 2;
        // On cible le centre de la Roda pour qu'elles remontent plus haut sur l'écran
        const newX = centerX;
        const newY = centerY + 20; // Légèrement sous le centre parfait pour l'esthétique

        // Seulement déclencher un update si la Roda a bougé
        if (Math.abs(newX - lastX) > 1 || Math.abs(newY - lastY) > 1) {
          lastX = newX;
          lastY = newY;
          setTargetPoint({ x: newX, y: newY });
        }
      }
      animationFrameId = requestAnimationFrame(checkPosition);
    };
    
    checkPosition();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return targetPoint;
};

// Wrapper qui gère la rotation et l'origine pour toujours pointer vers la Roda
const StickWrapper = ({ xOffset, target, children }: { xOffset: number, target: {x: number, y: number}, children: React.ReactNode }) => {
  const { width, height } = useWindowSize();

  const originX = width / 2 + xOffset;
  const originY = height + 350;

  const dx = target.x - originX;
  const dy = target.y - originY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  const distance = Math.hypot(dx, dy);

  return (
    <div 
      className="absolute flex justify-center items-end pointer-events-none"
      style={{ 
        left: originX,
        bottom: '-350px',
        width: '400px',
        height: `${distance}px`,
        transform: `translateX(-50%) rotate(${angle}deg)`,
        transformOrigin: 'bottom center',
        zIndex: 10
      }}
    >
      {React.cloneElement(children as React.ReactElement, {
        style: { height: '100%', width: '100%' }
      })}
    </div>
  );
};

const MineiroContainer = ({ target, children }: { target: {x: number, y: number}, children: React.ReactNode }) => {
  const { width } = useWindowSize();
  return (
    <div 
      className="absolute flex justify-center items-center pointer-events-none w-[220px] h-[48px] min-[400px]:w-[380px] min-[400px]:h-[80px] sm:w-[550px] sm:h-[120px]"
      style={{ 
        left: target.x,
        top: target.y - (width < 400 ? 50 : width < 640 ? 80 : 120),
        transform: `translate(-50%, -50%)`,
        zIndex: 10
      }}
    >
      {children}
    </div>
  );
};

const MineiroStick = ({ animClass, hitTime, style }: { animClass: string, hitTime: number, style?: React.CSSProperties }) => (
  <svg key={hitTime} className={`drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] w-full h-full ${animClass}`} style={style} viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
    {/* Corps cylindrique métallique horizontal */}
    <rect x="20" y="10" width="560" height="100" fill="#B0BEC5" rx="10" />
    {/* Reflet métallique */}
    <rect x="20" y="30" width="560" height="20" fill="#FFFFFF" opacity="0.7" rx="5" />
    {/* Lignes horizontales de texture (graines qui frottent) */}
    <line x1="20" y1="20" x2="580" y2="20" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="50" x2="580" y2="50" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="70" x2="580" y2="70" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    <line x1="20" y1="90" x2="580" y2="90" stroke="#78909C" strokeWidth="2" opacity="0.5" />
    {/* Embouts bouchons */}
    <rect x="10" y="5" width="20" height="110" fill="#455A64" rx="5" />
    <rect x="570" y="5" width="20" height="110" fill="#455A64" rx="5" />
  </svg>
);

const AgbeNet = ({ animClass, hitTime, target }: { animClass: string, hitTime: number, target: {x: number, y: number} }) => {
  const numPoints = 80;
  const radius = 450;
  const amplitude = 30; // Zig zag width
  
  const outerZigZag = [];
  const innerZigZag = [];
  const beads: {cx: number, cy: number, r: number}[] = [];

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

  const renderNet = () => (
    <>
      <path d={outerZigZag.join(' ')} fill="none" stroke="#f4ecd8" strokeWidth="4" />
      <path d={innerZigZag.join(' ')} fill="none" stroke="#f4ecd8" strokeWidth="4" />
      {beads.map((b, idx) => (
        <circle key={idx} cx={b.cx} cy={b.cy} r={b.r} fill="#ea580c" />
      ))}
    </>
  );

  const isShake = animClass.includes('shake');
  const isLeftRight = animClass.includes('dos') || animClass.includes('haut');
  const isTopBottom = animClass.includes('secoche') || animClass.includes('ventre');

  // Determiner quelle moitié animer
  const animLeft = animClass.includes('haut') ? animClass : '';
  const animRight = animClass.includes('dos') ? animClass : '';
  const animTop = animClass.includes('secoche') ? animClass : '';
  const animBottom = animClass.includes('ventre') ? animClass : '';

  return (
    <div key={hitTime} className="absolute w-[240px] h-[240px] min-[400px]:w-[500px] min-[400px]:h-[500px] sm:w-[800px] sm:h-[800px] pointer-events-none z-10" style={{ left: target.x, top: target.y, transform: 'translate(-50%, -50%)' }}>
      <svg viewBox="0 0 1000 1000" className={`w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] opacity-90 ${isShake ? animClass : ''}`}>
        
        {isShake && renderNet()}

        {isLeftRight && (
          <>
            <g className={`origin-[500px_500px] ${animLeft}`} style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}>
              {renderNet()}
            </g>
            <g className={`origin-[500px_500px] ${animRight}`} style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}>
              {renderNet()}
            </g>
          </>
        )}

        {isTopBottom && (
          <>
            <g className={`origin-[500px_500px] ${animTop}`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}>
              {renderNet()}
            </g>
            <g className={`origin-[500px_500px] ${animBottom}`} style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }}>
              {renderNet()}
            </g>
          </>
        )}

        {(!isShake && !isLeftRight && !isTopBottom) && renderNet()}
      </svg>
    </div>
  );
};

// --- SVG INSTRUMENTS ---
// Les SVG pointent vers le haut. La pointe (y=0) touchera exactement le haut du wrapper (la cible).
const AlfaiaMacaneta = ({ animClass, hitTime, style }: { animClass: string, hitTime: number, style?: React.CSSProperties }) => (
  <svg key={hitTime} className={`drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom ${animClass}`} style={style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="25" y="45" width="50" height="755" fill="#7A3B12" rx="20" />
    <circle cx="50" cy="45" r="45" fill="#D2B48C" stroke="#5C3A21" strokeWidth="4" />
    <line x1="40" y1="90" x2="40" y2="800" stroke="#5C3A21" strokeWidth="4" strokeDasharray="30 20" opacity="0.4" />
    <line x1="60" y1="120" x2="60" y2="800" stroke="#5C3A21" strokeWidth="2" strokeDasharray="15 25" opacity="0.3" />
  </svg>
);

const AlfaiaBacalhau = ({ animClass, hitTime, style }: { animClass: string, hitTime: number, style?: React.CSSProperties }) => (
  <svg key={hitTime} className={`drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] origin-bottom ${animClass}`} style={style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    <rect x="25" y="0" width="50" height="800" fill="#DEB887" rx="10" />
    <line x1="40" y1="0" x2="40" y2="800" stroke="#8B4513" strokeWidth="4" strokeDasharray="35 15" opacity="0.3" />
    <line x1="60" y1="20" x2="60" y2="800" stroke="#8B4513" strokeWidth="2" strokeDasharray="20 20" opacity="0.2" />
  </svg>
);

const DrumStick = ({ animClass, hitTime, style }: { animClass: string, hitTime: number, style?: React.CSSProperties }) => (
  <svg key={hitTime} className={`drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom ${animClass}`} style={style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    {/* Corps principal en bois clair */}
    <rect x="35" y="20" width="30" height="780" fill="#E6C280" rx="15" />
    {/* Ombrage cylindrique (bord droit) */}
    <rect x="55" y="20" width="10" height="780" fill="#C49B5A" rx="5" />
    {/* Veines de bois légères */}
    <path d="M40 100 Q45 150 40 200 T45 300 T38 400 T42 500 T38 600 T45 700" stroke="#C49B5A" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 Q55 120 48 180 T52 280 T48 380 T55 480 T49 580 T52 750" stroke="#D9AE6B" strokeWidth="2" fill="none" opacity="0.5" />
    {/* Tête de la baguette (olive) */}
    <circle cx="50" cy="20" r="20" fill="#E6C280" />
    {/* Ombre sur l'olive */}
    <path d="M64 6 A 20 20 0 0 1 50 40 A 20 20 0 0 0 64 6" fill="#C49B5A" />
  </svg>
);

const GongueStick = ({ animClass, hitTime, style }: { animClass: string, hitTime: number, style?: React.CSSProperties }) => (
  <svg key={hitTime} className={`drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] origin-bottom ${animClass}`} style={style} viewBox="0 0 100 800" preserveAspectRatio="xMidYMin meet">
    {/* Cylindre très épais et droit en nylon blanc */}
    <rect x="30" y="0" width="40" height="800" fill="#F8F9FA" rx="4" />
    {/* Reflet brillant plus large pour le volume */}
    <rect x="38" y="0" width="10" height="800" fill="#FFFFFF" rx="2" />
  </svg>
);

const RimHalo = ({ show, hitTime, target, yOffset = 0 }: { show: boolean, hitTime: number, target: {x: number, y: number}, yOffset?: number }) => {
  if (!show) return null;
  return (
    <div 
      key={hitTime} 
      className="absolute pointer-events-none pov-anim-halo opacity-0"
      style={{
        left: target.x,
        top: target.y + yOffset,
        transform: 'translate(-50%, -50%)',
        zIndex: 5
      }}
    >
      <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border-[8px] border-[#f4ecd8] shadow-[0_0_80px_rgba(255,255,255,1)]" />
    </div>
  );
};

export const AoVivoOverlay: React.FC = () => {
  const { activeAoVivoTrackId, tracks, isLeftHanded, activeVariationsRef } = useSequencer();
  const [hitEvent, setHitEvent] = useState<HitEvent | null>(null);
  const target = useRodaTarget();
  const { width } = useWindowSize();

  const lastVuStepRef = useRef<number>(-1);

  useEffect(() => {
    if (activeAoVivoTrackId === null) return;
    const activeTrack = tracks.find(t => t.id === activeAoVivoTrackId);
    if (!activeTrack) return;

    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      
      if (step < 0) {
        lastVuStepRef.current = -1;
        setHitEvent(null);
        return;
      }

      const currentLivePattern = activeTrack.patterns.find(p => p.measureAssignments[measure]);
      if (!currentLivePattern) {
        lastVuStepRef.current = -1;
        return;
      }

      const targetStep = Math.floor(ratio * currentLivePattern.steps);

      if (targetStep !== lastVuStepRef.current) {
        lastVuStepRef.current = targetStep;
        if (!activeTrack.isMute) {
          const activePlayingSteps = activeVariationsRef?.current[activeTrack.id] || currentLivePattern.activeSteps;
          const val = activePlayingSteps[targetStep];
          const isHit = val !== undefined && val !== 0 && val !== '0' && val !== '';
          if (isHit) {
            setHitEvent({ stroke: String(val), time: Date.now() });
          }
        }
      }
    };

    window.addEventListener('o-girador-tick', handleTick);
    return () => window.removeEventListener('o-girador-tick', handleTick);
  }, [activeAoVivoTrackId, tracks]);

  if (activeAoVivoTrackId === null) return null;

  const activeTrack = tracks.find(t => t.id === activeAoVivoTrackId);
  if (!activeTrack) return null;

  const inst = instrumentsConfig[activeTrack.instrumentIdx];
  if (!inst) return null;

  const stroke = hitEvent?.stroke || '';
  const time = hitEvent?.time || 0;

  const renderInstruments = () => {
    let animDominant = '';
    let animWeak = '';
    let animLeft = '';
    let animRight = '';
    let animHalo = false;
    let animHaloOffsetY = 0;
    
    const isVibrate = stroke === 'b' || stroke === 'B';
    if (isVibrate) {
      animDominant = 'pov-anim-shake';
      animWeak = 'pov-anim-shake';
    }

    // Distance entre les poignets : écartement XXL pour remonter très haut vers le centre
    const handSpread = Math.min(width * 0.45, 550);
    // On écarte le point d'impact cible de 160px pour un max de séparation sur l'Aro
    const targetLeft = { x: target.x - 160, y: target.y };
    const targetRight = { x: target.x + 160, y: target.y };

    switch (inst.id) {
      case 'marcante':
      case 'meiao':
      case 'repique': {
        if (!isVibrate) {
          if (stroke === 'D') {
            animDominant = 'pov-anim-hit-strong';
          } else if (stroke === 'd') {
            animDominant = 'pov-anim-hit';
          } else if (stroke === 'E') {
            animWeak = 'pov-anim-hit-strong';
          } else if (stroke === 'e') {
            animWeak = 'pov-anim-hit';
          } else if (stroke === 'i' || stroke === 'I') {
            // Bacalhau : la main faible frappe d'un coup sec
            animWeak = 'pov-anim-hit-weak';
          } else if (stroke === 'x' || stroke === 'X') {
            animLeft = 'pov-anim-out-left';
            animRight = 'pov-anim-out-right';
            animHalo = true;
            animHaloOffsetY = -100; // Suit la baguette qui se lève
          } else if (stroke === 'c' || stroke === 'C') {
            animLeft = 'pov-anim-cross-left';
            animRight = 'pov-anim-cross-right';
            animHalo = true;
            animHaloOffsetY = -150; // Le croisement se fait 150px plus haut
          } else if (stroke) {
            animDominant = 'pov-anim-hit';
            animWeak = 'pov-anim-hit';
          }
        }
        
        // Résolution de l'orientation Left/Right selon le gaucher
        if (!animLeft) animLeft = isLeftHanded ? animDominant : animWeak;
        if (!animRight) animRight = isLeftHanded ? animWeak : animDominant;

        return (
          <>
            <RimHalo show={animHalo} hitTime={time} target={target} yOffset={animHaloOffsetY} />
            <StickWrapper xOffset={-handSpread} target={targetLeft}>
              {isLeftHanded ? <AlfaiaMacaneta animClass={animLeft} hitTime={time} /> : <AlfaiaBacalhau animClass={animLeft} hitTime={time} />}
            </StickWrapper>
            <StickWrapper xOffset={handSpread} target={targetRight}>
              {isLeftHanded ? <AlfaiaBacalhau animClass={animRight} hitTime={time} /> : <AlfaiaMacaneta animClass={animRight} hitTime={time} />}
            </StickWrapper>
          </>
        );
      }

      case 'caixa':
      case 'tarol': {
        if (!isVibrate) {
          // Caixa : les coups normaux sont très légers (hit-micro), les majuscules font un hit complet standard
          if (stroke === 'D') animDominant = 'pov-anim-hit';
          else if (stroke === 'd') animDominant = 'pov-anim-hit-micro';
          else if (stroke === 'E') animWeak = 'pov-anim-hit';
          else if (stroke === 'e') animWeak = 'pov-anim-hit-micro';
          else if (stroke === 'R') {
            animDominant = 'pov-anim-shake';
          }
          else if (stroke === 'r') {
            animWeak = 'pov-anim-shake';
          }
          else if (stroke === 'f' || stroke === 'F') {
            animWeak = 'pov-anim-fla-left';
            animDominant = 'pov-anim-fla-right';
          }
          else if (stroke === 'x' || stroke === 'X') {
            animLeft = 'pov-anim-out-left';
            animRight = 'pov-anim-out-right';
            animHalo = true;
            animHaloOffsetY = -100;
          }
          else if (stroke === 'c' || stroke === 'C') {
            animLeft = 'pov-anim-cross-left';
            animRight = 'pov-anim-cross-right';
            animHalo = true;
            animHaloOffsetY = -150;
          }
          else if (stroke) {
            animDominant = 'pov-anim-hit-micro';
            animWeak = 'pov-anim-hit-micro';
          }
        }

        if (!animLeft) animLeft = isLeftHanded ? animDominant : animWeak;
        if (!animRight) animRight = isLeftHanded ? animWeak : animDominant;

        return (
          <>
            <RimHalo show={animHalo} hitTime={time} target={target} yOffset={animHaloOffsetY} />
            <StickWrapper xOffset={-handSpread} target={targetLeft}>
              <DrumStick animClass={animLeft} hitTime={time} />
            </StickWrapper>
            <StickWrapper xOffset={handSpread} target={targetRight}>
              <DrumStick animClass={animRight} hitTime={time} />
            </StickWrapper>
          </>
        );
      }

      case 'mineiro': {
        let animMineiro = '';
        
        if (stroke === 'P') animMineiro = 'pov-anim-mineiro-push-strong';
        else if (stroke === 'p') animMineiro = 'pov-anim-mineiro-push-weak';
        else if (stroke === 'T') animMineiro = 'pov-anim-mineiro-pull-strong';
        else if (stroke === 't') animMineiro = 'pov-anim-mineiro-pull-weak';
        else if (stroke === 'L' || stroke === 'l') animMineiro = 'pov-anim-mineiro-left';
        else if (stroke === 'B' || stroke === 'b') animMineiro = 'pov-anim-mineiro-shake';
        else if (stroke) animMineiro = 'pov-anim-mineiro-push-weak'; // Default hit

        return (
          <MineiroContainer target={target}>
            <MineiroStick animClass={animMineiro} hitTime={time} />
          </MineiroContainer>
        );
      }

      case 'agbe': {
        let animAgbe = '';
        
        if (stroke === 'S') animAgbe = 'pov-anim-agbe-secoche-strong';
        else if (stroke === 's') animAgbe = 'pov-anim-agbe-secoche-weak';
        else if (stroke === 'D') animAgbe = 'pov-anim-agbe-dos-strong';
        else if (stroke === 'd') animAgbe = 'pov-anim-agbe-dos-weak';
        else if (stroke === 'E') animAgbe = 'pov-anim-agbe-haut-strong';
        else if (stroke === 'e') animAgbe = 'pov-anim-agbe-haut-weak';
        else if (stroke === 'V') animAgbe = 'pov-anim-agbe-ventre-strong';
        else if (stroke === 'v') animAgbe = 'pov-anim-agbe-ventre-weak';
        else if (stroke === 'B' || stroke === 'b') animAgbe = 'pov-anim-agbe-shake';
        else if (stroke) animAgbe = 'pov-anim-agbe-secoche-weak'; // Default hit

        return <AgbeNet animClass={animAgbe} hitTime={time} target={target} />;
      }

      case 'gongue': {
        let animCenter = '';
        let hitTarget = { x: target.x, y: target.y };

        const isVibrate = stroke === 'b' || stroke === 'B';
        if (isVibrate) {
          animCenter = 'pov-anim-shake';
          hitTarget.y = target.y - 30; // Centre pour le barulho
        } else {
          // Les coups graves (G/g) tapent beaucoup plus haut dans l'image
          if (stroke === 'G') {
            animCenter = 'pov-anim-gongue-hit-strong';
            hitTarget.y = target.y - 200;
          } else if (stroke === 'g') {
            animCenter = 'pov-anim-gongue-hit-micro';
            hitTarget.y = target.y - 200;
          } 
          // Les coups aigus (A/a) tapent beaucoup plus bas dans l'image
          else if (stroke === 'A') {
            animCenter = 'pov-anim-gongue-hit-strong';
            hitTarget.y = target.y + 120;
          } else if (stroke === 'a') {
            animCenter = 'pov-anim-gongue-hit-micro';
            hitTarget.y = target.y + 120;
          } else if (stroke) {
            animCenter = 'pov-anim-gongue-hit-micro';
            hitTarget.y = target.y - 30;
          }
        }

        // Toujours une seule baguette, jouée par la main dominante
        const offset = isLeftHanded ? -handSpread : handSpread;
        // On décale légèrement la frappe sur le côté de la Roda (du côté de la main qui tient la baguette)
        hitTarget.x = target.x + (offset * 0.4);

        return (
          <StickWrapper xOffset={offset} target={hitTarget}>
            <GongueStick animClass={animCenter} hitTime={time} />
          </StickWrapper>
        );
      }

      default:
        // Ignore les autres instruments pour cette itération
        return null;
    }
  };

  return (
    <>
      <style>{style}</style>
      <div className="absolute inset-0 z-[10] overflow-hidden pointer-events-none perspective-[1000px]">
        {renderInstruments()}
      </div>
    </>
  );
};

