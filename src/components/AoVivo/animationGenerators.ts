// Helper functions for random micro-variations (Humanisation / "balanço")
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomSign = () => (Math.random() > 0.5 ? 1 : -1);

// Alfaia Animation Keyframes Generator (Repos -> Impact -> Repos)
// First-Person perspective: impact is high on screen (negative Y), repos is low on screen (near player)
// Three keyframes for normal hits, Four keyframes for strong E/D hits to add Z-axis (scale) wind-up and impact.
export function generateAlfaiaKeyframes(stroke: string, isLeft: boolean): Keyframe[] {
  const randY = randomSign() * randomRange(5, 15);
  const randRot = randomSign() * randomRange(1, 3);
  const isVibrate = stroke === 'b' || stroke === 'B';

  // Coup Fort (E, D, I, X, C) -> repos remains high near the skin (large negative Y)
  // Coup Faible (e, d, i, x, c) -> repos rebounds low near the player/bottom of screen (small negative Y)
  const isStrong = ['D', 'E', 'I', 'X', 'C'].includes(stroke);
  const reposY = isStrong ? -100 : 0;
  const reposRotX = isStrong ? 15 : 30;

  // Humanisation XY at the impact (25%)
  const impactX = randomSign() * randomRange(2, 6);
  const impactY = randomSign() * randomRange(2, 6);

  if (isVibrate) {
    return [
      { transform: `translate(${impactX}px, ${reposY + impactY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-in-out' },
      { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY - 18 + randY * 0.2}px) rotateZ(${-5 + randRot * 0.5}deg) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translateX(${18 - randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) rotateZ(${5 - randRot * 0.5}deg) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
      { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) rotateZ(${-5 + randRot * 0.5}deg) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  }

  // --- Strong Hits (E, D) with 3D wind-up (scale 1.15) and whipped impact (scale 0.85) ---
  if (stroke === 'D' || stroke === 'E') {
    const finalY = -280 + randY;
    const finalRotX = 0; // Flat at impact
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(0px, 20px) rotateX(${reposRotX - 10}deg) scale(1.15)`, offset: 0.1, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(0.85)`, offset: 0.25, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }

  // Determine standard rebound parameters based on stroke
  let targetY = -130;
  let targetRotX = 40;
  let useZ = false;
  let targetRotZ = 0;

  if (stroke === 'd' || stroke === 'e') {
    targetY = -130;
    targetRotX = 35;
  } else if (stroke === 'i' || stroke === 'I') {
    targetY = isStrong ? -220 : -150;
    targetRotX = isStrong ? 45 : 30;
  } else if (stroke === 'x' || stroke === 'X') {
    targetY = -120;
    targetRotZ = isLeft ? -16 : 16;
    useZ = true;
  } else if (stroke === 'c' || stroke === 'C') {
    targetY = -150;
    targetRotZ = isLeft ? 16 : -16;
    useZ = true;
  }

  const finalY = targetY + randY;
  const finalRotX = 0 + randRot; // Flat on impact
  const finalRotZ = targetRotZ + randRot;

  if (useZ) {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateZ(${finalRotZ}deg) scale(1)`, offset: 0.25, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  } else {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(1)`, offset: 0.25, easing: 'cubic-bezier(0.15, 1.15, 0.3, 1)' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }
}

// Drum (Caixa/Tarol) Keyframes Generator (Repos -> Impact -> Repos)
// Caixa clara is resserrée. Snappy elastic rebound (easing: cubic-bezier(0.1, 2.0, 0.3, 1)).
export function generateDrumKeyframes(stroke: string, isLeft: boolean): Keyframe[] {
  const randY = randomSign() * randomRange(5, 15);
  const randRot = randomSign() * randomRange(1, 3);
  const isVibrate = stroke === 'b' || stroke === 'B';

  const isStrong = ['D', 'E', 'R', 'F', 'X', 'C'].includes(stroke);
  const reposY = isStrong ? -60 : 0;
  const reposRotX = isStrong ? 10 : 25;

  // Humanisation XY at the impact (25%)
  const impactX = randomSign() * randomRange(2, 6);
  const impactY = randomSign() * randomRange(2, 6);

  if (isVibrate) {
    return [
      { transform: `translate(${impactX}px, ${reposY + impactY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-in-out' },
      { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY - 18 + randY * 0.2}px) rotateZ(${-5 + randRot * 0.5}deg) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translateX(${18 - randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) rotateZ(${5 - randRot * 0.5}deg) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
      { transform: `translateX(${-18 + randY * 0.2}px) translateY(${reposY + 18 - randY * 0.2}px) rotateZ(${-5 + randRot * 0.5}deg) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  }

  // --- Strong Hits (E, D) with 3D wind-up (scale 1.15) and whipped impact (scale 0.85) ---
  if (stroke === 'D' || stroke === 'E') {
    const finalY = -180 + randY;
    const finalRotX = 0; // Flat at impact
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(0px, 20px) rotateX(${reposRotX - 8}deg) scale(1.15)`, offset: 0.1, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(0.85)`, offset: 0.25, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }

  if (stroke === 'R' || stroke === 'r') {
    // Rufada: Y impact zone confined strictly to weak hit impact coordinate (-135px)
    const hitY = -135;
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${hitY + impactY}px) rotateZ(0deg) scale(1)`, offset: 0.25, easing: 'linear' },
      { transform: `translate(${impactX * 0.8}px, ${hitY + 5 - randY * 0.1}px) rotateZ(0deg) scale(1)`, offset: 0.40, easing: 'linear' },
      { transform: `translate(${impactX * 0.6}px, ${hitY + impactY}px) rotateZ(0deg) scale(1)`, offset: 0.55, easing: 'linear' },
      { transform: `translate(${impactX * 0.4}px, ${hitY + 5 - randY * 0.1}px) rotateZ(0deg) scale(1)`, offset: 0.70, easing: 'linear' },
      { transform: `translate(${impactX * 0.2}px, ${hitY + impactY}px) rotateZ(0deg) scale(1)`, offset: 0.85, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  }

  let targetY = -135;
  let targetRotX = 45;
  let useZ = false;
  let targetRotZ = 0;

  if (stroke === 'd' || stroke === 'e') {
    targetY = -135;
    targetRotX = 35;
  } else if (stroke === 'f' || stroke === 'F') {
    targetY = isStrong ? -120 : -135;
    targetRotZ = isLeft ? 16 : -16;
    useZ = true;
  } else if (stroke === 'x' || stroke === 'X') {
    targetY = isStrong ? -100 : -80;
    targetRotZ = isLeft ? -16 : 16;
    useZ = true;
  } else if (stroke === 'c' || stroke === 'C') {
    targetY = isStrong ? -120 : -135;
    targetRotZ = isLeft ? 16 : -16;
    useZ = true;
  }

  const finalY = targetY + randY;
  const finalRotX = 0 + randRot; // Flat on impact
  const finalRotZ = targetRotZ + randRot;

  if (useZ) {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateZ(${finalRotZ}deg) scale(1)`, offset: 0.25, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  } else {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(1)`, offset: 0.25, easing: 'cubic-bezier(0.1, 2.0, 0.3, 1)' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }
}

// Gonguê Keyframes Generator (Impact -> Repos)
export function generateGongueKeyframes(stroke: string): Keyframe[] {
  const randX = 0; // Removed horizontal drift per user request
  const randRot = randomSign() * randomRange(0.5, 1.5);
  const isVibrate = stroke === 'b' || stroke === 'B';

  const isStrong = ['G', 'A'].includes(stroke);

  const reposRotX = 0; // Stick flat on the bell at rest

  // Windup: lift tip strongly towards camera (negative rotateX makes it grow and go up)
  const windUpRotX = isStrong ? -45 : -25;

  // Impact: Always hit perfectly flat (rotateX = 0) so the tip size is identical
  const hitTargetRotX = 0; 

  if (isVibrate) {
    return [
      { transform: `translate3d(0px, 0px, 0px) rotateX(${reposRotX}deg)`, easing: 'ease-in-out' },
      { transform: `translate3d(${-5 + randX}px, 0px, 0px) rotateZ(${-2 + randRot}deg)`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translate3d(${5 - randX}px, 0px, 0px) rotateZ(${2 - randRot}deg)`, offset: 0.5, easing: 'ease-in-out' },
      { transform: `translate3d(${-5 + randX}px, 0px, 0px) rotateZ(${-2 + randRot}deg)`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate3d(0px, 0px, 0px) rotateX(${reposRotX}deg)` }
    ];
  }

  // Total duration passed by AoVivoOverlay is 350ms
  const windUpDuration = 100;
  const impactDuration = 30; // Snappy hit
  
  const windUpOffset = windUpDuration / 350;
  const impactOffset = (windUpDuration + impactDuration) / 350;

  const finalX = randX;
  const finalRotX = hitTargetRotX + randRot;

  return [
    { 
      transform: `translate3d(0px, 0px, 0px) rotateX(${reposRotX}deg)`,
      offset: 0,
      easing: 'ease-out' 
    },
    { 
      transform: `translate3d(0px, 0px, 0px) rotateX(${windUpRotX}deg)`,
      offset: windUpOffset,
      easing: 'cubic-bezier(0.5, 0, 0.8, 1)' 
    },
    { 
      transform: `translate3d(${finalX}px, 0px, 0px) rotateX(${finalRotX}deg)`,
      offset: impactOffset,
      easing: 'linear' // Direct hit
    },
    { 
      // Hold the stick flat on the bell until the animation finishes (no rebound at all)
      transform: `translate3d(0px, 0px, 0px) rotateX(${reposRotX}deg)`,
      offset: 1
    }
  ];
}

// Mineiro Keyframes Generator (Inertial physics: Decoupling Hand/Seeds)
// First-Person perspective: Y translation is coupled with scale changes to create 3D Z depth (extremely soft scale values, smooth ease-in-out)
export function generateMineiroKeyframes(stroke: string): Keyframe[] {
  const randOffset = randomSign() * randomRange(2, 4); // minime random Y offset

  if (stroke === 'P' || stroke === 'p' || stroke === 'F' || stroke === 'f') {
    const isStrong = stroke === 'P' || stroke === 'F';
    const distY = isStrong ? -35 : -15;
    const scaleFactor = isStrong ? 0.9 : 0.96;

    return [
      { transform: 'translateY(0px) scale(1)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, // Élan fluide
      { transform: `translateY(${distY + randOffset}px) scale(${scaleFactor})`, offset: 0.35, easing: 'ease-out' }, // Apogée / Impact des graines
      { transform: `translateY(${distY * 0.3}px) scale(${1 - (1 - scaleFactor) * 0.3})`, offset: 0.55, easing: 'ease-in-out' }, // Rebond / Inertie
      { transform: 'translateY(0px) scale(1)', offset: 1 } // Retour fluide au centre
    ];
  }

  if (stroke === 'T' || stroke === 't') {
    const isStrong = stroke === 'T';
    const distY = isStrong ? 35 : 15;
    const scaleFactor = isStrong ? 1.1 : 1.04;

    return [
      { transform: 'translateY(0px) scale(1)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { transform: `translateY(${distY + randOffset}px) scale(${scaleFactor})`, offset: 0.35, easing: 'ease-out' },
      { transform: `translateY(${distY * 0.3}px) scale(${1 + (scaleFactor - 1) * 0.3})`, offset: 0.55, easing: 'ease-in-out' },
      { transform: 'translateY(0px) scale(1)', offset: 1 }
    ];
  }

  if (stroke === 'L' || stroke === 'l') {
    return [
      { transform: 'translateX(0px) scale(1)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { transform: `translateX(${-80 + randOffset}px) scale(1)`, offset: 0.35, easing: 'ease-out' },
      { transform: `translateX(${-20}px) scale(1)`, offset: 0.55, easing: 'ease-in-out' },
      { transform: 'translateX(0px) scale(1)', offset: 1 }
    ];
  }

  if (stroke === 'B' || stroke === 'b') {
    const amp = 8;
    return [
      { transform: 'translateX(0px)', offset: 0, easing: 'ease-out' },
      { transform: `translateX(${-amp + randOffset}px)`, offset: 0.15 },
      { transform: `translateX(${amp - randOffset}px)`, offset: 0.35 },
      { transform: `translateX(${-amp + randOffset}px)`, offset: 0.55 },
      { transform: `translateX(${amp - randOffset}px)`, offset: 0.75 },
      { transform: 'translateX(0px)', offset: 1 }
    ];
  }

  return [
    { transform: 'translate(0, 0)', offset: 0 },
    { transform: 'translate(0, 0)', offset: 1 }
  ];
}

// Agbê Keyframes Generator (3D pendulum and bead inertia physics)
export function generateAgbeKeyframes(stroke: string): Keyframe[] {
  const randX = randomSign() * randomRange(2, 5);
  const randY = randomSign() * randomRange(2, 5);
  const randRot = randomSign() * randomRange(1, 2);

  const isStrong = ['D', 'E', 'S', 'V', 'B'].includes(stroke);
  const scaleFactor = isStrong ? 1.0 : (1.0 / 3.0);

  // Mouvements Latéraux: D, E, d, e
  if (stroke === 'D' || stroke === 'd') {
    const startX = 120 * scaleFactor + randX;
    const startY = -20 * scaleFactor + randY;
    const startRot = 25 * scaleFactor + randRot;

    const rebX = 115 * scaleFactor + randX * 0.8;
    const rebY = -18 * scaleFactor + randY * 0.8;
    const rebRot = 23 * scaleFactor + randRot * 0.8;

    return [
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }, // Windup organique
      { transform: `translateX(${startX}px) translateY(${startY}px) rotateZ(${startRot}deg)`, offset: 0.3, easing: 'ease-out' }, // Impact / Apogée
      { transform: `translateX(${rebX}px) translateY(${rebY}px) rotateZ(${rebRot}deg)`, offset: 0.45, easing: 'ease-in-out' }, // Rebond des graines
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', offset: 1 } // Retour
    ];
  }

  if (stroke === 'E' || stroke === 'e') {
    const startX = -120 * scaleFactor + randX;
    const startY = -20 * scaleFactor + randY;
    const startRot = -25 * scaleFactor + randRot;

    const rebX = -115 * scaleFactor + randX * 0.8;
    const rebY = -18 * scaleFactor + randY * 0.8;
    const rebRot = -23 * scaleFactor + randRot * 0.8;

    return [
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { transform: `translateX(${startX}px) translateY(${startY}px) rotateZ(${startRot}deg)`, offset: 0.3, easing: 'ease-out' },
      { transform: `translateX(${rebX}px) translateY(${rebY}px) rotateZ(${rebRot}deg)`, offset: 0.45, easing: 'ease-in-out' },
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', offset: 1 }
    ];
  }

  // Mouvements Verticaux: S, s, V, v
  if (stroke === 'S' || stroke === 's') {
    const startY = -100 * scaleFactor + randY;
    const startRotX = 40 * scaleFactor + randRot;

    const rebY = -95 * scaleFactor + randY * 0.8;
    const rebRotX = 35 * scaleFactor + randRot * 0.8;

    return [
      { transform: 'translateY(0px) rotateX(0deg)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { transform: `translateY(${startY}px) rotateX(${startRotX}deg)`, offset: 0.3, easing: 'ease-out' },
      { transform: `translateY(${rebY}px) rotateX(${rebRotX}deg)`, offset: 0.45, easing: 'ease-in-out' },
      { transform: 'translateY(0px) rotateX(0deg)', offset: 1 }
    ];
  }

  if (stroke === 'V' || stroke === 'v') {
    const startY = 100 * scaleFactor + randY;
    const startRotX = -40 * scaleFactor + randRot;

    const rebY = 95 * scaleFactor + randY * 0.8;
    const rebRotX = -35 * scaleFactor + randRot * 0.8;

    return [
      { transform: 'translateY(0px) rotateX(0deg)', offset: 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { transform: `translateY(${startY}px) rotateX(${startRotX}deg)`, offset: 0.3, easing: 'ease-out' },
      { transform: `translateY(${rebY}px) rotateX(${rebRotX}deg)`, offset: 0.45, easing: 'ease-in-out' },
      { transform: 'translateY(0px) rotateX(0deg)', offset: 1 }
    ];
  }

  // Secouement / Vibré: B, b
  if (stroke === 'B' || stroke === 'b') {
    const ampX = 15 * scaleFactor;
    const ampRot = 5 * scaleFactor;

    return [
      { transform: 'translate(0, 0) rotate(0deg)', offset: 0, easing: 'ease-out' },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.1 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.2 },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.3 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.4 },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.5 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.6 },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.7 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.8 },
      { transform: `translateX(${-ampX * 0.6 + randX * 0.5}px) rotateZ(${-ampRot * 0.6 + randRot * 0.5}deg)`, offset: 0.9 },
      { transform: 'translate(0, 0) rotate(0deg)', offset: 1 }
    ];
  }

  return [
    { transform: 'translate(0, 0)', offset: 0 },
    { transform: 'translate(0, 0)', offset: 1 }
  ];
}

// --- STATIC KEYFRAMES (No humanisation requested / Custom complex paths) ---
export const KEYFRAMES_TIMBAL_G = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'ease-out' },
  { transform: 'translateY(80px) rotateX(15deg)', offset: 0.25, easing: 'ease-in' },
  { transform: 'translateY(-250px) rotateX(-5deg)', offset: 0.4, easing: 'ease-out' },
  { transform: 'translateY(-60px) rotateX(5deg)', offset: 0.6, easing: 'ease-in-out' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

export const KEYFRAMES_TIMBAL_A = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'ease-out' },
  { transform: 'translateY(-40px) rotateX(-5deg)', offset: 0.25, easing: 'ease-in' },
  { transform: 'translateY(500px) rotateX(15deg)', offset: 0.4, easing: 'ease-out' },
  { transform: 'translateY(30px) rotateX(5deg)', offset: 0.6, easing: 'ease-in-out' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

export const KEYFRAMES_TIMBAL_S = [
  { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
  { transform: 'translateY(20px) scale(1.12)', offset: 0.1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
  { transform: 'translateY(100px) scale(0.98)', offset: 0.25, easing: 'ease-out' },
  { transform: 'translateY(20px) scale(1.02)', offset: 0.35, easing: 'ease-in-out' },
  { transform: 'translateY(0px) scale(1)' }
];

export const KEYFRAMES_TIMBAL_S_WEAK = [
  { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
  { transform: 'translateY(12px) scale(1.06)', offset: 0.1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
  { transform: 'translateY(60px) scale(0.99)', offset: 0.25, easing: 'ease-out' },
  { transform: 'translateY(12px) scale(1.01)', offset: 0.35, easing: 'ease-in-out' },
  { transform: 'translateY(0px) scale(1)' }
];

export const KEYFRAMES_TIMBAL_D = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'ease-out' },
  { transform: 'translateY(30px) rotateX(5deg)', offset: 0.25, easing: 'ease-in' },
  { transform: 'translateY(-40px) rotateX(-1deg)', offset: 0.4, easing: 'ease-out' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

export const KEYFRAMES_TIMBAL_P = [
  { transform: 'translateY(0px) rotateX(0deg)', easing: 'ease-out' },
  { transform: 'translateY(80px) rotateX(15deg)', offset: 0.25, easing: 'ease-in' },
  { transform: 'translateY(-130px) rotateX(5deg)', offset: 0.4, easing: 'ease-out' },
  { transform: 'translateY(-130px) rotateX(5deg)', offset: 0.75, easing: 'ease-in-out' },
  { transform: 'translateY(0px) rotateX(0deg)' }
];

export const KEYFRAMES_AGBE_STRETCH_Y_STRONG = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.15)', offset: 0.3 },
  { transform: 'scaleY(1)' }
];

export const KEYFRAMES_AGBE_STRETCH_Y_WEAK = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.08)', offset: 0.3 },
  { transform: 'scaleY(1)' }
];

export const KEYFRAMES_AGBE_STRETCH_X_STRONG = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.15)', offset: 0.3 },
  { transform: 'scaleX(1)' }
];

export const KEYFRAMES_AGBE_STRETCH_X_WEAK = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.08)', offset: 0.3 },
  { transform: 'scaleX(1)' }
];

export const KEYFRAMES_AGBE_SHAKE = [
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

export const KEYFRAMES_HALO = [
  { opacity: 0.8, transform: 'translate(-50%, -50%) scale(0.6)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
];

export const KEYFRAMES_FLASH_STRONG: Keyframe[] = [
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
];

export const KEYFRAMES_FLASH_WEAK: Keyframe[] = [
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(0.8)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' }
];

export const KEYFRAMES_FLASH_VIBRATE: Keyframe[] = [
  { opacity: 0.5, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.2 },
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1.05)', offset: 0.4 },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.6 },
  { opacity: 0.3, transform: 'translate(-50%, -50%) scale(1.02)', offset: 0.8 },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' }
];
