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
    const finalY = -250 + randY;
    const finalRotX = 55 + randRot;
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-out' },
      { transform: `translate(0px, 20px) rotateX(${reposRotX - 10}deg) scale(1.15)`, offset: 0.1, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(0.85)`, offset: 0.25, easing: 'ease-out' },
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
  const finalRotX = targetRotX + randRot;
  const finalRotZ = targetRotZ + randRot;

  if (useZ) {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateZ(${finalRotZ}deg) scale(1)`, offset: 0.25, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  } else {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(1)`, offset: 0.25, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }
}

// Drum (Caixa/Tarol) Keyframes Generator (Repos -> Impact -> Repos)
// Caixa clara is resserrée. Weak Y impact target increased to -135px (halfway between -90px and -180px).
// Three keyframes for normal hits, Four keyframes for strong E/D hits to add Z-axis (scale) wind-up and impact.
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
    const finalRotX = 55 + randRot;
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-out' },
      { transform: `translate(0px, 20px) rotateX(${reposRotX - 8}deg) scale(1.15)`, offset: 0.1, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(0.85)`, offset: 0.25, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }

  if (stroke === 'R' || stroke === 'r') {
    // Rufada: Y impact zone confined strictly to weak hit impact coordinate (-135px)
    const hitY = -135;
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
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
  const finalRotX = targetRotX + randRot;
  const finalRotZ = targetRotZ + randRot;

  if (useZ) {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)`, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateZ(${finalRotZ}deg) scale(1)`, offset: 0.25, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  } else {
    return [
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'cubic-bezier(0.5, 0, 1, 1)' },
      { transform: `translate(${impactX}px, ${finalY + impactY}px) rotateX(${finalRotX}deg) scale(1)`, offset: 0.25, easing: 'ease-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
    ];
  }
}

