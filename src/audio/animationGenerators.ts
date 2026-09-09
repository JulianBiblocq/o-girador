// ============================================================================
// CONFIG_STICKS : Constantes biomécaniques des baguettes (POV Réaliste)
// ============================================================================
// Vue à la première personne (How-You-View) au-dessus de la Roda :
// - Le poignet est un pivot fixe en bas de l'écran (transform-origin: bottom center).
// - La baguette est un levier en perspective Z simulée par scale().
// - Toutes les amplitudes, angles et écartements sont modifiables ici pour un réglage fin.
// ============================================================================

export const CONFIG_STICKS = {
  // --------------------------------------------------------------------------
  // 1. ÉCARTEMENT HORIZONTAL (SPACING / AXE X)
  // --------------------------------------------------------------------------
  // Définit le décalage horizontal des points de visée par rapport au centre (targetX ± xOffset).
  // Plus la valeur est petite, plus les baguettes convergent vers le centre.
  spacing: {
    targetXOffsetDrum: 18,   // Caixa / Tarol : resserré vers le centre (précédemment 30px)
    targetXOffsetAlfaia: 48, // Alfaia : rapproché vers le centre (précédemment 85px)
    targetXOffsetTimbal: 30, // Timbal : mains nues (30px)
    handSeparationX: 4,      // Biais latéral moyen à la frappe (±4px)
    spreadX: 10,             // Dispersion aléatoire en X (±5px)
    spreadY: 10,             // Dispersion aléatoire en Y (±5px)
  },

  // --------------------------------------------------------------------------
  // 2. ORIENTATION ANGULAIRE DES MAINS (V-SHAPE / ROTATION Z)
  // --------------------------------------------------------------------------
  angles: {
    // Caixa / Tarol : V symétrique compact (validé par l'utilisateur)
    drum: {
      left: -3,   // Main gauche (-7°)
      right: 3,   // Main droite (+7°)
    },
    // Alfaia : V plus large et désaxé / asymétrique
    // - Bacalhau (main gauche par défaut) : ouvre plus largement sur le flanc (-16°)
    // - Maçaneta (main droite par défaut) : attaque plus directe vers le centre (+7°)
    alfaia: {
      bacalhau: -4, // Baguette fine / flanc (plus ouverte : -16°)
      macaneta: 4,   // Mailloche lourde (plus directe : +7°)
    },
    wristWhipAngle: 2.2, // Micro-torsion dynamique du poignet (degrés)
    rotJitter: 2.0,      // Micro-variation angulaire aléatoire à l'impact (±1°)
  },

  // Alias rétrocompatibles
  vShapeAngle: 7,
  wristWhipAngle: 2.2,
  humanize: {
    handSeparationX: 4,
    spreadX: 10,
    spreadY: 10,
    rotJitter: 2.0,
  },

  // --------------------------------------------------------------------------
  // 3. POSITION BASSE DE REPOS (au-dessus de la peau du tambour)
  // --------------------------------------------------------------------------
  rest: {
    translateY: -85,  // Position basse en accord avec l'impact (-105px fort / -95px faible)
    scale: 0.92,      // Échelle en perspective basse
  },

  // --------------------------------------------------------------------------
  // 4. COUP FORT (Majuscules : D, E, I)
  // --------------------------------------------------------------------------
  strong: {
    duration: 230,    // Durée totale du cycle de frappe (ms)
    windUp: {
      offset: 0.15,   // Fin de la montée à 15% du cycle
      translateY: 25, // Recul physique délié vers le joueur (accentue l'effet levier)
      scaleAlfaia: 1.35, // Effet de perspective Z puissant vers le visage (Alfaia à 92 BPM)
      scaleDrum: 1.22,   // Effet de perspective Z adapté (Caixa / Tarol)
      // Micro-respiration au sommet puis accélération fulgurante vers la peau
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,     // Impact net à 25% du cycle
      translateY: -105, // Point d'impact fort abaissé à -105px
      scale: 0.88,      // Rétrécissement d'éloignement en perspective Z
      // Installation après impact : sensation de masse en suspension progressive
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,     // Rebond contrôlé dès l'impact
      translateY: -85,  // Remontée vers la position de repos
      scale: 0.92,      // Retour à l'échelle de repos
      easing: 'linear', // Maintien stable sans effet ressort élastique
    },
  },

  // --------------------------------------------------------------------------
  // 5. COUP FAIBLE (Minuscules : d, e, i)
  // --------------------------------------------------------------------------
  weak: {
    duration: 160,    // Durée totale resserrée (ms)
    windUp: {
      offset: 0.15,
      translateY: -78,  // Armement minime (recul de 7px depuis le repos -85px)
      scaleAlfaia: 1.05,
      scaleDrum: 1.03,
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,
      translateY: -95,  // Frappe sèche faible calée à -95px
      scale: 0.90,
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,
      translateY: -85,  // Rebond vers la position de repos
      scale: 0.92,
      easing: 'linear',
    },
  },

  // --------------------------------------------------------------------------
  // 6. RUFADA / ROULÉ (R, r)
  // --------------------------------------------------------------------------
  rufada: {
    duration: 200,     // Durée totale du roulé (ms)
    baseY: -95,        // Confinée à hauteur du coup faible (-95px)
    baseScale: 0.90,   // Échelle confinée
    rotateZMax: 0.5,   // Balayage horizontal strictement bridé (< 0.5 deg)
    jitterY: 4,        // Amplitude des micro-rebonds verticaux (±4px)
    scaleVariation: 0.02, // Micro-variation d'échelle
  },

  // --------------------------------------------------------------------------
  // 7. BAGUETTES CROISÉES / CLIC (C, c)
  // --------------------------------------------------------------------------
  crossClick: {
    duration: 240,     // Durée totale du clic (ms)
    windUpY: 15,       // Montée en l'air au-dessus du tambour
    scaleAlfaia: 1.30,
    scaleDrum: 1.20,
    rotateZLeft: 4,   // Angle vers le centre (gauche)
    rotateZRight: -4, // Angle vers le centre (droite)
  },

  // --------------------------------------------------------------------------
  // 8. CERCLAGE / ARO (X, x)
  // --------------------------------------------------------------------------
  rimShot: {
    duration: 200,          // Durée totale du rim shot (ms)
    windUpY: 20,
    windUpScale: 1.25,
    impactTranslateY: -45,  // Rebord extérieur de la Roda
    impactScale: 0.95,
    rotateZLeft: -12,       // Déport extérieur pour la baguette gauche
    rotateZRight: 12,       // Déport extérieur pour la baguette droite
    reboundTranslateY: -65,
  },
};

