// ============================================================================
// CONFIG_STICKS : Constantes biomécaniques des baguettes (POV Réaliste)
// ============================================================================
// Vue à la première personne (How-You-View) au-dessus de la Roda :
// - Le poignet est un pivot fixe en bas de l'écran (transform-origin: bottom center).
// - La baguette est un levier en perspective Z simulée par scale().
// - Toutes les amplitudes et durées sont ajustables ici pour un réglage fin.
// ============================================================================

export const CONFIG_STICKS = {
  // --------------------------------------------------------------------------
  // 1. ANGLE NATUREL DES POIGNETS (V-SHAPE)
  // --------------------------------------------------------------------------
  vShapeAngle: 12, // Main gauche: -12°, Main droite: +12°

  // --------------------------------------------------------------------------
  // 2. POSITION BASSE DE REPOS (au-dessus de la peau du tambour)
  // --------------------------------------------------------------------------
  rest: {
    translateY: -225, // Position basse en attente au-dessus de la peau (px)
    scale: 0.92,       // Échelle en perspective basse
  },

  // --------------------------------------------------------------------------
  // 3. COUP FORT (Majuscules : D, E, I)
  // --------------------------------------------------------------------------
  strong: {
    duration: 220,    // Durée totale du cycle de frappe (ms)
    windUp: {
      offset: 0.15,   // Fin de la montée à 15% du cycle
      translateY: 15, // Recul neutre vers le joueur sans glisser vers le centre (px)
      scale: 1.22,    // Grossissement fort de l'olive vers le visage du joueur
      // Règle d'or WAAPI : l'easing déclaré ici régit la transition VERS l'impact (15% -> 25%)
      easing: 'cubic-bezier(0.8, 0, 1, 1)', // Accélération fulgurante
    },
    impact: {
      offset: 0.25,     // Impact net à 25% du cycle
      translateY: -240, // Plongée de l'olive au centre de la peau (px)
      scale: 0.88,      // Rétrécissement d'éloignement en perspective Z
      easing: 'ease-out', // Réaction immédiate d'amorti vers le rebond
    },
    rebound: {
      offset: 0.40,     // Rebond rapide dès l'impact
      translateY: -225, // Remontée immédiate de 15px (de -240 à -225px)
      scale: 0.92,       // Retour à l'échelle de repos
      easing: 'linear',  // Maintien stable sans effet ressort élastique
    },
  },

  // --------------------------------------------------------------------------
  // 4. COUP FAIBLE (Minuscules : d, e, i)
  // --------------------------------------------------------------------------
  weak: {
    duration: 160,    // Durée totale resserrée (ms)
    windUp: {
      offset: 0.15,
      translateY: -215, // Armement minime (léger retrait de 10px depuis le repos)
      scale: 1.03,     // Grossissement subtil
      easing: 'cubic-bezier(0.8, 0, 1, 1)', // Descente vive
    },
    impact: {
      offset: 0.25,
      translateY: -235, // Frappe sèche au même centre de peau (px)
      scale: 0.90,
      easing: 'ease-out',
    },
    rebound: {
      offset: 0.40,
      translateY: -225, // Rebond presque imperceptible (environ 3 à 5px)
      scale: 0.92,
      easing: 'linear',
    },
  },

  // --------------------------------------------------------------------------
  // 5. RUFADA / ROULÉ (R, r)
  // --------------------------------------------------------------------------
  rufada: {
    duration: 200,     // Durée totale du roulé (ms)
    baseY: -235,       // Confinée au centre de la peau à hauteur du coup faible
    baseScale: 0.90,   // Échelle confinée
    rotateZMax: 0.4,   // Balayage horizontal strictement bridé (< 0.5 deg)
    jitterY: 5,        // Amplitude des micro-rebonds verticaux (±5px)
    scaleVariation: 0.02, // Micro-variation d'échelle
  },

  // --------------------------------------------------------------------------
  // 6. BAGUETTES CROISÉES / CLIC (C, c)
  // --------------------------------------------------------------------------
  crossClick: {
    duration: 240,     // Durée totale du clic (ms)
    windUpY: 10,       // Montée en l'air au-dessus du tambour
    scale: 1.20,       // Échelle haute vers le visage
    rotateZLeft: 18,   // Angle vers le centre (gauche)
    rotateZRight: -18, // Angle vers le centre (droite)
  },

  // --------------------------------------------------------------------------
  // 7. CERCLAGE / ARO (X, x)
  // --------------------------------------------------------------------------
  rimShot: {
    duration: 200,          // Durée totale du rim shot (ms)
    windUpY: 15,
    windUpScale: 1.20,
    impactTranslateY: -140, // Rebord extérieur de la Roda (nettement plus bas)
    impactScale: 0.95,
    rotateZLeft: -14,       // Déport extérieur pour la baguette gauche
    rotateZRight: 14,       // Déport extérieur pour la baguette droite
    reboundTranslateY: -160,
  },

  // --------------------------------------------------------------------------
  // 8. CIBLAGE & HUMANISATION (Micro-variations aléatoires du batteur)
  // --------------------------------------------------------------------------
  humanize: {
    deltaX: 8, // (Math.random() - 0.5) * 8 => ±4px
    deltaY: 6, // (Math.random() - 0.5) * 6 => ±3px
  },
};

