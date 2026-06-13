/**
 * NavigationManager.js
 * Module de navigation global et moderne pour séquenceur web (BaqueMix).
 * Gère le défilement Clic-Glissé (Panning), la Mini-Map interactive, 
 * les Marqueurs de Section, et la Grille de Snapping magnétique.
 */

class NavigationManager {
  /**
   * @param {Object} config - Configuration du manager
   * @param {HTMLElement} config.viewport - Conteneur défilable principal (div scrollable)
   * @param {HTMLElement} config.timeline - Conteneur interne de la timeline (contenu total)
   * @param {HTMLElement} config.minimapContainer - Élément conteneur de la mini-carte
   * @param {HTMLElement} config.minimapSlider - Rectangle représentant la zone visible (viewport) sur la mini-carte
   * @param {HTMLElement} config.markerRuler - Règle supérieure contenant les marqueurs de section
   * @param {HTMLElement} config.snapGuide - Guide d'alignement vertical temporaire
   * @param {number} [config.measureWidthBase=320] - Largeur de base d'une mesure en pixels
   * @param {number} [config.totalMeasures=16] - Nombre total de mesures
   * @param {number} [config.beatsPerMeasure=4] - Nombre de temps par mesure
   * @param {Array} [config.initialMarkers=[]] - Marqueurs initiaux
   * @param {Function} [config.onMarkersChanged] - Callback appelé lors de l'ajout/modification/suppression de marqueurs
   */
  constructor(config) {
    this.viewport = config.viewport;
    this.timeline = config.timeline;
    this.minimapContainer = config.minimapContainer;
    this.minimapSlider = config.minimapSlider;
    this.markerRuler = config.markerRuler;
    this.snapGuide = config.snapGuide;

    // Dimensions et métriques
    this.measureWidthBase = config.measureWidthBase || 320;
    this.zoomLevel = 1.0;
    this.totalMeasures = config.totalMeasures || 16;
    this.beatsPerMeasure = config.beatsPerMeasure || 4;

    // Configuration des marqueurs
    this.markers = config.initialMarkers || [
      { id: 'm-1', time: 0, label: 'Intro', color: '#f19066' },
      { id: 'm-2', time: 4, label: 'Abianado', color: '#9b59b6' },
      { id: 'm-3', time: 10, label: 'Virada', color: '#e74c3c' }
    ];
    this.onMarkersChanged = config.onMarkersChanged || null;

    // Alignement (Snapping)
    this.snapMode = 'measure'; // 'measure' (mesure), 'beat' (temps), 'none' (libre)

    // État du Panning
    this.isPanningActive = false; // Activé par bouton
    this.isSpacePressed = false;   // Activé par touche Espace
    this.isPanningDragging = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.panStartScrollLeft = 0;
    this.panStartScrollTop = 0;
    this.panPointerId = null;

    // État du glissement de la Mini-Map
    this.isMinimapDragging = false;
    this.minimapPointerId = null;

    // Références de fonctions pour le nettoyage des événements clavier
    this._keydownHandler = this._handleKeyDown.bind(this);
    this._keyupHandler = this._handleKeyUp.bind(this);

    this.init();
  }