// ============================================================================
// CONFIG_GONGUE : Constantes biomécaniques de la baguette de Gonguê (POV Réaliste)
// ============================================================================
// La baguette métallique frappe les deux cloches du Gonguê :
// - Cloche grave 'G', 'g' : visée haute
// - Cloche aiguë 'A', 'a' : visée basse
// - Rebond net et sec (frappe fer sur fer) sans élasticité molle
// - Perspective Z via scale() et levier de poignet (rotateX)
// ============================================================================
export const CONFIG_GONGUE = {
  // --------------------------------------------------------------------------
  // 1. PERSPECTIVE DU REGARD (Largeur de baguette selon la cloche jouée)
  // --------------------------------------------------------------------------
  perspective: {
    // Cloche basse (Aigu 'A', 'a') : proche du regard -> baguette plus grosse
    // (Conserve la belle présence qu'elle avait précédemment en haut)
    scaleXBas: 1.38,
    // Cloche haute (Grave 'G', 'g') : plus loin du regard -> s'affine un peu
    // (Écart subtil sans rétrécissement excessif)
    scaleXHaut: 0.86,
    // Position neutre / repos au centre
    scaleXCenter: 1.05,
  },

  // --------------------------------------------------------------------------
  // 2. POSITION DE REPOS (au-dessus de la cloche visée)
  // --------------------------------------------------------------------------
  rest: {
    translateY: 0,
    rotateX: 6,      // Légère inclinaison au repos
    scaleY: 0.98,
  },

  // --------------------------------------------------------------------------
  // 3. COUP FORT (G, A)
  // --------------------------------------------------------------------------
  strong: {
    duration: 220,    // Durée totale du cycle (ms)
    windUp: {
      offset: 0.15,   // Fin de l'armement à 15%
      translateY: 20, // Recul de préparation vers le joueur
      scaleBoost: 1.12, // Grossissement Z au sommet de l'élan
      rotateX: 12,    // Poignet armé
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,     // Impact net à 25%
      translateY: -50,  // Course d'impact contre la cloche (px)
      scaleBoost: 0.94, // Contact franc sur la cloche
      rotateX: 0,       // Contact direct sur la cloche
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,     // Rebond immédiat à 40%
      translateY: -15,  // Rebond contrôlé suspendu au-dessus de la cloche
      scaleBoost: 0.98,
      rotateX: 6,
      easing: 'linear',
    },
  },

  // --------------------------------------------------------------------------
  // 4. COUP FAIBLE (g, a, ou neutre)
  // --------------------------------------------------------------------------
  weak: {
    duration: 160,    // Durée totale (ms)
    windUp: {
      offset: 0.15,
      translateY: 8,
      scaleBoost: 1.04,
      rotateX: 8,
      easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
    },
    impact: {
      offset: 0.25,
      translateY: -22,
      scaleBoost: 0.96,
      rotateX: 0,
      easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
    },
    rebound: {
      offset: 0.40,
      translateY: -7,
      scaleBoost: 0.98,
      rotateX: 6,
      easing: 'linear',
    },
  },

  // --------------------------------------------------------------------------
  // 5. HUMANISATION (Micro-variations de frappe)
  // --------------------------------------------------------------------------
  humanize: {
    spreadX: 4,  // Maintenu selon la modification utilisateur (±2px)
    spreadY: 4,  // Maintenu selon la modification utilisateur (±2px)
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

export function getGongueDuration(stroke: string): number {
  const isStrong = ['G', 'A'].includes(stroke);
  return isStrong ? CONFIG_GONGUE.strong.duration : CONFIG_GONGUE.weak.duration;
}

// ============================================================================
// CONFIG_AGBE : Constantes biomécaniques de l'Agbê / Xequerê (POV Réaliste)
// ============================================================================
// Le cercle de graines se comporte comme une maille pendulaire suspendue au col
// de la calebasse : projection latérale en arc, arrêt sec, micro-choc d'inertie
// des graines, puis relâchement fluide vers le centre.
// ============================================================================
export const CONFIG_AGBE = {
  // --------------------------------------------------------------------------
  // 1. DIMENSIONS DU FILET DE GRAINES (Taille du cercle SVG)
  // --------------------------------------------------------------------------
  dimensions: {
    radius: 405,     // Rayon du cercle de graines (augmentez pour agrandir, ex: 365, 380, 390)
    amplitude: 30,  // Épaisseur de l'ondulation zig-zag des perles (px)
    beadRadius: 8,  // Rayon des perles individuelles (px)
  },

  // --------------------------------------------------------------------------
  // 2. PIVOT PENDULAIRE (Col de la calebasse en haut)
  // --------------------------------------------------------------------------
  transformOrigin: '50% 12%',

  // Mouvements latéraux forts (D / E)
  lateralStrong: {
    duration: 260, // ms
    translateX: 52, // px
    rotateZ: 16, // degrés d'inclinaison
    microJitterX: 4, // micro-choc d'inertie des graines
    microJitterZ: 2,
  },

  // Mouvements latéraux faibles (d / e)
  lateralWeak: {
    duration: 200,
    translateX: 24,
    rotateZ: 7,
    microJitterX: 2,
    microJitterZ: 1,
  },

  // Claqué / Frappe cul (S / V)
  impactBase: {
    duration: 220,
    translateY: -28,
    squashScaleX: 1.05,
    squashScaleY: 0.95,
  },

  // Frémissement continu / Barulho (B, b)
  shaking: {
    duration: 180,
    jitterX: 10,
    jitterZ: 4,
  },
};

export function getAgbeDuration(stroke: string): number {
  if (stroke === 'B' || stroke === 'b') return CONFIG_AGBE.shaking.duration;
  if (['S', 's', 'V', 'v'].includes(stroke)) return CONFIG_AGBE.impactBase.duration;
  if (['D', 'E'].includes(stroke)) return CONFIG_AGBE.lateralStrong.duration;
  return CONFIG_AGBE.lateralWeak.duration;
}

// ============================================================================
// CONFIG_MINEIRO : Constantes biomécaniques du Mineiro / Ganzá (POV Réaliste)
// ============================================================================
// Le Mineiro est un cylindre métallique tenu à deux mains horizontalement :
// - P / p (Haut / Poussée) : montée souple vers le haut/avant, perspective montante
//   (scale) et micro-bascule angulaire naturelle (+rotateZ).
// - T / t (Bas / Tirée) : descente souple vers le bas/arrière, micro-bascule inverse (-rotateZ).
// - L / l (Toque lateral) : impulsion dynamique sur le côté avec amorti fluide.
// - B / b (Barulho) : micro-secousses rapides à haute fréquence.
// - Cinématique resserrée : l'impact/extension max est atteint à 22% pour assurer
//   une réactivité parfaite sur les doubles croches rapides (> 100 BPM).
// ============================================================================
export type MineiroPole = 'frontStrong' | 'frontWeak' | 'backWeak' | 'backStrong';

export const CONFIG_MINEIRO = {
  // Pôle Fort Avant (projection ample - P)
  frontStrong: {
    y: -28,
    scale: 0.95,
    rotateZ: 2.2,
  },
  // Entre-deux Faible Avant (relâchement proche du centre - p)
  frontWeak: {
    y: -7,
    scale: 0.99,
    rotateZ: 0.6,
  },
  // Entre-deux Faible Arrière (relâchement proche du centre - t)
  backWeak: {
    y: 6,
    scale: 1.01,
    rotateZ: -0.6,
  },
  // Pôle Fort Arrière (projection ample - T)
  backStrong: {
    y: 24,
    scale: 1.05,
    rotateZ: -2.2,
  },

  // Déplacement latéral (L, l)
  lateralX: -32,

  // Durées (ms)
  durationTravelStrong: 160, // Trajet ample (P ou T)
  durationTravelWeak: 110,   // Retour doux vers l'entre-deux (p ou t)
  durationLateral: 150,
  durationBarulho: 110,

  // Easing souple et adouci
  easingTravel: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

export function getMineiroDuration(stroke: string): number {
  const norm = stroke === 'D' || stroke === 'F' ? 'P' :
    stroke === 'd' || stroke === 'f' ? 'p' :
      stroke === 'E' ? 'T' :
        stroke === 'e' ? 't' : stroke;

  if (norm === 'P' || norm === 'T') return CONFIG_MINEIRO.durationTravelStrong;
  if (norm === 'p' || norm === 't') return CONFIG_MINEIRO.durationTravelWeak;
  if (norm === 'L' || norm === 'l') return CONFIG_MINEIRO.durationLateral;
  if (norm === 'B' || norm === 'b') return CONFIG_MINEIRO.durationBarulho;
  return CONFIG_MINEIRO.durationTravelWeak;
}

export function getNextMineiroPole(stroke: string, currentPole: MineiroPole = 'backWeak'): MineiroPole {
  const norm = stroke === 'D' || stroke === 'F' ? 'P' :
    stroke === 'd' || stroke === 'f' ? 'p' :
      stroke === 'E' ? 'T' :
        stroke === 'e' ? 't' : stroke;

  if (norm === 'P') return 'frontStrong';
  if (norm === 'p') return 'frontWeak';
  if (norm === 'T') return 'backStrong';
  if (norm === 't') return 'backWeak';
  return currentPole;
}

// ============================================================================
// CONFIG_TIMBAL : Constantes biomécaniques du Timbal (POV Réaliste)
// ============================================================================
// Vue subjective à la première personne au-dessus de la peau du Timbal :
// - Les mains nues attaquent la peau depuis le bord inférieur (cerclage).
// - Les poignets convergent vers le centre avec un angle naturel en V (±10°).
// - Grave (G, g) : plongeon de la paume vers le centre (-230px), contact franc.
// - Slap (S, s) : fouet éclair (-80px) avec retrait immédiat (-60px) pour laisser vibrer la peau.
// - Aberto (A, a) : descente sèche des doigts sur le cerclage (+75px) puis dégagement (+55px).
// - Fantôme (D, d) : micro-effleurement quasi immobile (+4px) pour le groove.
// ============================================================================
export const CONFIG_TIMBAL = {
  // ==========================================================================
  // HAUTEUR & POSITIONNEMENT VERTICAL (RÉGLAGE DIRECT)
  // ==========================================================================
  // baseOffsetY : Abaisse (+) ou monte (-) l'ensemble des deux mains.
  // - Augmenter la valeur (ex: 550, 600) pour les DESCENDRE davantage.
  // - Diminuer la valeur (ex: 450, 400) pour les FAIRE MONTER.
  baseOffsetY: 320,

  // ==========================================================================
  // ÉCARTEMENT HORIZONTAL DES MAINS (RAPPROCHER / ÉCARTER)
  // ==========================================================================
  // handSpread : Écartement des poignets à la base en bas de l'écran (distance au milieu).
  // - Diminuer cette valeur (ex: 200, 240) pour RAPPROCHER les deux mains l'une de l'autre.
  // - Augmenter cette valeur (ex: 320, 400) pour les ÉCARTER vers les bords.
  handSpread: 600,

  // targetXOffset : Écartement des mains au niveau du cercle de frappe (centre).
  // - Diminuer (ex: 10, 20) pour que les doigts convergent très près du milieu.
  // - Augmenter (ex: 40, 60) pour qu'ils frappent plus écartés sur les côtés.
  targetXOffset: 370,

  // ==========================================================================
  // 3. TAILLE DES MAINS (ÉCHELLE GLOBALE)
  // ==========================================================================
  // handScale : Multiplicateur de taille des mains (1.0 = normal, 1.4 = +40%).
  // - Augmenter cette valeur (ex: 1.45, 1.6) pour des mains PLUS GRANDES.
  // - Diminuer cette valeur (ex: 1.2, 1.0) pour des mains PLUS PETITES.
  handScale: 1.5,

  // ==========================================================================
  // 4. ANGLE EN V DES MAINS (ORIENTATION VERS LE CENTRE)
  // ==========================================================================
  // vShapeAngle : Angle d'inclinaison des mains et doigts vers le centre (degrés).
  // - Augmenter (ex: 14, 18) pour refermer le V vers le centre de la peau.
  // - Diminuer (ex: 6, 8) pour ouvrir les mains plus droit.
  vShapeAngle: 15,

  // 1. Grave / Basse (G, g) : toute la paume au centre
  grave: {
    duration: 220,
    impactY: -230,
    scale: 0.94,
    reboundY: -210,
  },

  // 2. Slap / Claqué (S, s) : phalanges fouettées, retrait éclair
  slap: {
    duration: 190,
    windUpY: 15,
    windUpScale: 1.15,
    impactY: -80,
    impactScale: 0.96,
    reboundY: -60, // Retrait immédiat pour laisser sonner
  },

  // 3. Aberto / Tonique (A, a) : seuls les doigts tapent le cerclage
  aberto: {
    duration: 180,
    impactY: 75, // En bas, sur le bord
    scale: 1.0,
    reboundY: 55,
  },

  // 4. Coup Fantôme (D, d) : micro-effleurement quasi immobile
  ghost: {
    duration: 120,
    impactY: 10, // Bouge à peine depuis la position de repos
    reboundY: 0,
    jitterY: 4,  // Amplitude microscopique (max 4px)
  },

  // Position de repos par défaut (mains au-dessus du cerclage)
  rest: {
    y: 20,
    scale: 1.0,
  },
};

/**
 * Calcule la chaîne transform de repos pour le Timbal en intégrant baseOffsetY, handScale et vShapeAngle
 */
export function getTimbalRestTransform(isLeft: boolean): string {
  // Main gauche (+angle) pointe vers le centre, Main droite (-angle) pointe vers le centre
  const baseAngle = isLeft ? CONFIG_TIMBAL.vShapeAngle : -CONFIG_TIMBAL.vShapeAngle;
  const restY = CONFIG_TIMBAL.rest.y + CONFIG_TIMBAL.baseOffsetY;
  const totalScale = CONFIG_TIMBAL.rest.scale * CONFIG_TIMBAL.handScale;
  return `translate3d(0, ${restY}px, 0) scale(${totalScale}) rotateZ(${baseAngle}deg)`;
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
  bpm: number = 100,
  instType: 'alfaia' | 'drum' = 'alfaia',
  isLeftHanded: boolean = false
): Keyframe[] {
  // Calcul de l'angle de base naturel selon l'instrument et la tenue des mains :
  let baseAngle: number;
  if (instType === 'alfaia') {
    if (!isLeftHanded) {
      // Droitier : main gauche = Bacalhau (-16° flanc plus ouvert), main droite = Maçaneta (+7° directe)
      baseAngle = isLeft ? CONFIG_STICKS.angles.alfaia.bacalhau : CONFIG_STICKS.angles.alfaia.macaneta;
    } else {
      // Gaucher : main gauche = Maçaneta (-7° directe), main droite = Bacalhau (+16° flanc plus ouvert)
      baseAngle = isLeft ? -CONFIG_STICKS.angles.alfaia.macaneta : -CONFIG_STICKS.angles.alfaia.bacalhau;
    }
  } else {
    // Caixa / Tarol : V symétrique compact (-7° main gauche, +7° main droite)
    baseAngle = isLeft ? CONFIG_STICKS.angles.drum.left : CONFIG_STICKS.angles.drum.right;
  }

  // Micro-fouetté de poignet dynamique (brise la rigidité mécanique)
  // À l'armement (en haut) : la baguette s'ouvre légèrement vers l'extérieur
  const whipWindUpRot = isLeft
    ? baseAngle - CONFIG_STICKS.angles.wristWhipAngle
    : baseAngle + CONFIG_STICKS.angles.wristWhipAngle;
  // À l'impact : le poignet compense et referme la baguette vers le centre
  const whipImpactRot = isLeft
    ? baseAngle + CONFIG_STICKS.angles.wristWhipAngle
    : baseAngle - CONFIG_STICKS.angles.wristWhipAngle;

  // Zone de frappe naturelle réaliste (cluster bi-manuel) :
  // En percussion, chaque main a sa zone d'impact préférée légèrement décalée,
  // combinée à une dispersion aléatoire pour éviter l'effet "point laser".
  const handBiasX = isLeft ? -CONFIG_STICKS.spacing.handSeparationX : CONFIG_STICKS.spacing.handSeparationX;
  const deltaX = handBiasX + (Math.random() - 0.5) * CONFIG_STICKS.spacing.spreadX;
  const deltaY = (Math.random() - 0.5) * CONFIG_STICKS.spacing.spreadY;
  const jitterRot = (Math.random() - 0.5) * CONFIG_STICKS.angles.rotJitter;

  // Modulation de l'armement selon le tempo
  const tempoFactor = calculateTempoFactor(bpm);

  // Échelle d'armement différenciée selon l'instrument :
  // - Alfaia : mailloche imposante montant vers le visage (scale 1.35)
  // - Caixa / Tarol : baguette plus fine et geste plus resserré (scale 1.22)
  const baseStrongScale = instType === 'alfaia' ? CONFIG_STICKS.strong.windUp.scaleAlfaia : CONFIG_STICKS.strong.windUp.scaleDrum;
  const baseWeakScale = instType === 'alfaia' ? CONFIG_STICKS.weak.windUp.scaleAlfaia : CONFIG_STICKS.weak.windUp.scaleDrum;
  const baseClickScale = instType === 'alfaia' ? CONFIG_STICKS.crossClick.scaleAlfaia : CONFIG_STICKS.crossClick.scaleDrum;

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
        transform: `translate(${deltaX + (Math.random() - 0.5) * 4}px, ${baseY + deltaY + jitterY}px) rotateZ(${rZ1}deg) scale(${baseScale + scaleVariation})`,
        offset: 0.20,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX * 0.8 + (Math.random() - 0.5) * 4}px, ${baseY + deltaY - jitterY * 0.8}px) rotateZ(${rZ2}deg) scale(${baseScale - scaleVariation * 0.5})`,
        offset: 0.40,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX * 0.6 + (Math.random() - 0.5) * 4}px, ${baseY + deltaY + jitterY * 0.8}px) rotateZ(${rZ3}deg) scale(${baseScale + scaleVariation})`,
        offset: 0.60,
        easing: 'ease-in-out',
      },
      {
        transform: `translate(${deltaX * 0.3 + (Math.random() - 0.5) * 4}px, ${baseY + deltaY - jitterY * 0.5}px) rotateZ(${rZ4}deg) scale(${baseScale})`,
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
    const clickScale = 1 + (baseClickScale - 1) * tempoFactor;

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
        transform: `translate(0px, ${windUpY}px) rotateZ(${baseAngle + angleOffset * 0.5}deg) scale(${windUpScale})`,
        offset: 0.15,
        easing: 'cubic-bezier(0.45, 0, 0.9, 1)',
      },
      {
        transform: `translate(${deltaX}px, ${CONFIG_STICKS.rimShot.impactTranslateY + deltaY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${CONFIG_STICKS.rimShot.impactScale})`,
        offset: 0.25,
        easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)',
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
      { transform: `translate(${-8 + deltaX}px, ${CONFIG_STICKS.rest.translateY - 8 + deltaY}px) rotateZ(${baseAngle - 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})` },
    ];
  }

  // 5. Coup Fort (D, E, I, fla-strong) vs Coup Faible (d, e, i, fla-weak)
  const isStrong = ['D', 'E', 'I', 'F', 'fla-strong'].includes(stroke);

  if (isStrong) {
    const windUpScale = 1 + (baseStrongScale - 1) * tempoFactor;
    const windUpY = CONFIG_STICKS.strong.windUp.translateY * tempoFactor;

    return [
      {
        // 0% : Démarrage depuis la position basse de repos
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        easing: 'ease-out',
      },
      {
        // 15% : Élan vers le visage (l'olive grossit, ouverture souple vers l'extérieur)
        transform: `translate(0px, ${windUpY}px) rotateZ(${whipWindUpRot}deg) scale(${windUpScale})`,
        offset: CONFIG_STICKS.strong.windUp.offset,
        easing: CONFIG_STICKS.strong.windUp.easing,
      },
      {
        // 25% : Impact net au centre de la peau (fermeture de compensation vers le centre)
        transform: `translate(${deltaX}px, ${CONFIG_STICKS.strong.impact.translateY + deltaY}px) rotateZ(${whipImpactRot + jitterRot}deg) scale(${CONFIG_STICKS.strong.impact.scale})`,
        offset: CONFIG_STICKS.strong.impact.offset,
        easing: CONFIG_STICKS.strong.impact.easing,
      },
      {
        // 40% : Rebond contrôlé vers la position de repos avec amorti
        transform: `translate(0px, ${CONFIG_STICKS.strong.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.strong.rebound.scale})`,
        offset: CONFIG_STICKS.strong.rebound.offset,
        easing: CONFIG_STICKS.strong.rebound.easing,
      },
      {
        // 100% : Maintien en suspension stable au-dessus de la peau
        transform: `translate(0px, ${CONFIG_STICKS.strong.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.strong.rebound.scale})`,
      },
    ];
  } else {
    // Coup Faible
    const windUpScale = 1 + (baseWeakScale - 1) * tempoFactor;
    const windUpY = CONFIG_STICKS.rest.translateY + (CONFIG_STICKS.weak.windUp.translateY - CONFIG_STICKS.rest.translateY) * tempoFactor;

    return [
      {
        // 0% : Démarrage depuis la position basse
        transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`,
        easing: 'ease-out',
      },
      {
        // 15% : Armement minime
        transform: `translate(0px, ${windUpY}px) rotateZ(${whipWindUpRot * 0.7 + baseAngle * 0.3}deg) scale(${windUpScale})`,
        offset: CONFIG_STICKS.weak.windUp.offset,
        easing: CONFIG_STICKS.weak.windUp.easing,
      },
      {
        // 25% : Frappe sèche au même endroit central
        transform: `translate(${deltaX}px, ${CONFIG_STICKS.weak.impact.translateY + deltaY}px) rotateZ(${whipImpactRot * 0.7 + baseAngle * 0.3 + jitterRot}deg) scale(${CONFIG_STICKS.weak.impact.scale})`,
        offset: CONFIG_STICKS.weak.impact.offset,
        easing: CONFIG_STICKS.weak.impact.easing,
      },
      {
        // 40% : Rebond presque imperceptible vers le repos
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
export function generateAlfaiaKeyframes(
  stroke: string,
  isLeft: boolean,
  bpm: number = 100,
  isLeftHanded: boolean = false
): Keyframe[] {
  return buildStickKeyframes(stroke, isLeft, bpm, 'alfaia', isLeftHanded);
}

// Drum (Caixa/Tarol) Keyframes Generator
export function generateDrumKeyframes(
  stroke: string,
  isLeft: boolean,
  bpm: number = 100,
  isLeftHanded: boolean = false
): Keyframe[] {
  return buildStickKeyframes(stroke, isLeft, bpm, 'drum', isLeftHanded);
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

export function generateGongueKeyframes(stroke: string, bpm: number = 100): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isGrave = stroke === 'G' || stroke === 'g';
  const isAigu = stroke === 'A' || stroke === 'a';
  const isStrong = ['G', 'A'].includes(stroke);
  const cfg = isStrong ? CONFIG_GONGUE.strong : CONFIG_GONGUE.weak;
  const tempoFactor = calculateTempoFactor(bpm);

  // Inversion de la perspective demandée par l'utilisateur :
  // - Cloche basse (Aigu 'A', 'a', proche du regard) : baguette plus grosse (garder la présence)
  // - Cloche haute (Grave 'G', 'g', loin du regard) : s'affine un peu (écart subtil)
  const baseScaleX = isAigu
    ? CONFIG_GONGUE.perspective.scaleXBas
    : isGrave
      ? CONFIG_GONGUE.perspective.scaleXHaut
      : CONFIG_GONGUE.perspective.scaleXCenter;

  const baseScaleY = CONFIG_GONGUE.rest.scaleY;

  const randX = (Math.random() - 0.5) * CONFIG_GONGUE.humanize.spreadX;
  const randY = (Math.random() - 0.5) * CONFIG_GONGUE.humanize.spreadY;

  if (isVibrate) {
    const reposRotX = CONFIG_GONGUE.rest.rotateX;
    return [
      { transform: `translate(0px, 0px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, easing: 'ease-in-out' },
      { transform: `translate(${-4 + randX}px, ${-4 + randY}px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translate(${4 - randX}px, ${4 - randY}px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, offset: 0.50, easing: 'ease-in-out' },
      { transform: `translate(${-4 + randX}px, ${-4 + randY}px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, 0px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})` },
    ];
  }

  const windUpBoost = 1 + (cfg.windUp.scaleBoost - 1) * tempoFactor;
  const windUpY = cfg.windUp.translateY * tempoFactor;
  const impactBoost = cfg.impact.scaleBoost;
  const reboundBoost = cfg.rebound.scaleBoost;

  return [
    // 0% : Démarrage depuis la position basse de repos au-dessus de la cloche
    {
      transform: `translate(0px, ${CONFIG_GONGUE.rest.translateY}px) rotateX(${CONFIG_GONGUE.rest.rotateX}deg) scale(${baseScaleX}, ${baseScaleY})`,
      easing: 'ease-out',
    },
    // 15% : Armement souple (levier de poignet vers le joueur, l'olive grossit)
    {
      transform: `translate(0px, ${windUpY}px) rotateX(${cfg.windUp.rotateX}deg) scale(${baseScaleX * windUpBoost}, ${baseScaleY * windUpBoost})`,
      offset: cfg.windUp.offset,
      easing: cfg.windUp.easing,
    },
    // 25% : Impact sec fer sur fer contre la cloche (course plongeante)
    {
      transform: `translate(${randX}px, ${cfg.impact.translateY + randY}px) rotateX(${cfg.impact.rotateX}deg) scale(${baseScaleX * impactBoost}, ${baseScaleY * impactBoost})`,
      offset: cfg.impact.offset,
      easing: cfg.impact.easing,
    },
    // 40% : Rebond contrôlé suspendu au-dessus de la cloche
    {
      transform: `translate(0px, ${cfg.rebound.translateY}px) rotateX(${cfg.rebound.rotateX}deg) scale(${baseScaleX * reboundBoost}, ${baseScaleY * reboundBoost})`,
      offset: cfg.rebound.offset,
      easing: cfg.rebound.easing,
    },
    // 100% : Retour stable au repos
    {
      transform: `translate(0px, ${CONFIG_GONGUE.rest.translateY}px) rotateX(${CONFIG_GONGUE.rest.rotateX}deg) scale(${baseScaleX}, ${baseScaleY})`,
    },
  ];
}

export function generateMineiroKeyframes(stroke: string, currentPole: MineiroPole = 'backWeak'): Keyframe[] {
  const norm = stroke === 'D' || stroke === 'F' ? 'P' :
    stroke === 'd' || stroke === 'f' ? 'p' :
      stroke === 'E' ? 'T' :
        stroke === 'e' ? 't' : stroke;

  const ease = CONFIG_MINEIRO.easingTravel;

  const getPosTransform = (p: MineiroPole) => {
    const cfg = CONFIG_MINEIRO[p];
    return `translate3d(0, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(${cfg.rotateZ}deg)`;
  };

  const fromPos = getPosTransform(currentPole);

  switch (norm) {
    // 1. Poussé Fort (P) : grand voyage vers l'avant fort
    case 'P': {
      const toPos = getPosTransform('frontStrong');
      if (currentPole === 'frontStrong') {
        // Déjà en avant fort : surcourse d'accentuation
        return [
          { transform: fromPos },
          { transform: `translate3d(0, ${CONFIG_MINEIRO.frontStrong.y - 4}px, 0) scale(${CONFIG_MINEIRO.frontStrong.scale * 0.98}) rotateZ(${CONFIG_MINEIRO.frontStrong.rotateZ + 0.5}deg)`, offset: 0.35, easing: 'ease-out' },
          { transform: toPos }
        ];
      }
      return [
        { transform: fromPos, easing: ease },
        { transform: toPos }
      ];
    }

    // 2. Poussé Faible (p) : relâchement vers l'entre-deux avant
    case 'p': {
      const toPos = getPosTransform('frontWeak');
      return [
        { transform: fromPos, easing: ease },
        { transform: toPos }
      ];
    }

    // 3. Tiré Fort (T) : grand voyage vers l'arrière fort
    case 'T': {
      const toPos = getPosTransform('backStrong');
      if (currentPole === 'backStrong') {
        return [
          { transform: fromPos },
          { transform: `translate3d(0, ${CONFIG_MINEIRO.backStrong.y + 4}px, 0) scale(${CONFIG_MINEIRO.backStrong.scale * 1.02}) rotateZ(${CONFIG_MINEIRO.backStrong.rotateZ - 0.5}deg)`, offset: 0.35, easing: 'ease-out' },
          { transform: toPos }
        ];
      }
      return [
        { transform: fromPos, easing: ease },
        { transform: toPos }
      ];
    }

    // 4. Tiré Faible (t) : relâchement vers l'entre-deux arrière
    case 't': {
      const toPos = getPosTransform('backWeak');
      return [
        { transform: fromPos, easing: ease },
        { transform: toPos }
      ];
    }

    // 5. Coup latéral (L, l) : impulsion de côté et retour à la position courante
    case 'L':
    case 'l': {
      const cfg = CONFIG_MINEIRO[currentPole];
      return [
        { transform: fromPos },
        { transform: `translate3d(${CONFIG_MINEIRO.lateralX}px, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(-3deg)`, offset: 0.4, easing: 'ease-out' },
        { transform: fromPos }
      ];
    }

    // 6. Barulho (B, b) : vibration rapide sur place à la position courante
    case 'B':
    case 'b': {
      const cfg = CONFIG_MINEIRO[currentPole];
      return [
        { transform: `translate3d(-4px, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(${cfg.rotateZ}deg)` },
        { transform: `translate3d(4px, ${cfg.y}px, 0) scale(${cfg.scale}) rotateZ(${cfg.rotateZ}deg)`, offset: 0.5 },
        { transform: fromPos }
      ];
    }

    // Fallback vers l'entre-deux faible avant
    default:
      return [
        { transform: fromPos, easing: ease },
        { transform: getPosTransform('frontWeak') }
      ];
  }
}

export function generateAgbeKeyframes(stroke: string, bpm: number = 100): Keyframe[] {
  const isVibrate = stroke === 'B' || stroke === 'b';
  const isVertical = ['S', 's', 'V', 'v'].includes(stroke);
  const isStrongLateral = ['D', 'E'].includes(stroke);

  // 1. Frémissement continu / Barulho (B, b)
  if (isVibrate) {
    const { jitterX, jitterZ } = CONFIG_AGBE.shaking;
    return [
      { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)', easing: 'ease-in-out' },
      { transform: `translate(${-jitterX}px, 0px) rotateZ(${-jitterZ}deg) scale(0.99, 1.01)`, offset: 0.2, easing: 'ease-in-out' },
      { transform: `translate(${jitterX}px, 0px) rotateZ(${jitterZ}deg) scale(1.01, 0.99)`, offset: 0.4, easing: 'ease-in-out' },
      { transform: `translate(${-jitterX * 0.6}px, 0px) rotateZ(${-jitterZ * 0.6}deg) scale(0.99, 1.01)`, offset: 0.6, easing: 'ease-in-out' },
      { transform: `translate(${jitterX * 0.6}px, 0px) rotateZ(${jitterZ * 0.6}deg) scale(1.01, 0.99)`, offset: 0.8, easing: 'ease-in-out' },
      { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)' },
    ];
  }

  // 2. Coups Verticaux / Claqué / Frappe cul (S, V, s, v)
  if (isVertical) {
    const isStrongVert = stroke === 'S' || stroke === 'V';
    const mult = isStrongVert ? 1 : 0.6;
    const ty = CONFIG_AGBE.impactBase.translateY * mult;
    const squashX = 1 + (CONFIG_AGBE.impactBase.squashScaleX - 1) * mult;
    const squashY = 1 + (CONFIG_AGBE.impactBase.squashScaleY - 1) * mult;

    return [
      {
        transform: 'translate(0px, 0px) scale(1, 1)',
        easing: 'cubic-bezier(0.2, 0, 0.35, 1)',
      },
      {
        transform: `translate(0px, ${ty}px) scale(${squashX}, ${squashY})`,
        offset: 0.18,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      {
        transform: 'translate(0px, 0px) scale(1, 1)',
      },
    ];
  }

  // 3. Coups Latéraux (Droite D/d vs Gauche E/e)
  const isRight = stroke === 'D' || stroke === 'd';
  const cfg = isStrongLateral ? CONFIG_AGBE.lateralStrong : CONFIG_AGBE.lateralWeak;
  const dir = isRight ? 1 : -1;

  const tx = cfg.translateX * dir;
  const rz = cfg.rotateZ * dir;
  const microX = (cfg.microJitterX || 4) * dir;
  const microZ = (cfg.microJitterZ || 2) * dir;

  return [
    // 0% (Tick) : Départ position centrale de repos
    {
      transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)',
      easing: 'cubic-bezier(0.2, 0, 0.35, 1)',
    },
    // 18% (Impact / Extension max)
    {
      transform: `translate(${tx}px, 0px) rotateZ(${rz}deg) scale(1, 1)`,
      offset: 0.18,
      easing: 'linear',
    },
    // 28% (Choc d'inertie de la maille / clac des graines)
    {
      transform: `translate(${tx - microX}px, 0px) rotateZ(${rz - microZ}deg) scale(1, 1)`,
      offset: 0.28,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
    // 100% (Relâchement fluide)
    {
      transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)',
    },
  ];
}

export function generateTimbalKeyframes(stroke: string, isLeft: boolean): { keyframes: Keyframe[]; duration: number } {
  // Main gauche (+angle) pointe vers la droite/centre, Main droite (-angle) pointe vers la gauche/centre
  const baseAngle = isLeft ? CONFIG_TIMBAL.vShapeAngle : -CONFIG_TIMBAL.vShapeAngle;
  const offset = CONFIG_TIMBAL.baseOffsetY;
  const restY = CONFIG_TIMBAL.rest.y + offset;
  const scaleMult = CONFIG_TIMBAL.handScale;
  const restScale = CONFIG_TIMBAL.rest.scale * scaleMult;
  const restTransform = `translate3d(0, ${restY}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`;

  const isVibrate = stroke === 'b' || stroke === 'B';

  if (isVibrate) {
    return {
      duration: 100,
      keyframes: [
        { transform: restTransform, easing: 'ease-in-out' },
        { transform: `translate3d(-4px, ${restY - 3}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translate3d(4px, ${restY + 3}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translate3d(-4px, ${restY - 2}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  // 1. Grave / Basse (G, g) : plongeon franc de la paume vers le centre sans rebond élastique
  if (stroke === 'G' || stroke === 'g') {
    const graveScale = CONFIG_TIMBAL.grave.scale * scaleMult;
    return {
      duration: CONFIG_TIMBAL.grave.duration,
      keyframes: [
        { transform: restTransform, easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.grave.impactY + offset}px, 0) scale(${graveScale}) rotateZ(${baseAngle}deg)`, offset: 0.24, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.grave.reboundY + offset}px, 0) scale(${graveScale}) rotateZ(${baseAngle}deg)`, offset: 0.45, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  // 2. Slap / Claqué (S, s) : élan court arrière, impact fouetté et retrait éclair pour laisser sonner
  if (stroke === 'S' || stroke === 's') {
    const slapWindScale = CONFIG_TIMBAL.slap.windUpScale * scaleMult;
    const slapImpactScale = CONFIG_TIMBAL.slap.impactScale * scaleMult;
    return {
      duration: CONFIG_TIMBAL.slap.duration,
      keyframes: [
        { transform: restTransform, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.slap.windUpY + offset}px, 0) scale(${slapWindScale}) rotateZ(${baseAngle}deg)`, offset: 0.12, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.slap.impactY + offset}px, 0) scale(${slapImpactScale}) rotateZ(${baseAngle}deg)`, offset: 0.22, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.slap.reboundY + offset}px, 0) scale(${0.98 * scaleMult}) rotateZ(${baseAngle}deg)`, offset: 0.32, easing: 'ease-out' },
        { transform: restTransform },
      ],
    };
  }

  // 3. Aberto / Tonique (A, a) : descente sèche des doigts sur le cerclage inférieur
  if (stroke === 'A' || stroke === 'a') {
    const abertoScale = CONFIG_TIMBAL.aberto.scale * scaleMult;
    return {
      duration: CONFIG_TIMBAL.aberto.duration,
      keyframes: [
        { transform: restTransform, easing: 'cubic-bezier(0.4, 0, 0.9, 1)' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.impactY + offset}px, 0) scale(${abertoScale}) rotateZ(${baseAngle}deg)`, offset: 0.20, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.reboundY + offset}px, 0) scale(${abertoScale}) rotateZ(${baseAngle}deg)`, offset: 0.38, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  // 4. Coup Fantôme / Dedilhado (D, d) : micro-effleurement quasi immobile (+4px)
  if (stroke === 'D' || stroke === 'd') {
    return {
      duration: CONFIG_TIMBAL.ghost.duration,
      keyframes: [
        { transform: restTransform, easing: 'ease-in-out' },
        { transform: `translate3d(0, ${restY + CONFIG_TIMBAL.ghost.jitterY}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.35, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  // 5. Preso / Pressé (P, p) : étouffé contre la peau
  if (stroke === 'P' || stroke === 'p') {
    return {
      duration: 200,
      keyframes: [
        { transform: restTransform, easing: 'cubic-bezier(0.4, 0, 0.9, 1)' },
        { transform: `translate3d(0, ${-60 + offset}px, 0) scale(${0.97 * scaleMult}) rotateZ(${baseAngle}deg)`, offset: 0.22, easing: 'ease-out' },
        { transform: `translate3d(0, ${-55 + offset}px, 0) scale(${0.98 * scaleMult}) rotateZ(${baseAngle}deg)`, offset: 0.50, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  // Fallback vers Aberto
  const defScale = CONFIG_TIMBAL.aberto.scale * scaleMult;
  return {
    duration: CONFIG_TIMBAL.aberto.duration,
    keyframes: [
      { transform: restTransform, easing: 'cubic-bezier(0.4, 0, 0.9, 1)' },
      { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.impactY + offset}px, 0) scale(${defScale}) rotateZ(${baseAngle}deg)`, offset: 0.20, easing: 'ease-out' },
      { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.reboundY + offset}px, 0) scale(${defScale}) rotateZ(${baseAngle}deg)`, offset: 0.38, easing: 'ease-in-out' },
      { transform: restTransform },
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
