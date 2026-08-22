import { useRef, useCallback } from 'react';

// ============================================================================
// TABLEAU DE BORD - VARIABLES DE PHYSIQUE DE LA BAGUETTE (À AJUSTER)
// Modifiez ces valeurs à chaud pour tester le rendu de l'animation.
// ============================================================================
const PHYSICS = {
  // Phase 1 : Élan (Wind-up) - La baguette se lève et se rapproche
  windUpScale: 1.25,
  windUpDuration: 80, // ms

  // Phase 2 : Impact - Frappe sur la peau (0% du tick audio)
  impactScale: 0.85,
  impactTranslateY: -40, // px (plonge dans la profondeur vers la peau)
  impactRotateX: 50,     // deg (effet de plongée 3D en perspective)
  impactDuration: 20,    // ms (très court = très brutal)

  // Phase 3 : Rebond & Repos - Retour à la normale
  reboundDuration: 150,  // ms

  // Micro-humanisation - Randomisation à l'impact (Balanço)
  randomXRange: 10,       // px (+/- de décalage horizontal)
  randomYRange: 8        // px (+/- de décalage vertical additionnel)
};
// ============================================================================

export function BaguettePOV() {
  const baguetteRef = useRef<HTMLDivElement>(null);

  // Conformité Red Line #1 : Zero Render Thrashing (pas de useState)
  // Conformité Red Line #3 : Priorité GPU (utilisation exclusive de WAAPI avec transform)
  const hit = useCallback(() => {
    const el = baguetteRef.current;
    if (!el) return;

    // Calcul de la micro-humanisation (bruit aléatoire de balanço)
    const randomX = (Math.random() * 2 - 1) * PHYSICS.randomXRange;
    const randomY = (Math.random() * 2 - 1) * PHYSICS.randomYRange;

    const totalDuration = PHYSICS.windUpDuration + PHYSICS.impactDuration + PHYSICS.reboundDuration;

    // L'API Web Animations permet de définir l'easing de départ POUR CHAQUE intervalle
    el.animate([
      // 0. Départ -> Vers Sommet de l'élan
      {
        transform: 'translate3d(0px, 0px, 0px) scale(1) rotateX(0deg)',
        easing: 'ease-out' // L'élan ralentit en arrivant à son sommet
      },
      // 1. Sommet de l'élan -> Vers Impact
      {
        transform: `translate3d(0px, 0px, 0px) scale(${PHYSICS.windUpScale}) rotateX(0deg)`,
        offset: PHYSICS.windUpDuration / totalDuration,
        // L'easing DOIT être brutal : cubic-bezier très agressif vers la fin
        easing: 'cubic-bezier(0.8, 0, 1, 1)'
      },
      // 2. Impact sur la peau -> Vers Rebond/Repos
      {
        transform: `translate3d(${randomX}px, ${PHYSICS.impactTranslateY + randomY}px, 0px) scale(${PHYSICS.impactScale}) rotateX(${PHYSICS.impactRotateX}deg)`,
        offset: (PHYSICS.windUpDuration + PHYSICS.impactDuration) / totalDuration,
        easing: 'ease-out' // Le rebond part vite puis freine en l'air pour se stabiliser
      },
      // 3. Retour au repos (fin)
      {
        transform: 'translate3d(0px, 0px, 0px) scale(1) rotateX(0deg)'
      }
    ], {
      duration: totalDuration,
      fill: 'forwards'
    });

  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end', // Aligné en bas pour ancrer la baguette
        height: '400px',
        width: '100%',
        border: '1px solid #333',
        backgroundColor: '#111',
        position: 'relative',
        perspective: '800px', // Indispensable pour que rotateX donne un effet 3D POV
        overflow: 'hidden'
      }}
    >
      {/* Bouton de test (Vanilla JS event, pas de state lié au render React) */}
      <button
        onClick={hit}
        style={{
          position: 'absolute',
          top: '20px',
          padding: '10px 20px',
          cursor: 'pointer',
          zIndex: 10,
          background: '#444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}
      >
        TEST HIT
      </button>

      {/* 
        Élément Baguette Visuelle 
        Conformité Red Line #2 : Zero Layout Thrashing (dimensions fixes, pas de lectures)
      */}
      <div
        ref={baguetteRef}
        style={{
          width: '24px',
          height: '280px',
          // Design grossier pour simuler l'olive en haut et le corps
          background: 'linear-gradient(to bottom, #d4a373 0%, #faedcd 15%, #d4a373 100%)',
          borderRadius: '12px 12px 4px 4px',
          // CRUCIAL : Le pivot visuel à la base de la baguette
          transformOrigin: 'bottom center',
          boxShadow: '4px 4px 10px rgba(0,0,0,0.6)',
          marginBottom: '20px', // Décoller un peu du bord inférieur
          // Position de départ garantie
          transform: 'translate3d(0, 0, 0) scale(1) rotateX(0deg)',
          willChange: 'transform' // Optimisation GPU prioritaire
        }}
      />
    </div>
  );
}