// ============================================================================
// CALCUL BIOMÉCANIQUE DU FACTEUR DE TEMPO (BPM)
// ============================================================================
// En percussion :
// - Tempo lent : armement ample (geste généreux)
// - Tempo rapide : armement compact et économe (vélocité maximale)
export function calculateTempoFactor(bpm: number = 100): number {
  const safeBpm = Math.max(30, bpm || 100);
  return Math.max(0.75, Math.min(1.25, Math.sqrt(100 / safeBpm)));
}

// Durée globale selon le type de frappe
export function getStickDuration(stroke: string): number {
  if (stroke === 'R' || stroke === 'r') return CONFIG_STICKS.rufada.duration;
  if (stroke === 'C' || stroke === 'c') return CONFIG_STICKS.crossClick.duration;
  if (stroke === 'X' || stroke === 'x') return CONFIG_STICKS.rimShot.duration;
  if (['D', 'E', 'I', 'F', 'fla-strong'].includes(stroke)) return CONFIG_STICKS.strong.duration;
  return CONFIG_STICKS.weak.duration;
}

// Helper functions for random micro-variations (Humanisation / "balanço")
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomSign = () => (Math.random() > 0.5 ? 1 : -1);

// ============================================================================
// GÉNÉRATEURS DE KEYFRAMES POUR BAGUETTES (ALFAIA, CAIXA, TAROL)
// ============================================================================

/**
 * Générateur universel biomécanique pour les baguettes
 */