  /**
   * Initialise le manager, dessine l'interface et configure les écouteurs d'événements.
   */
  init() {
    // Événements Clavier (Touche Espace pour le Panning)
    window.addEventListener('keydown', this._keydownHandler);
    window.addEventListener('keyup', this._keyupHandler);

    // Événements sur le Viewport de la Timeline (Panning & Scroll)
    this.viewport.addEventListener('pointerdown', this._handleViewportPointerDown.bind(this));
    this.viewport.addEventListener('pointermove', this._handleViewportPointerMove.bind(this));
    this.viewport.addEventListener('pointerup', this._handleViewportPointerUp.bind(this));
    this.viewport.addEventListener('pointercancel', this._handleViewportPointerUp.bind(this));
    this.viewport.addEventListener('scroll', this._handleViewportScroll.bind(this));

    // Événements sur la Mini-Map
    this.minimapContainer.addEventListener('pointerdown', this._handleMinimapPointerDown.bind(this));
    this.minimapContainer.addEventListener('pointermove', this._handleMinimapPointerMove.bind(this));
    this.minimapContainer.addEventListener('pointerup', this._handleMinimapPointerUp.bind(this));
    this.minimapContainer.addEventListener('pointercancel', this._handleMinimapPointerUp.bind(this));

    // Événement Double-Clic pour ajouter un marqueur de section
    this.markerRuler.addEventListener('dblclick', this._handleMarkerRulerDblClick.bind(this));

    // Ajustement de la mini-carte en cas de redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
      this.updateMinimapViewport();
      this.renderMinimapGridLines();
    });

    // Premier rendu complet
    this.updateLayout();
  }

  /**
   * Supprime tous les écouteurs d'événements (pour un nettoyage propre).
   */
  destroy() {
    window.removeEventListener('keydown', this._keydownHandler);
    window.removeEventListener('keyup', this._keyupHandler);
  }

  /**
   * Renvoie la largeur actuelle d'une mesure en tenant compte du zoom.
   * @returns {number}
   */
  getMeasureWidth() {
    return this.measureWidthBase * this.zoomLevel;
  }

  /**
   * Met à jour le niveau de zoom.
   * @param {number} newZoomLevel
   */
  setZoom(newZoomLevel) {
    // Borner le zoom entre 0.3 et 3.0
    const oldZoom = this.zoomLevel;
    this.zoomLevel = Math.max(0.3, Math.min(3.0, newZoomLevel));
    
    // Garder le centre du scroll cohérent après zoom
    const centerPercent = (this.viewport.scrollLeft + this.viewport.clientWidth / 2) / (this.totalMeasures * (this.measureWidthBase * oldZoom));
    
    this.updateLayout();
    
    // Repositionner le scroll
    const newTotalWidth = this.totalMeasures * this.getMeasureWidth();
    this.viewport.scrollLeft = centerPercent * newTotalWidth - this.viewport.clientWidth / 2;
  }

  /**
   * Change le mode d'alignement magnétique (Snapping).
   * @param {'measure'|'beat'|'none'} mode
   */
  setSnapMode(mode) {
    if (['measure', 'beat', 'none'].includes(mode)) {
      this.snapMode = mode;
    }
  }

  /**
   * Active ou désactive le mode Panning (outil main libre).
   * @param {boolean} active
   */
  setPanningActive(active) {
    this.isPanningActive = active;
    this._updatePanningCursor();
  }

  /**
   * Recalcule et applique le style lié aux dimensions de la timeline, 
   * puis regénère la grille, les règles, les marqueurs et la mini-carte.
   */
  updateLayout() {
    const measureW = this.getMeasureWidth();
    
    // Définir la variable CSS pour la largeur de mesure
    this.timeline.style.setProperty('--measure-w', `${measureW}px`);
    this.timeline.style.width = `${this.totalMeasures * measureW}px`;

    // Redessiner les éléments
    this.renderGridLines();
    this.renderRuler();
    this.renderMarkers();
    this.renderMinimapGridLines();
    this.updateMinimapViewport();
  }

  /* ══════════════════════════════════════════ */
  /*            RENDU DE LA GRILLE & RÈGLES     */
  /* ══════════════════════════════════════════ */

  /**
   * Génère les lignes de grille verticales de la timeline.
   */
  renderGridLines() {
    const overlay = this.timeline.querySelector('.grid-lines-overlay');
    if (!overlay) return;
    
    overlay.innerHTML = '';
    const measureW = this.getMeasureWidth();
    const beatW = measureW / this.beatsPerMeasure;
    
    // 1. Tracé des temps (Beats)
    for (let m = 0; m < this.totalMeasures; m++) {
      for (let b = 0; b < this.beatsPerMeasure; b++) {
        if (b === 0) continue; // Sauter le début de mesure (géré par les lignes de mesure)
        const line = document.createElement('div');
        line.className = 'grid-line beat';
        line.style.left = `${m * measureW + b * beatW}px`;
        overlay.appendChild(line);
      }
    }
    
    // 2. Tracé des mesures et sections (Renforcées toutes les 4 mesures)
    for (let m = 0; m <= this.totalMeasures; m++) {
      const line = document.createElement('div');
      const isSection = m % 4 === 0;
      line.className = `grid-line measure ${isSection ? 'four-measures' : ''}`;
      line.style.left = `${m * measureW}px`;
      overlay.appendChild(line);
    }
  }

  /**
   * Génère la règle temporelle principale (numéros des mesures).
   */
  renderRuler() {
    const ruler = this.timeline.querySelector('.beat-ruler');
    if (!ruler) return;
    
    ruler.innerHTML = '';
    const measureW = this.getMeasureWidth();
    
    for (let m = 0; m < this.totalMeasures; m++) {
      const tick = document.createElement('div');
      const isSection = m % 4 === 0;
      tick.className = `ruler-measure-tick ${isSection ? 'four-measures' : ''}`;
      tick.style.left = `${m * measureW}px`;
      tick.style.width = `${measureW}px`;
      
      tick.innerHTML = `
        <span class="ruler-measure-number">M. ${m + 1}</span>
      `;
      
      // Petites graduations internes pour les temps
      const beatW = measureW / this.beatsPerMeasure;
      const ticksContainer = document.createElement('div');
      ticksContainer.className = 'ruler-beat-ticks';
      
      for (let b = 0; b < this.beatsPerMeasure; b++) {
        const beatTick = document.createElement('div');
        beatTick.className = `ruler-beat-tick ${b === 0 ? 'major' : ''}`;
        beatTick.style.left = `${b * beatW}px`;
        ticksContainer.appendChild(beatTick);
      }
      tick.appendChild(ticksContainer);
      
      ruler.appendChild(tick);
    }
  }

  /* ══════════════════════════════════════════ */
  /*               MARQUEURS DE SECTION         */
  /* ══════════════════════════════════════════ */

  /**
   * Redessine les marqueurs de section sur leur règle dédiée.
   */
  renderMarkers() {
    // Vider les marqueurs actuels (conserver le placeholder explicatif)
    const existing = this.markerRuler.querySelectorAll('.timeline-marker');
    existing.forEach(el => el.remove());
    
    const measureW = this.getMeasureWidth();
    
    // Gérer l'affichage de l'aide textuelle si aucun marqueur
    const placeholder = this.markerRuler.querySelector('.marker-ruler-placeholder');
    if (placeholder) {
      placeholder.style.display = this.markers.length === 0 ? 'block' : 'none';
    }

    this.markers.forEach(marker => {
      const el = document.createElement('div');
      el.className = 'timeline-marker';
      el.dataset.id = marker.id;
      el.style.backgroundColor = marker.color;
      el.style.borderColor = marker.color;
      
      // Positionnement précis selon le temps et le zoom
      const posX = marker.time * measureW;
      el.style.left = `${posX}px`;
      
      el.innerHTML = `
        <span class="marker-label">${marker.label}</span>
        <span class="delete-marker-btn" title="Supprimer">&times;</span>
      `;
      // Configurer le glisser-déposer sur le marqueur
      this._setupMarkerDragAndDrop(el, marker);
      
      // Clic pour modifier
      el.querySelector('.marker-label').addEventListener('click', (e) => {
        e.stopPropagation();
        // N'ouvrir le modal que si le marqueur n'a pas bougé pendant la session de drag
        if (el.dataset.hasMoved !== 'true') {
          this._showEditMarkerModal(marker);
        }
      });
      
      // Bouton supprimer
      el.querySelector('.delete-marker-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMarker(marker.id);
      });
      
      this.markerRuler.appendChild(el);
    });
  }

  /**
   * Gère le déplacement horizontal par Pointer Events d'un marqueur.
   */
  _setupMarkerDragAndDrop(el, marker) {
    let isDragging = false;
    let startX = 0;
    let startTime = 0;
    let hasMoved = false;
    
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Uniquement clic gauche
      isDragging = true;
      hasMoved = false;
      el.dataset.hasMoved = 'false';
      el.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startTime = marker.time;
      e.stopPropagation();
    });
    
    el.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) {
        hasMoved = true;
        el.dataset.hasMoved = 'true';
      }
      
      const measureW = this.getMeasureWidth();
      const timeDelta = dx / measureW;
      let newTime = startTime + timeDelta;
      
      // Appliquer le magnétisme lors du déplacement du marqueur
      if (this.snapMode === 'measure') {
        newTime = Math.round(newTime);
      } else if (this.snapMode === 'beat') {
        newTime = Math.round(newTime * this.beatsPerMeasure) / this.beatsPerMeasure;
      }
      
      newTime = Math.max(0, Math.min(this.totalMeasures, newTime));
      
      // Déplacement visuel immédiat (haute performance)
      el.style.left = `${newTime * measureW}px`;
      marker.time = newTime;
    });
    
    const handlePointerUp = (e) => {
      if (isDragging) {
        isDragging = false;
        el.releasePointerCapture(e.pointerId);
        
        // Finaliser le positionnement
        this.renderMarkers();
        this.updateMinimapViewport();
        
        if (this.onMarkersChanged) {
          this.onMarkersChanged(this.markers);
        }
      }
    };
    
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
  }

  /**
   * Double-clic sur la règle pour ajouter un nouveau marqueur.
   */
  _handleMarkerRulerDblClick(e) {
    if (e.target !== this.markerRuler && !e.target.classList.contains('marker-ruler-placeholder')) return;
    
    const rect = this.markerRuler.getBoundingClientRect();
    const clickX = e.clientX - rect.left + this.viewport.scrollLeft;
    const measureW = this.getMeasureWidth();
    
    let time = clickX / measureW;
    
    // Snapping initial
    if (this.snapMode === 'measure') {
      time = Math.round(time);
    } else if (this.snapMode === 'beat') {
      time = Math.round(time * this.beatsPerMeasure) / this.beatsPerMeasure;
    }
    
    time = Math.max(0, Math.min(this.totalMeasures, time));
    this._showAddMarkerModal(time);
  }

  /**
   * Ouvre la modale pour éditer un marqueur.
   */
  _showEditMarkerModal(marker) {
    const modal = document.getElementById('markerModal');
    const title = document.getElementById('modalTitle');
    const labelInput = document.getElementById('markerLabelInput');
    const saveBtn = document.getElementById('saveMarkerBtn');
    const cancelBtn = document.getElementById('cancelMarkerBtn');
    const deleteBtn = document.getElementById('deleteMarkerBtn');

    title.textContent = "Modifier le Marqueur";
    labelInput.value = marker.label;
    modal.classList.add('open');
    labelInput.focus();
    labelInput.select();

    let currentColor = marker.color;
    const colorDots = modal.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
      dot.classList.remove('selected');
      if (dot.dataset.color === currentColor) dot.classList.add('selected');
    });

    deleteBtn.style.display = 'block';

    const onColorSelect = (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      colorDots.forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      currentColor = dot.dataset.color;
    };
    modal.querySelector('.color-presets').addEventListener('click', onColorSelect);

    const onSave = () => {
      marker.label = labelInput.value.trim() || "Sans titre";
      marker.color = currentColor;
      this.renderMarkers();
      closeModal();
      if (this.onMarkersChanged) this.onMarkersChanged(this.markers);
    };

    const onDelete = () => {
      this.deleteMarker(marker.id);
      closeModal();
    };

    const closeModal = () => {
      modal.classList.remove('open');
      saveBtn.removeEventListener('click', onSave);
      deleteBtn.removeEventListener('click', onDelete);
      cancelBtn.removeEventListener('click', closeModal);
      modal.querySelector('.color-presets').removeEventListener('click', onColorSelect);
    };

    saveBtn.addEventListener('click', onSave);
    deleteBtn.addEventListener('click', onDelete);
    cancelBtn.addEventListener('click', closeModal);
  }

  /**
   * Ouvre la modale pour ajouter un nouveau marqueur.
   */
  _showAddMarkerModal(time) {
    const modal = document.getElementById('markerModal');
    const title = document.getElementById('modalTitle');
    const labelInput = document.getElementById('markerLabelInput');
    const saveBtn = document.getElementById('saveMarkerBtn');
    const cancelBtn = document.getElementById('cancelMarkerBtn');
    const deleteBtn = document.getElementById('deleteMarkerBtn');

    title.textContent = "Ajouter un Marqueur";
    labelInput.value = `Intro`; // Nom par défaut
    modal.classList.add('open');
    labelInput.focus();
    labelInput.select();

    let currentColor = '#f19066';
    const colorDots = modal.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
      dot.classList.remove('selected');
      if (dot.dataset.color === currentColor) dot.classList.add('selected');
    });

    deleteBtn.style.display = 'none';

    const onColorSelect = (e) => {
      const dot = e.target.closest('.color-dot');
      if (!dot) return;
      colorDots.forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      currentColor = dot.dataset.color;
    };
    modal.querySelector('.color-presets').addEventListener('click', onColorSelect);

    const onSave = () => {
      const label = labelInput.value.trim() || `Intro`;
      this.addMarker({
        id: `marker-${Date.now()}`,
        time: time,
        label: label,
        color: currentColor
      });
      closeModal();
    };

    const closeModal = () => {
      modal.classList.remove('open');
      saveBtn.removeEventListener('click', onSave);
      cancelBtn.removeEventListener('click', closeModal);
      modal.querySelector('.color-presets').removeEventListener('click', onColorSelect);
    };

    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', closeModal);
  }

  /**
   * Ajoute un marqueur et rafraîchit.
   * @param {Object} marker 
   */
  addMarker(marker) {
    this.markers.push(marker);
    // Trier par ordre chronologique
    this.markers.sort((a, b) => a.time - b.time);
    this.renderMarkers();
    if (this.onMarkersChanged) this.onMarkersChanged(this.markers);
  }

  /**
   * Supprime un marqueur.
   * @param {string} id 
   */
  deleteMarker(id) {
    this.markers = this.markers.filter(m => m.id !== id);
    this.renderMarkers();
    if (this.onMarkersChanged) this.onMarkersChanged(this.markers);
  }

  /* ══════════════════════════════════════════ */
  /*         LOGIQUE DE DÉPLACEMENT (PANNING)   */
  /* ══════════════════════════════════════════ */

  /**
   * Événement Touche Enfoncée (Espace).
   */
  _handleKeyDown(e) {
    if (e.code === 'Space') {
      const activeEl = document.activeElement;
      const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable;
      if (!isInput) {
        e.preventDefault();
        if (!this.isSpacePressed) {
          this.isSpacePressed = true;
          this._updatePanningCursor();
        }
      }
    }
  }

  /**
   * Événement Touche Relâchée (Espace).
   */
  _handleKeyUp(e) {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      this._updatePanningCursor();
    }
  }

  /**
   * Détecte si le clic initial correspond à une action de Panning.
   */
  _handleViewportPointerDown(e) {
    // Autoriser le panning si le bouton hand tool est actif, si espace est pressé, ou si clic gauche sur le fond
    const isHandMode = this.isPanningActive || this.isSpacePressed;
    const isClickingEmpty = e.target.classList.contains('track-row') || 
                            e.target.classList.contains('grid-lines-overlay') || 
                            e.target.classList.contains('grid-line') ||
                            e.target.classList.contains('empty-notice');

    if (e.button === 0 && (isHandMode || isClickingEmpty)) {
      this.isPanningDragging = true;
      this.panPointerId = e.pointerId;
      this.viewport.setPointerCapture(e.pointerId);

      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panStartScrollLeft = this.viewport.scrollLeft;
      this.panStartScrollTop = this.viewport.scrollTop;

      this.viewport.classList.add('panning-dragging');
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Effectue le défilement lors du glissé du pointeur.
   */
  _handleViewportPointerMove(e) {
    if (this.isPanningDragging && e.pointerId === this.panPointerId) {
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      
      // Défilement du viewport en sens inverse du mouvement de la main
      this.viewport.scrollLeft = this.panStartScrollLeft - dx;
      this.viewport.scrollTop = this.panStartScrollTop - dy;
      
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Finalise l'action de Panning.
   */
  _handleViewportPointerUp(e) {
    if (this.isPanningDragging && e.pointerId === this.panPointerId) {
      this.isPanningDragging = false;
      this.viewport.releasePointerCapture(e.pointerId);
      this.viewport.classList.remove('panning-dragging');
      this.panPointerId = null;
      e.stopPropagation();
    }
  }

  /**
   * Gère la mise à jour visuelle du curseur selon les modes de navigation.
   */
  _updatePanningCursor() {
    if (this.isPanningActive || this.isSpacePressed) {
      this.viewport.classList.add('panning-active');
    } else {
      this.viewport.classList.remove('panning-active');
    }
  }

  /**
   * Met à jour la mini-carte lors du défilement de la timeline.
   */
  _handleViewportScroll() {
    if (!this.isMinimapDragging) {
      this.updateMinimapViewport();
    }
  }

  /* ══════════════════════════════════════════ */
  /*            MINI-MAP (TIMELINE OVERVIEW)     */
  /* ══════════════════════════════════════════ */

  /**
   * Met à jour le positionnement et la taille du rectangle indicateur (viewport) sur la mini-carte.
   */
  updateMinimapViewport() {
    const totalContentWidth = this.totalMeasures * this.getMeasureWidth();
    const viewportWidth = this.viewport.clientWidth;
    const minimapWidth = this.minimapContainer.clientWidth;
    
    if (totalContentWidth <= 0 || minimapWidth <= 0) return;

    const ratio = minimapWidth / totalContentWidth;

    // Calculer la largeur du slider
    let sliderWidth = viewportWidth * ratio;
    // S'assurer qu'il a une largeur minimale lisible
    sliderWidth = Math.max(16, Math.min(minimapWidth, sliderWidth));

    // Calculer la position x du slider
    let sliderLeft = this.viewport.scrollLeft * ratio;
    // S'assurer qu'il ne dépasse pas les bords
    if (sliderLeft < 0) sliderLeft = 0;
    if (sliderLeft > minimapWidth - sliderWidth) sliderLeft = minimapWidth - sliderWidth;

    this.minimapSlider.style.width = `${sliderWidth}px`;
    this.minimapSlider.style.left = `${sliderLeft}px`;
  }

  /**
   * Trace la grille simplifiée sur le fond de la mini-carte.
   */
  renderMinimapGridLines() {
    const gridOverlay = this.minimapContainer.querySelector('.minimap-grid-lines');
    if (!gridOverlay) return;
    
    gridOverlay.innerHTML = '';
    
    // Uniquement les lignes de mesures et sections
    for (let m = 0; m <= this.totalMeasures; m++) {
      if (m === 0 || m === this.totalMeasures) continue;
      const ratio = m / this.totalMeasures;
      const line = document.createElement('div');
      const isSection = m % 4 === 0;
      line.className = `minimap-grid-line ${isSection ? 'four-measures' : ''}`;
      line.style.left = `${ratio * 100}%`;
      gridOverlay.appendChild(line);
    }
  }

  /**
   * Action sur la mini-carte : Déplacer instantanément à l'emplacement cliqué ou glissé.
   */
  _handleMinimapDrag(clientX) {
    const rect = this.minimapContainer.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const minimapWidth = rect.width;
    
    const totalContentWidth = this.totalMeasures * this.getMeasureWidth();
    const viewportWidth = this.viewport.clientWidth;
    const ratio = minimapWidth / totalContentWidth;
    
    const sliderWidth = parseFloat(this.minimapSlider.style.width) || 50;

    // Centrer le slider sur le point cliqué/glissé
    let newLeft = clickX - sliderWidth / 2;
    
    // Limites
    if (newLeft < 0) newLeft = 0;
    if (newLeft > minimapWidth - sliderWidth) newLeft = minimapWidth - sliderWidth;
    
    this.minimapSlider.style.left = `${newLeft}px`;
    
    // Défilement synchrone de la timeline principale
    this.viewport.scrollLeft = newLeft / ratio;
  }

  _handleMinimapPointerDown(e) {
    this.isMinimapDragging = true;
    this.minimapPointerId = e.pointerId;
    this.minimapContainer.setPointerCapture(e.pointerId);
    this._handleMinimapDrag(e.clientX);
    e.preventDefault();
  }

  _handleMinimapPointerMove(e) {
    if (this.isMinimapDragging && e.pointerId === this.minimapPointerId) {
      this._handleMinimapDrag(e.clientX);
      e.preventDefault();
    }
  }

  _handleMinimapPointerUp(e) {
    if (this.isMinimapDragging && e.pointerId === this.minimapPointerId) {
      this.isMinimapDragging = false;
      this.minimapContainer.releasePointerCapture(e.pointerId);
      this.minimapPointerId = null;
    }
  }

  /**
   * Met à jour l'affichage miniature des blocs au sein des pistes de la mini-carte.
   * @param {Array} tracksData - Les données de pistes et blocs simulant le séquenceur
   */
  renderMinimapPreview(tracksData) {
    const previewContainer = this.minimapContainer.querySelector('.minimap-tracks-preview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    tracksData.forEach(track => {
      const row = document.createElement('div');
      row.className = 'minimap-track-row';
      
      track.blocks.forEach(block => {
        const blockEl = document.createElement('div');
        blockEl.className = 'minimap-block';
        blockEl.style.backgroundColor = block.color;
        
        // Calcul des positions en pourcentage (indépendant du zoom de la timeline)
        const startPercent = (block.time / this.totalMeasures) * 100;
        const widthPercent = (block.duration / this.totalMeasures) * 100;
        
        blockEl.style.left = `${startPercent}%`;
        blockEl.style.width = `${widthPercent}%`;
        
        row.appendChild(blockEl);
      });
      
      previewContainer.appendChild(row);
    });
  }

  /* ══════════════════════════════════════════ */
  /*        MAGNETISME (SMART SNAPPING)         */
  /* ══════════════════════════════════════════ */

  /**
   * Calcule les coordonnées de position "aimantées" pour un pixel X donné.
   * @param {number} pixelX - Position X brute en pixels par rapport à la timeline
   * @returns {Object} Contient la coordonnée aimantée X, le temps musical équivalent et la visibilité du guide
   */
  getSnappedX(pixelX) {
    const measureW = this.getMeasureWidth();
    const beatW = measureW / this.beatsPerMeasure;
    
    if (this.snapMode === 'measure') {
      const measureIndex = Math.round(pixelX / measureW);
      return {
        x: measureIndex * measureW,
        time: measureIndex,
        guideVisible: true
      };
    } else if (this.snapMode === 'beat') {
      const beatIndex = Math.round(pixelX / beatW);
      return {
        x: beatIndex * beatW,
        time: beatIndex / this.beatsPerMeasure,
        guideVisible: true
      };
    } else {
      // Snapping Off : Positionnement libre
      return {
        x: pixelX,
        time: pixelX / measureW,
        guideVisible: false
      };
    }
  }

  /**
   * Affiche la ligne d'alignement jaune magnétique à la coordonnée X fournie.
   * @param {number} x - Position en pixels
   */
  showSnapGuide(x) {
    if (this.snapMode !== 'none') {
      this.snapGuide.style.left = `${x}px`;
      this.snapGuide.classList.add('visible');
    } else {
      this.hideSnapGuide();
    }
  }

  /**
   * Masque la ligne d'alignement.
   */
  hideSnapGuide() {
    this.snapGuide.classList.remove('visible');
  }
}