// Gonguê Keyframes Generator (Impact -> Repos)
// Unchanged from Task 10, as requested by user.
export function generateGongueKeyframes(stroke: string): Keyframe[] {
  const randY = randomSign() * randomRange(1, 3); // smaller random height offset for gongue
  const randRot = randomSign() * randomRange(0.5, 1.5);
  const isVibrate = stroke === 'b' || stroke === 'B';

  const isStrong = ['G', 'A'].includes(stroke);
  const reposY = isStrong ? -100 : 0;
  const reposRotX = isStrong ? 2 : 4;

  // Humanisation XY at the impact (0%)
  const impactX = randomSign() * randomRange(2, 6);
  const impactY = randomSign() * randomRange(2, 6);

  const hitTargetY = isStrong ? -250 : -130;

  if (isVibrate) {
    return [
      { transform: `translate(${impactX}px, ${reposY + impactY}px) rotateX(${reposRotX}deg) scale(1)`, easing: 'ease-in-out' },
      { transform: `translateX(${-10 + randY * 0.2}px) translateY(${reposY - 10 + randY * 0.2}px) rotateZ(${-3 + randRot * 0.5}deg) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translateX(${10 - randY * 0.2}px) translateY(${reposY + 10 - randY * 0.2}px) rotateZ(${3 - randRot * 0.5}deg) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
      { transform: `translateX(${-10 + randY * 0.2}px) translateY(${reposY + 10 - randY * 0.2}px) rotateZ(${-3 + randRot * 0.5}deg) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) rotateZ(0deg) scale(1)` }
    ];
  }

  // Gonguê crushing physics:
  // Hitting the skin/metal is at hitTargetY
  // Glued state is hitTargetY (0.10s hold)
  // Repos state is reposY
  return [
    { transform: `translate(${impactX}px, ${hitTargetY + impactY}px) rotateX(0deg) scale(1)`, easing: 'linear' },
    { transform: `translate(${impactX * 0.8}px, ${hitTargetY + randY * 0.1}px) rotateX(${reposRotX * 0.2 + randRot * 0.1}deg) scale(1)`, offset: 0.10, easing: 'ease-in-out' },
    { transform: `translate(0px, ${reposY}px) rotateX(${reposRotX}deg) scale(1)` }
  ];
}

// Mineiro Keyframes Generator (Inertial physics: Decoupling Hand/Seeds)
// First-Person perspective: Y translation is coupled with scale changes to create 3D Z depth (extremely soft scale values, smooth ease-in-out)
export function generateMineiroKeyframes(stroke: string): Keyframe[] {
  const randOffset = randomSign() * randomRange(2, 4); // minime random Y offset

  if (stroke === 'P') {
    // Poussé Fort: translateY(-15px) scale(0.95) -> translateY(0) scale(1)
    return [
      { transform: `translateY(${-15 + randOffset}px) scale(0.95)`, easing: 'ease-in-out' },
      { transform: 'translateY(0px) scale(1)' }
    ];
  } else if (stroke === 'p') {
    // Rebond Graines: translateY(-5px) scale(0.98)
    return [
      { transform: `translateY(${-5 + randOffset}px) scale(0.98)`, easing: 'ease-in-out' },
      { transform: 'translateY(0px) scale(1)' }
    ];
  } else if (stroke === 'T') {
    // Tiré Fort: translateY(20px) scale(1.05)
    return [
      { transform: `translateY(${20 + randOffset}px) scale(1.05)`, easing: 'ease-in-out' },
      { transform: 'translateY(0px) scale(1)' }
    ];
  } else if (stroke === 't') {
    // Rebond Graines: translateY(5px) scale(1.02)
    return [
      { transform: `translateY(${5 + randOffset}px) scale(1.02)`, easing: 'ease-in-out' },
      { transform: 'translateY(0px) scale(1)' }
    ];
  } else if (stroke === 'L' || stroke === 'l') {
    return [
      { transform: `translate(${-200 + randOffset}px, 0)`, easing: 'ease-in-out' },
      { transform: 'translate(0, 0)' }
    ];
  } else if (stroke === 'B' || stroke === 'b') {
    // Shake
    return [
      { transform: 'translate(0, 0)', easing: 'ease-in-out' },
      { transform: `translate(${-15 + randOffset * 0.5}px, 0)`, offset: 0.1, easing: 'ease-in-out' },
      { transform: `translate(${15 - randOffset * 0.5}px, 0)`, offset: 0.2, easing: 'ease-in-out' },
      { transform: `translate(${-15 + randOffset * 0.5}px, 0)`, offset: 0.3, easing: 'ease-in-out' },
      { transform: `translate(${15 - randOffset * 0.5}px, 0)`, offset: 0.4, easing: 'ease-in-out' },
      { transform: `translate(${-15 + randOffset * 0.5}px, 0)`, offset: 0.5, easing: 'ease-in-out' },
      { transform: `translate(${15 - randOffset * 0.5}px, 0)`, offset: 0.6, easing: 'ease-in-out' },
      { transform: `translate(${-15 + randOffset * 0.5}px, 0)`, offset: 0.7, easing: 'ease-in-out' },
      { transform: `translate(${15 - randOffset * 0.5}px, 0)`, offset: 0.8, easing: 'ease-in-out' },
      { transform: `translate(${-15 + randOffset * 0.5}px, 0)`, offset: 0.9, easing: 'ease-in-out' },
      { transform: 'translate(0, 0)' }
    ];
  }

  return [
    { transform: 'translate(0, 0)' }
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

    const endX = 10 * scaleFactor;
    const endY = 10 * scaleFactor;
    const endRot = 2 * scaleFactor;

    return [
      { transform: `translateX(${startX}px) translateY(${startY}px) rotateZ(${startRot}deg)`, easing: 'ease-out' },
      { transform: `translateX(${rebX}px) translateY(${rebY}px) rotateZ(${rebRot}deg)`, offset: 0.15, easing: 'ease-in-out' },
      { transform: `translateX(${endX}px) translateY(${endY}px) rotateZ(${endRot}deg)` }
    ];
  }

  if (stroke === 'E' || stroke === 'e') {
    const startX = -120 * scaleFactor + randX;
    const startY = -20 * scaleFactor + randY;
    const startRot = -25 * scaleFactor + randRot;

    const rebX = -115 * scaleFactor + randX * 0.8;
    const rebY = -18 * scaleFactor + randY * 0.8;
    const rebRot = -23 * scaleFactor + randRot * 0.8;

    const endX = -10 * scaleFactor;
    const endY = 10 * scaleFactor;
    const endRot = -2 * scaleFactor;

    return [
      { transform: `translateX(${startX}px) translateY(${startY}px) rotateZ(${startRot}deg)`, easing: 'ease-out' },
      { transform: `translateX(${rebX}px) translateY(${rebY}px) rotateZ(${rebRot}deg)`, offset: 0.15, easing: 'ease-in-out' },
      { transform: `translateX(${endX}px) translateY(${endY}px) rotateZ(${endRot}deg)` }
    ];
  }

  // Mouvements Verticaux: S, s, V, v
  if (stroke === 'S' || stroke === 's') {
    const startY = -100 * scaleFactor + randY;
    const startRotX = 40 * scaleFactor + randRot;

    const rebY = -95 * scaleFactor + randY * 0.8;
    const rebRotX = 35 * scaleFactor + randRot * 0.8;

    return [
      { transform: `translateY(${startY}px) rotateX(${startRotX}deg)`, easing: 'ease-out' },
      { transform: `translateY(${rebY}px) rotateX(${rebRotX}deg)`, offset: 0.15, easing: 'ease-in-out' },
      { transform: 'translateY(0px) rotateX(0deg)' }
    ];
  }

  if (stroke === 'V' || stroke === 'v') {
    const startY = 100 * scaleFactor + randY;
    const startRotX = -40 * scaleFactor + randRot;

    const rebY = 95 * scaleFactor + randY * 0.8;
    const rebRotX = -35 * scaleFactor + randRot * 0.8;

    return [
      { transform: `translateY(${startY}px) rotateX(${startRotX}deg)`, easing: 'ease-out' },
      { transform: `translateY(${rebY}px) rotateX(${rebRotX}deg)`, offset: 0.15, easing: 'ease-in-out' },
      { transform: 'translateY(0px) rotateX(0deg)' }
    ];
  }

  // Secouement / Vibré: B, b
  if (stroke === 'B' || stroke === 'b') {
    const ampX = 15 * scaleFactor;
    const ampRot = 5 * scaleFactor;

    return [
      { transform: 'translate(0, 0) rotate(0deg)', easing: 'ease-out' },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.1 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.2 },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.3 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.4 },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.5 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.6 },
      { transform: `translateX(${-ampX + randX}px) rotateZ(${-ampRot + randRot}deg)`, offset: 0.7 },
      { transform: `translateX(${ampX - randX}px) rotateZ(${ampRot - randRot}deg)`, offset: 0.8 },
      { transform: `translateX(${-ampX * 0.6 + randX * 0.5}px) rotateZ(${-ampRot * 0.6 + randRot * 0.5}deg)`, offset: 0.9 },
      { transform: 'translate(0, 0) rotate(0deg)' }
    ];
  }

  return [
    { transform: 'translate(0, 0)' }
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
  { opacity: 0, transform: 'scale(0.6)' },
  { opacity: 1, transform: 'scale(1.05)', offset: 0.3 },
  { opacity: 0, transform: 'scale(1.2)' }
];
