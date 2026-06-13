/**
 * app.js
 * Script d'application pour le prototype de navigation.
 * Simule le chargement des pistes de Maracatu, gère le drag-and-drop des blocs
 * avec snapping, et synchronise les contrôles de la barre d'outils.
 */

// Données fictives réalistes de BaqueMix (Rythmes de Maracatu)
const tracksData = [
  {
    name: 'Gongue',
    subtitle: 'Cloche de fer (Clave)',
    blocks: [
      { id: 'b1', time: 0, duration: 4, title: 'Toque de Ouro (Base)', color: '#3b82f6' },
      { id: 'b2', time: 4, duration: 4, title: 'Toque de Ouro (Base)', color: '#3b82f6' },
      { id: 'b3', time: 10, duration: 2, title: 'Arrasto (Transition)', color: '#2ecc71' },
      { id: 'b4', time: 12, duration: 4, title: 'Toque Rapide', color: '#3b82f6' }
    ]
  },
  {
    name: 'Alfaia (Marcador)',
    subtitle: 'Tambour Grave (Basique)',
    blocks: [
      { id: 'b5', time: 0, duration: 4, title: 'Intro Marcador', color: '#f19066' },
      { id: 'b6', time: 4, duration: 4, title: 'Baque Luanda', color: '#f19066' },
      { id: 'b7', time: 8, duration: 2, title: 'Corte (Coupure)', color: '#e74c3c' },
      { id: 'b8', time: 10, duration: 2, title: 'Redobre Solo', color: '#f1c40f' },
      { id: 'b9', time: 12, duration: 4, title: 'Baque Luanda Rapide', color: '#f19066' }
    ]
  },
  {
    name: 'Tarol',
    subtitle: 'Caisse Claire (Syncope)',
    blocks: [
      { id: 'b10', time: 0, duration: 4, title: 'Levada Standard', color: '#9b59b6' },
      { id: 'b11', time: 4, duration: 4, title: 'Levada Standard', color: '#9b59b6' },
      { id: 'b12', time: 8, duration: 2, title: 'Corte Tarol', color: '#e74c3c' },
      { id: 'b13', time: 10, duration: 2, title: 'Dobrado Solo', color: '#2ecc71' },
      { id: 'b14', time: 12, duration: 4, title: 'Levada Accélérée', color: '#9b59b6' }
    ]
  },
  {
    name: 'Agogô de 2 Bocas',
    subtitle: 'Cloches en fer alternées',
    blocks: [
      { id: 'b15', time: 4, duration: 4, title: 'Ligne Trad Baque Luanda', color: '#2ecc71' },
      { id: 'b16', time: 12, duration: 4, title: 'Ligne Trad Rapide', color: '#2ecc71' }
    ]
  }
];

let navManager = null;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  // Sélection des éléments du DOM
  const viewport = document.getElementById('sequencerViewport');
  const timeline = document.getElementById('sequencerTimeline');
  const minimapContainer = document.getElementById('minimapContainer');
  const minimapSlider = document.getElementById('minimapViewportSlider');
  const markerRuler = document.getElementById('markerRuler');
  const snapGuide = document.getElementById('snapGuide');

  // 1. Initialiser le NavigationManager
  navManager = new NavigationManager({
    viewport,
    timeline,
    minimapContainer,
    minimapSlider,
    markerRuler,
    snapGuide,
    measureWidthBase: 320,
    totalMeasures: 16,
    beatsPerMeasure: 4,
    initialMarkers: [
      { id: 'm1', time: 0, label: 'Intro (Toque de Ouro)', color: '#f19066' },
      { id: 'm2', time: 4, label: 'Baque Luanda', color: '#9b59b6' },
      { id: 'm3', time: 8, label: 'Virada / Corte', color: '#e74c3c' },
      { id: 'm4', time: 12, label: 'Final Groovy', color: '#2ecc71' }
    ],
    // Callback quand les marqueurs sont mis à jour
    onMarkersChanged: (updatedMarkers) => {
      console.log('Nouveau tableau de marqueurs :', updatedMarkers);
    }
  });

  // 2. Générer les pistes dans le DOM
  createTrackRows();

  // 3. Dessiner les blocs du séquenceur et la mini-carte
  renderSequencerBlocks();
  navManager.renderMinimapPreview(tracksData);

  // 4. Configurer les écouteurs de la barre d'outils
  setupToolbarControls();
});

/**
 * Crée dynamiquement les conteneurs de pistes (Headers et Grille).
 */
function createTrackRows() {
  const headersContainer = document.getElementById('sequencerHeadersList');
  const rowsContainer = document.getElementById('trackRowsList');
  
  headersContainer.innerHTML = '';
  rowsContainer.innerHTML = '';

  tracksData.forEach(track => {
    // Création du Header de la piste
    const headerEl = document.createElement('div');
    headerEl.className = 'track-header';
    headerEl.innerHTML = `
      <div class="track-name">${track.name}</div>
      <div class="track-subtitle">${track.subtitle}</div>
    `;
    headersContainer.appendChild(headerEl);

    // Création de la ligne de piste
    const rowEl = document.createElement('div');
    rowEl.className = 'track-row';
    rowsContainer.appendChild(rowEl);
  });
}

/**
 * Redessine tous les blocs de patterns sur les pistes en appliquant le zoom.
 */
