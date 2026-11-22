import { SHOW_DANCADOR } from '../../constants/featureFlags';
import { TourStepDef } from './tourTypes';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

function ensureRodaSurface(openPistas = false) {
  useSequencerSettingsStore.getState().setIsSettingsOpen(false);
  useSequencerStore.getState().closeDetailEditor();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-change-view-mode', { detail: { viewMode: 'roda' } }));
  }
  useSequencerStore.setState({ isTracksCollapsed: !openPistas });
}

export const TOUR_STEPS_PRACTICE: TourStepDef[] = [
  {
    id: 'prac-menu',
    targetTourId: 'header-menu-btn',
    badgeFr: 'Répertoire & Modes',
    badgePt: 'Repertório & Modos',
    titleFr: 'Choisir son morceau et son parcours',
    titlePt: 'Escolher sua música e seu modo',
    bodyFr: SHOW_DANCADOR
      ? 'Ouvrez MENU pour charger un baque du catalogue de votre groupe ou du catalogue public, et basculer vers le Mode Studio, Dançador ou Cantador.'
      : 'Ouvrez MENU pour charger un baque du catalogue de votre groupe ou du catalogue public, et basculer vers le Mode Studio ou Cantador.',
    bodyPt: SHOW_DANCADOR
      ? 'Abra o MENU para carregar um baque do catálogo do seu grupo ou público, e alternar entre Modo Estúdio, Dançador ou Cantador.'
      : 'Abra o MENU para carregar um baque do catálogo do seu grupo ou público, e alternar entre Modo Estúdio ou Cantador.',
    prepare: () => ensureRodaSurface(false),
  },
  {
    id: 'prac-roda',
    targetTourId: 'roda-canvas',
    badgeFr: 'Lecture 360° & Pédagogie',
    badgePt: 'Leitura 360° & Pedagogia',
    titleFr: 'La Roda circulaire et le Popover de frappe',
    titlePt: 'A Roda circular e o Popover de toque',
    bodyFr: 'La Roda est 100 % protégée contre les fausses manipulations : cliquez sur n’importe quel pas pour ouvrir sa fiche pédagogique et écouter le geste isolé.',
    bodyPt: 'A Roda é 100 % protegida contra cliques acidentais: toque em qualquer passo para abrir sua ficha pedagógica e ouvir o golpe isolado.',
    prepare: () => ensureRodaSurface(false),
  },
  {
    id: 'prac-pistes',
    targetTourId: 'header-tab-pistes',
    fallbackTourIds: ['pistas-grid'],
    badgeFr: 'Partition Linéaire',
    badgePt: 'Partitura Linear',
    titleFr: 'Vue Pistes synchronisée',
    titlePt: 'Visão Pistas sincronizada',
    bodyFr: 'Basculez sur PISTES pour lire tous les pupitres à plat mesure par mesure, avec le même Popover pédagogique au clic sur chaque coup.',
    bodyPt: 'Alterne para PISTAS para ler todos os naipes horizontalmente compasso por compasso, com o mesmo Popover pedagógico em cada toque.',
    prepare: () => ensureRodaSurface(true),
  },
  {
    id: 'prac-tracks',
    targetTourId: 'workspace-track-column',
    fallbackTourIds: ['workspace-focus-btn'],
    badgeFr: 'Isolation & Ao Vivo',
    badgePt: 'Isolamento & Ao Vivo',
    titleFr: 'Isoler son pupitre en Focus ou Solo',
    titlePt: 'Isolar seu naipe em Foco ou Solo',
    bodyFr: 'Utilisez le bouton Focus, Mute [M], Solo [S] ou l’icône des baguettes pour suivre visuellement le jeu Ao Vivo de votre instrument et les paroles de la Toada.',
    bodyPt: 'Use o botão Focus, Mudo [M], Solo [S] ou o ícone das baquetas para acompanhar o toque Ao Vivo do seu instrumento e a letra da Toada.',
    prepare: () => ensureRodaSurface(false),
  },
  {
    id: 'prac-trainer',
    targetTourId: 'transport-speed-trainer',
    fallbackTourIds: ['transport-play-btn'],
    badgeFr: 'Répétition Guidée',
    badgePt: 'Treino Guiado',
    titleFr: 'Tocar Junto & Speed Trainer',
    titlePt: 'Tocar Junto & Treinador de Velocidade',
    bodyFr: 'Lancez la lecture [Espace], ajustez le BPM, coupez uniquement votre pupitre pour jouer avec le Batuque (Tocar Junto) ou accélérez palier par palier.',
    bodyPt: 'Inicie com [Espaço], ajuste o BPM, silencie apenas seu naipe para tocar com o Batuque (Tocar Junto) ou acelere gradualmente.',
    prepare: () => ensureRodaSurface(false),
  },
  {
    id: 'prac-profile',
    targetTourId: 'header-profile-btn',
    badgeFr: 'Préférences Personnelles',
    badgePt: 'Preferências Pessoais',
    titleFr: 'Profil, Instrument favori & Mode Gaucher',
    titlePt: 'Perfil, Instrumento favorito & Modo Canhoto',
    bodyFr: 'Tout à droite, ouvrez Mon Profil & Préférences pour mémoriser votre instrument de travail et votre latéralité (Droitier ou Gaucher).',
    bodyPt: 'À direita da barra superior, abra Meu Perfil & Preferências para definir seu instrumento principal e sua lateralidade (Destro ou Canhoto).',
    prepare: () => ensureRodaSurface(false),
  },
];