function buildStickKeyframes(
  stroke: string,
  isLeft: boolean,
  bpm: number = 100
): Keyframe[] {
  // Base V-Shape de repos : main gauche -12°, main droite +12°
  const baseAngle = isLeft ? -CONFIG_STICKS.vShapeAngle : CONFIG_STICKS.vShapeAngle;

  // Ciblage & Humanisation aléatoire
  const deltaX = (Math.random() - 0.5) * CONFIG_STICKS.humanize.deltaX; // ±4px
  const deltaY = (Math.random() - 0.5) * CONFIG_STICKS.humanize.deltaY; // ±3px
  const jitterRot = (Math.random() - 0.5) * 1.5; // micro-rotation de frappe ±0.75°

  // Modulation de l'armement selon le tempo
  const tempoFactor = calculateTempoFactor(bpm);

  // 1. Roulé / Rufada (R, r)
  if (stroke === 'R' || stroke === 'r') {
    const { baseY, baseScale, rotateZMax, jitterY, scaleVariation } = CONFIG_STICKS.rufada;
    const rZ1 = baseAngle + (Math.random() - 0.5) * rotateZMax;
    const rZ2 = baseAngle + (Math.random() - 0.5) * rotateZMax;
    const rZ3 = baseAngle + (Math.random() - 0.5) * rotateZMax;
    const rZ4 = baseAngle + (Math.random() - 0.5) * rotateZMax;

    return [
      {
        transform: `translate(${deltaX}px, ${baseY + deltaY}px) rotateZ(${baseAngle}deg) scale(${baseScale})`,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX}px, ${baseY + deltaY + jitterY}px) rotateZ(${rZ1}deg) scale(${baseScale + scaleVariation})`,
        offset: 0.20,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX * 0.8}px, ${baseY + deltaY - jitterY * 0.8}px) rotateZ(${rZ2}deg) scale(${baseScale - scaleVariation * 0.5})`,
        offset: 0.40,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX * 0.6}px, ${baseY + deltaY + jitterY * 0.8}px) rotateZ(${rZ3}deg) scale(${baseScale + scaleVariation})`,
        offset: 0.60,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX * 0.3}px, ${baseY + deltaY - jitterY * 0.5}px) rotateZ(${rZ4}deg) scale(${baseScale})`,
        offset: 0.80,
        easing: 'ease-out',
      },
      {
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
      },
    ];
  }

  // 2. Baguettes Croisées / Clic (C, c)
  if (stroke === 'C' || stroke === 'c') {
    const angleOffset = isLeft ? CONFIG_STICKS.crossClick.rotateZLeft : CONFIG_STICKS.crossClick.rotateZRight;
    const clickY = CONFIG_STICKS.crossClick.windUpY * tempoFactor;
    const clickScale = 1 + (CONFIG_STICKS.crossClick.scale - 1) * tempoFactor;

    return [
      {
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        easing: 'ease-out',
      },
      {
        transform: `translate(0px, ${clickY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${clickScale})`,
        offset: 0.35,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(0px, ${clickY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${clickScale})`,
        offset: 0.65,
        easing: 'ease-out',
      },
      {
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
      },
    ];
  }

  // 3. Cerclage / Aro / Rim shot (X, x)
  if (stroke === 'X' || stroke === 'x') {
    const angleOffset = isLeft ? CONFIG_STICKS.rimShot.rotateZLeft : CONFIG_STICKS.rimShot.rotateZRight;
    const windUpY = CONFIG_STICKS.rimShot.windUpY * tempoFactor;
    const windUpScale = 1 + (CONFIG_STICKS.rimShot.windUpScale - 1) * tempoFactor;

    return [
      {
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        easing: 'ease-out',
      },
      {
        // Règle d'or WAAPI : easing cubic-bezier ici pour la plongée vers le bord
        transform: `translate(0px, ${windUpY}px) rotateZ(${baseAngle + angleOffset * 0.5}deg) scale(${windUpScale})`,
        offset: 0.15,
        easing: 'cubic-bezier(0.8, 0, 1, 1)',
      },
      {
        transform: `translate(${deltaX}px, ${CONFIG_STICKS.rimShot.impactTranslateY + deltaY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${CONFIG_STICKS.rimShot.impactScale})`,
        offset: 0.25,
        easing: 'ease-out',
      },
      {
        transform: `translate(0px, ${CONFIG_STICKS.rimShot.reboundTranslateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        offset: 0.40,
        easing: 'linear',
      },
      {
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
      },
    ];
  }

  // 4. Vibration / Tremblement (b, B)
  if (stroke === 'b' || stroke === 'B') {
    return [
      { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, easing: 'ease-in-out' },
      { transform: `translate(${-8 + deltaX}px, ${CONFIG_STICKS.rest.translateY - 8 + deltaY}px) rotateZ(${baseAngle - 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translate(${8 - deltaX}px, ${CONFIG_STICKS.rest.translateY + 8 - deltaY}px) rotateZ(${baseAngle + 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.50, easing: 'ease-in-out' },
      { transform: `translate(${-8 + deltaX}px, ${CONFIG_STICKS.rest.translateY + 8 - deltaY}px) rotateZ(${baseAngle - 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})` },
    ];
  }

  // 5. Coup Fort (D, E, I, fla-strong) vs Coup Faible (d, e, i, fla-weak)
  const isStrong = ['D', 'E', 'I', 'F', 'fla-strong'].includes(stroke);

  if (isStrong) {
    const windUpScale = 1 + (CONFIG_STICKS.strong.windUp.scale - 1) * tempoFactor;
    const windUpY = CONFIG_STICKS.strong.windUp.translateY * tempoFactor;

    return [
      {
        // 0% : Démarrage depuis la position basse de repos
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        easing: 'ease-out',
      },
      {
        // 15% : Élan vers le visage (l'olive grossit fortement)
        // RÈGLE D'OR WAAPI : l'easing cubic-bezier régit la descente VERS le keyframe d'impact (offset: 0.25)
        transform: `translate(0px, ${windUpY}px) rotateZ(${baseAngle}deg) scale(${windUpScale})`,
        offset: CONFIG_STICKS.strong.windUp.offset,
        easing: CONFIG_STICKS.strong.windUp.easing,
      },
      {
        // 25% : Impact net au centre de la peau avec humanisation
        transform: `translate(${deltaX}px, ${CONFIG_STICKS.strong.impact.translateY + deltaY}px) rotateZ(${baseAngle + jitterRot}deg) scale(${CONFIG_STICKS.strong.impact.scale})`,
        offset: CONFIG_STICKS.strong.impact.offset,
        easing: CONFIG_STICKS.strong.impact.easing,
      },
      {
        // 40% : Rebond contrôlé immédiat (+15px)
        transform: `translate(0px, ${CONFIG_STICKS.strong.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.strong.rebound.scale})`,
        offset: CONFIG_STICKS.strong.rebound.offset,
        easing: CONFIG_STICKS.strong.rebound.easing,
      },
      {
        // 100% : Reste calée en position basse de repos en attente du coup suivant
        transform: `translate(0px, ${CONFIG_STICKS.strong.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.strong.rebound.scale})`,
      },
    ];
  } else {
    // Coup Faible
    const windUpScale = 1 + (CONFIG_STICKS.weak.windUp.scale - 1) * tempoFactor;
    const windUpY = CONFIG_STICKS.rest.translateY + (CONFIG_STICKS.weak.windUp.translateY - CONFIG_STICKS.rest.translateY) * tempoFactor;

    return [
      {
        // 0% : Démarrage depuis la position basse
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        easing: 'ease-out',
      },
      {
        // 15% : Armement minime
        transform: `translate(0px, ${windUpY}px) rotateZ(${baseAngle}deg) scale(${windUpScale})`,
        offset: CONFIG_STICKS.weak.windUp.offset,
        easing: CONFIG_STICKS.weak.windUp.easing,
      },
      {
        // 25% : Frappe sèche au même endroit central
        transform: `translate(${deltaX}px, ${CONFIG_STICKS.weak.impact.translateY + deltaY}px) rotateZ(${baseAngle + jitterRot}deg) scale(${CONFIG_STICKS.weak.impact.scale})`,
        offset: CONFIG_STICKS.weak.impact.offset,
        easing: CONFIG_STICKS.weak.impact.easing,
      },
      {
        // 40% : Rebond presque imperceptible (3 à 5px)
        transform: `translate(0px, ${CONFIG_STICKS.weak.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.weak.rebound.scale})`,
        offset: CONFIG_STICKS.weak.rebound.offset,
        easing: CONFIG_STICKS.weak.rebound.easing,
      },
      {
        // 100% : Stabilisation
        transform: `translate(0px, ${CONFIG_STICKS.weak.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.weak.rebound.scale})`,
      },
    ];
  }
}

// Alfaia Animation Keyframes Generator
export function generateAlfaiaKeyframes(stroke: string, isLeft: boolean, bpm: number = 100): Keyframe[] {
  return buildStickKeyframes(stroke, isLeft, bpm);
}

// Drum (Caixa/Tarol) Keyframes Generator
export function generateDrumKeyframes(stroke: string, isLeft: boolean, bpm: number = 100): Keyframe[] {
  return buildStickKeyframes(stroke, isLeft, bpm);
}

// ============================================================================
// ANCIENNES STRUCTURES DE PHYSIQUE (Maintenues pour compatibilité descendante)
// ============================================================================

export const PHYSICS_ALFAIA = {
  strong: {
    windUpScale: 1.22,
    windUpDuration: 33,
    impactScale: 0.88,
    impactTranslateY: -240,
    impactRotateX: 0,
    impactDuration: 22,
    reboundDuration: 165,
  },
  weak: {
    windUpScale: 1.03,
    windUpDuration: 24,
    impactScale: 0.90,
    impactTranslateY: -235,
    impactRotateX: 0,
    impactDuration: 16,
    reboundDuration: 120,
  },
  randomXRange: 8,
  randomYRange: 6,
};

export const PHYSICS_DRUM = {
  strong: {
    windUpScale: 1.22,
    windUpDuration: 33,
    impactScale: 0.88,
    impactTranslateY: -240,
    impactRotateX: 0,
    impactDuration: 22,
    reboundDuration: 165,
  },
  weak: {
    windUpScale: 1.03,
    windUpDuration: 24,
    impactScale: 0.90,
    impactTranslateY: -235,
    impactRotateX: 0,
    impactDuration: 16,
    reboundDuration: 120,
  },
  randomXRange: 8,
  randomYRange: 6,
};

export function getTotalDuration(physicsBlock: any, isStrong: boolean): number {
  const p = isStrong ? physicsBlock.strong : physicsBlock.weak;
  return (p.windUpDuration || 33) + (p.impactDuration || 22) + (p.reboundDuration || 165);
}

// ============================================================================
// GONGUÊ, MINEIRO, AGBÊ, TIMBAL (Préservés intégralement)
// ============================================================================

export const PHYSICS_GONGUE = {
  strong: {
    windUpDuration: 60,
    impactTranslateY: -50,
    impactDuration: 20,
    reboundDuration: 220,
  },
  weak: {
    windUpDuration: 50,
    impactTranslateY: -20,
    impactDuration: 15,
    reboundDuration: 185,
  },
  randomXRange: 5,
  randomYRange: 5,
};

export const PHYSICS_MINEIRO = {
  strong: {
    windUpDuration: 50,
    impactTranslateY: -20,
    impactDuration: 20,
    reboundDuration: 230,
  },
  weak: {
    windUpDuration: 40,
    impactTranslateY: -10,
    impactDuration: 15,
    reboundDuration: 195,
  },
  randomXRange: 3,
  randomYRange: 3,
};

export const PHYSICS_AGBE = {
  strong: {
    windUpDuration: 70,
    impactTranslateX: 130,
    impactDuration: 30,
    reboundDuration: 250,
  },
  weak: {
    windUpDuration: 60,
    impactTranslateX: 80,
    impactDuration: 25,
    reboundDuration: 215,
  },
  randomXRange: 5,
  randomYRange: 5,
};

export const PHYSICS_TIMBAL = {
  strong: {
    windUpScale: 1.12,
    windUpDuration: 90,
    impactScale: 0.98,
    impactTranslateY: 100,
    impactRotateX: 15,
    impactDuration: 25,
    reboundDuration: 235,
  },
  weak: {
    windUpScale: 1.06,
    windUpDuration: 70,
    impactScale: 0.99,
    impactTranslateY: 60,
    impactRotateX: 5,
    impactDuration: 20,
    reboundDuration: 210,
  },
  randomXRange: 8,
  randomYRange: 8,
};

export function generateGongueKeyframes(stroke: string): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isStrong = ['G', 'A'].includes(stroke);
  const p = isStrong ? PHYSICS_GONGUE.strong : PHYSICS_GONGUE.weak;

  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(1, PHYSICS_GONGUE.randomXRange);
  const randY = randomSign() * randomRange(1, PHYSICS_GONGUE.randomYRange);
  const reposRotX = isStrong ? 4 : 8;

  if (isVibrate) {
    return [
      { transform: `translateY(0px) rotateX(${reposRotX}deg)`, easing: 'ease-in-out' },
      { transform: `translateX(${-10 + randX}px) translateY(${-10 + randY}px)`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translateX(${10 - randX}px) translateY(${10 - randY}px)`, offset: 0.5, easing: 'ease-in-out' },
      { transform: `translateX(${-10 + randX}px) translateY(${10 - randY}px)`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translateY(0px) rotateX(${reposRotX}deg)` },
    ];
  }

  const windUpY = 15;

  return [
    { transform: `translateY(0px) rotateX(${reposRotX}deg)`, easing: 'ease-out' },
    { transform: `translateY(${windUpY}px) rotateX(${reposRotX + 5}deg)`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
    { transform: `translate(${randX}px, ${p.impactTranslateY + randY}px) rotateX(0deg)`, offset: t2, easing: 'ease-out' },
    { transform: `translateY(0px) rotateX(${reposRotX}deg)` },
  ];
}

export function generateMineiroKeyframes(stroke: string): Keyframe[] {
  const normalizedStroke = (stroke === 'F' || stroke === 'f') ? 'D' : stroke;
  const isStrong = ['D', 'P', 'T', 'L', 'B'].includes(normalizedStroke);
  const p = isStrong ? PHYSICS_MINEIRO.strong : PHYSICS_MINEIRO.weak;

  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randOffset = randomSign() * randomRange(1, PHYSICS_MINEIRO.randomYRange);

  if (normalizedStroke === 'P' || normalizedStroke === 'D') {
    return [
      { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
      { transform: 'translateY(10px) scale(1.02)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translateY(${p.impactTranslateY + randOffset}px) scale(0.95)`, offset: t2, easing: 'ease-out' },
      { transform: 'translateY(0px) scale(1)' },
    ];
  } else if (stroke === 'p') {
    return [
      { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
      { transform: 'translateY(5px) scale(1.01)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translateY(${p.impactTranslateY + randOffset}px) scale(0.98)`, offset: t2, easing: 'ease-out' },
      { transform: 'translateY(0px) scale(1)' },
    ];
  } else if (stroke === 'T') {
    return [
      { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
      { transform: 'translateY(-10px) scale(0.98)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translateY(${-p.impactTranslateY + randOffset}px) scale(1.05)`, offset: t2, easing: 'ease-out' },
      { transform: 'translateY(0px) scale(1)' },
    ];
  } else if (stroke === 't') {
    return [
      { transform: 'translateY(0px) scale(1)', easing: 'ease-out' },
      { transform: 'translateY(-5px) scale(0.99)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translateY(${-p.impactTranslateY + randOffset}px) scale(1.02)`, offset: t2, easing: 'ease-out' },
      { transform: 'translateY(0px) scale(1)' },
    ];
  } else if (stroke === 'L' || stroke === 'l') {
    return [
      { transform: `translate(${-200 + randOffset}px, 0)`, easing: 'ease-in-out' },
      { transform: 'translate(0, 0)' },
    ];
  } else if (stroke === 'B' || stroke === 'b') {
    return [
      { transform: 'translate(0, 0)', easing: 'ease-in-out' },
      { transform: `translate(${-15 + randOffset}px, 0)`, offset: 0.25 },
      { transform: `translate(${15 - randOffset}px, 0)`, offset: 0.75 },
      { transform: 'translate(0, 0)' },
    ];
  }

  return [{ transform: 'translate(0, 0)' }];
}

export function generateAgbeKeyframes(stroke: string): Keyframe[] {
  const isStrong = ['D', 'E', 'S', 'V', 'B'].includes(stroke);
  const p = isStrong ? PHYSICS_AGBE.strong : PHYSICS_AGBE.weak;

  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(1, PHYSICS_AGBE.randomXRange);
  const randY = randomSign() * randomRange(1, PHYSICS_AGBE.randomYRange);

  if (stroke === 'D' || stroke === 'd') {
    return [
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', easing: 'ease-out' },
      { transform: 'translateX(-20px) translateY(5px) rotateZ(-5deg)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translateX(${p.impactTranslateX + randX}px) translateY(${-20 + randY}px) rotateZ(25deg)`, offset: t2, easing: 'ease-out' },
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)' },
    ];
  }

  if (stroke === 'E' || stroke === 'e') {
    return [
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)', easing: 'ease-out' },
      { transform: 'translateX(20px) translateY(5px) rotateZ(5deg)', offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translateX(${-p.impactTranslateX + randX}px) translateY(${-20 + randY}px) rotateZ(-25deg)`, offset: t2, easing: 'ease-out' },
      { transform: 'translateX(0px) translateY(0px) rotateZ(0deg)' },
    ];
  }

  return [{ transform: 'translate(0, 0)' }];
}

export function generateTimbalKeyframes(stroke: string, _isLeft: boolean): { keyframes: Keyframe[]; duration: number } {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isStrong = ['G', 'A', 'S', 'D', 'P'].includes(stroke);
  const p = isStrong ? PHYSICS_TIMBAL.strong : PHYSICS_TIMBAL.weak;

  const totalDuration = p.windUpDuration + p.impactDuration + p.reboundDuration;
  const t1 = p.windUpDuration / totalDuration;
  const t2 = (p.windUpDuration + p.impactDuration) / totalDuration;

  const randX = randomSign() * randomRange(2, PHYSICS_TIMBAL.randomXRange);
  const randY = randomSign() * randomRange(2, PHYSICS_TIMBAL.randomYRange);

  if (isVibrate) {
    return {
      duration: 100,
      keyframes: [
        { transform: 'translate(0px, 0px) rotateX(0deg) scale(1)', easing: 'ease-in-out' },
        { transform: `translateX(${-10 + randY * 0.2}px) translateY(${-10 + randY * 0.2}px) scale(1)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translateX(${10 - randY * 0.2}px) translateY(${10 - randY * 0.2}px) scale(1)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translateX(${-10 + randY * 0.2}px) translateY(${10 - randY * 0.2}px) scale(1)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: 'translate(0px, 0px) rotateX(0deg) scale(1)' },
      ],
    };
  }

  let targetY = p.impactTranslateY + randY;
  let targetRotX = p.impactRotateX;

  if (stroke === 'G' || stroke === 'g') {
    targetY = -250;
    targetRotX = -5;
  } else if (stroke === 'A' || stroke === 'a') {
    targetY = 500;
    targetRotX = 15;
  }

  const windUpY = -40;

  return {
    duration: totalDuration,
    keyframes: [
      { transform: 'translate(0px, 0px) rotateX(0deg) scale(1)', easing: 'ease-out' },
      { transform: `translate(0px, ${windUpY}px) rotateX(-5deg) scale(${p.windUpScale})`, offset: t1, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
      { transform: `translate(${randX}px, ${targetY}px) rotateX(${targetRotX}deg) scale(${p.impactScale})`, offset: t2, easing: 'ease-out' },
      { transform: 'translate(0px, 0px) rotateX(0deg) scale(1)' },
    ],
  };
}

// ============================================================================
// FLASH / HALO / STATIC EFFECTS
// ============================================================================

export const KEYFRAMES_HALO = [
  { opacity: 0.8, transform: 'translate(-50%, -50%) scale(0.6)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
];

export const KEYFRAMES_FLASH_STRONG: Keyframe[] = [
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
];

export const KEYFRAMES_FLASH_WEAK: Keyframe[] = [
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(0.8)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' },
];

export const KEYFRAMES_FLASH_VIBRATE: Keyframe[] = [
  { opacity: 0.5, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.2 },
  { opacity: 0.4, transform: 'translate(-50%, -50%) scale(1.05)', offset: 0.4 },
  { opacity: 0.1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.6 },
  { opacity: 0.3, transform: 'translate(-50%, -50%) scale(1.02)', offset: 0.8 },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(1.2)' },
];

export const KEYFRAMES_TIMBAL_G: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_A: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_S: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_S_WEAK: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_D: Keyframe[] = [];
export const KEYFRAMES_TIMBAL_P: Keyframe[] = [];

export const KEYFRAMES_AGBE_STRETCH_Y_STRONG = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.15)', offset: 0.3 },
  { transform: 'scaleY(1)' },
];
export const KEYFRAMES_AGBE_STRETCH_Y_WEAK = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.08)', offset: 0.3 },
  { transform: 'scaleY(1)' },
];
export const KEYFRAMES_AGBE_STRETCH_X_STRONG = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.15)', offset: 0.3 },
  { transform: 'scaleX(1)' },
];
export const KEYFRAMES_AGBE_STRETCH_X_WEAK = [
  { transform: 'scaleX(1)' },
  { transform: 'scaleX(1.08)', offset: 0.3 },
  { transform: 'scaleX(1)' },
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
  { transform: 'translate(0, 0) scale(1)' },
];