function renderSequencerBlocks() {
  const measureW = navManager.getMeasureWidth();
  const rows = document.querySelectorAll('.track-row');
  
  // Vider les blocs existants
  rows.forEach(row => {
    const existingBlocks = row.querySelectorAll('.sequencer-block');
    existingBlocks.forEach(b => b.remove());
  });

  // Dessiner chaque bloc
  tracksData.forEach((track, trackIdx) => {
    const rowEl = rows[trackIdx];
    if (!rowEl) return;

    track.blocks.forEach(block => {
      const blockEl = document.createElement('div');
      blockEl.className = 'sequencer-block';
      blockEl.style.backgroundColor = block.color;
      blockEl.style.borderColor = block.color;

      // Position et largeur physiques en fonction du zoom
      const posX = block.time * measureW;
      const widthX = block.duration * measureW;

      blockEl.style.left = `${posX}px`;
      blockEl.style.width = `${widthX}px`;

      blockEl.innerHTML = `
        <div class="block-title">${block.title}</div>
        <div class="block-duration">${block.duration} ${block.duration > 1 ? 'mesures' : 'mesure'}</div>
      `;

      // Configurer le drag-and-drop avec magnétisme
      setupBlockDragging(blockEl, block, trackIdx);
      
      rowEl.appendChild(blockEl);
    });
  });
}

/**
 * Implémente le glisser-déposer sur un bloc de la grille avec Smart Snapping.
 */
function setupBlockDragging(blockEl, blockData, trackIdx) {
  let isDragging = false;
  let startX = 0;
  let startLeft = 0;
  let currentSnappedX = 0;

  blockEl.addEventListener('pointerdown', (e) => {
    // Si le mode Panning (touche espace ou outil main) est actif, ne pas drag les blocs
    if (navManager.isPanningActive || navManager.isSpacePressed) return;
    if (e.button !== 0) return; // Clic gauche uniquement

    isDragging = true;
    blockEl.setPointerCapture(e.pointerId);
    
    startX = e.clientX;
    startLeft = parseFloat(blockEl.style.left) || 0;
    currentSnappedX = startLeft;

    blockEl.style.transition = 'none'; // Pas de transition CSS pendant le glissement
    e.stopPropagation();
  });

  blockEl.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const proposedX = startLeft + dx;

    // Récupérer la coordonnée magnétisée à partir du NavigationManager
    const snapResult = navManager.getSnappedX(proposedX);

    // Bornes de la timeline
    const measureW = navManager.getMeasureWidth();
    const blockWidth = parseFloat(blockEl.style.width);
    const maxPosX = navManager.totalMeasures * measureW - blockWidth;
    let targetX = Math.max(0, Math.min(maxPosX, snapResult.x));

    // Déplacer visuellement le bloc
    blockEl.style.left = `${targetX}px`;
    currentSnappedX = targetX;

    // Afficher ou masquer la ligne guide jaune magnétique
    if (snapResult.guideVisible) {
      navManager.showSnapGuide(targetX);
    } else {
      navManager.hideSnapGuide();
    }
  });

  const handlePointerUp = (e) => {
    if (isDragging) {
      isDragging = false;
      blockEl.releasePointerCapture(e.pointerId);
      
      // Cacher la ligne guide
      navManager.hideSnapGuide();
      blockEl.style.transition = 'left 0.1s ease-out'; // Rétablir une transition douce

      // Mettre à jour la structure de données
      const measureW = navManager.getMeasureWidth();
      blockData.time = currentSnappedX / measureW;

      // Nettoyer et mettre à jour la mini-carte
      renderSequencerBlocks();
      navManager.renderMinimapPreview(tracksData);
    }
  };

  blockEl.addEventListener('pointerup', handlePointerUp);
  blockEl.addEventListener('pointercancel', handlePointerUp);
}

/**
 * Configure les boutons et sélecteurs de la barre d'outils.
 */
function setupToolbarControls() {
  // 1. Bouton Outil Main (Panning)
  const panToolBtn = document.getElementById('panToolBtn');
  const cursorToolBtn = document.getElementById('cursorToolBtn');

  cursorToolBtn.addEventListener('click', () => {
    cursorToolBtn.classList.add('active');
    panToolBtn.classList.remove('active');
    navManager.setPanningActive(false);
  });

  panToolBtn.addEventListener('click', () => {
    panToolBtn.classList.add('active');
    cursorToolBtn.classList.remove('active');
    navManager.setPanningActive(true);
  });

  // 2. Boutons de Zoom
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomValText = document.getElementById('zoomVal');

  const updateZoomDisplay = () => {
    zoomValText.textContent = `${Math.round(navManager.zoomLevel * 100)}%`;
  };

  zoomInBtn.addEventListener('click', () => {
    navManager.setZoom(navManager.zoomLevel + 0.15);
    renderSequencerBlocks();
    updateZoomDisplay();
  });

  zoomOutBtn.addEventListener('click', () => {
    navManager.setZoom(navManager.zoomLevel - 0.15);
    renderSequencerBlocks();
    updateZoomDisplay();
  });

  // 3. Sélecteur de Snapping
  const snapSelect = document.getElementById('snapSelect');
  snapSelect.addEventListener('change', (e) => {
    navManager.setSnapMode(e.target.value);
  });
}
