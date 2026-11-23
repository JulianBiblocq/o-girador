import { SHOW_DANCADOR } from '../../constants/featureFlags';
import { TourPrepareCallbacks, TourStepDef } from './tourTypes';
import { useSequencerStore, isToadaChild } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';

function resetToCleanStudioRoda() {
  const settings = useSequencerSettingsStore.getState();
  if (settings.isSettingsOpen) settings.setIsSettingsOpen(false);
  const seq = useSequencerStore.getState();
  if (seq.editingTrackId !== null && !useDesktopWorkspaceStore.getState().isSatelliteOpen) {
    seq.closeDetailEditor();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-change-view-mode', { detail: { viewMode: 'roda' } }));
  }
  useSequencerStore.setState({ isTracksCollapsed: true });
}

function ensureEditorOpenForTour(cb?: TourPrepareCallbacks) {
  useSequencerSettingsStore.getState().setIsSettingsOpen(false);
  const seq = useSequencerStore.getState();
  if (seq.editingTrackId === null) {
    const first = seq.tracks.find((tr) => !isToadaChild(tr, seq.tracks) && (!tr.isBusFolder || tr.isLinkFolder)) || seq.tracks[0];
    if (first) {
      seq.setEditingTrackId(first.id);
      cb?.markEditorOpened();
    }
  }
}

function ensureOficinaOpenForTour(cb?: TourPrepareCallbacks) {
  const seq = useSequencerStore.getState();
  if (seq.editingTrackId !== null && !useDesktopWorkspaceStore.getState().isSatelliteOpen) {
    seq.closeDetailEditor();
  }
  const settings = useSequencerSettingsStore.getState();
  if (!settings.isSettingsOpen) {
    settings.setActiveSection('lutherie');
    settings.setIsSettingsOpen(true);
    cb?.markOficinaOpened();
  }
}

export const TOUR_STEPS_STUDIO: TourStepDef[] = [
  {
    id: 'studio-menu',
    targetTourId: 'header-menu-btn',
    badgeFr: '100 % Cloud & Passerelles',
    badgePt: '100 % Nuvem & Pontes',
    titleFr: 'Répertoire Cloud, Nouveau Morceau & Exports',
    titlePt: 'Repertório na Nuvem, Nova Música & Exportações',
    bodyFr: SHOW_DANCADOR
      ? 'Chargez, créez ou mettez à jour vos arrangements dans le Cloud, imprimez la tablature ou publiez directement le morceau vers Organizador et Dançador.'
      : 'Chargez, créez ou mettez à jour vos arrangements dans le Cloud, imprimez la tablature ou publiez directement le morceau vers Organizador et Cantador.',
    bodyPt: SHOW_DANCADOR
      ? 'Carregue, crie ou atualize seus arranjos na Nuvem, imprima a tablatura ou publique diretamente para o Organizador e o Dançador.'
      : 'Carregue, crie ou atualize seus arranjos na Nuvem, imprima a tablatura ou publique diretamente para o Organizador e o Cantador.',
    prepare: resetToCleanStudioRoda,
  },
  {
    id: 'studio-roda-popover',
    targetTourId: 'roda-canvas',
    badgeFr: 'Lecture Pure & Tremplin',
    badgePt: 'Leitura Pura & Atalho',
    titleFr: 'Roda & Pistes : Popover pédagogique vers Éditeur',
    titlePt: 'Roda & Pistas : Popover pedagógico rumo ao Editor',
    bodyFr: 'Roda et Pistes sont dédiées à l’écoute analytique : cliquez sur un pas pour écouter la frappe isolée ou sauter directement sur ce pas via « Ouvrir dans l’Éditeur ».',
    bodyPt: 'Roda e Pistas são dedicadas à escuta analítica: clique num passo para ouvir o toque isolado ou abri-lo diretamente no Editor.',
    prepare: resetToCleanStudioRoda,
  },
  {
    id: 'studio-views',
    targetTourId: 'header-tab-timeline',
    fallbackTourIds: ['header-tab-editor', 'header-tab-roda'],
    badgeFr: 'Architecture DAW',
    badgePt: 'Arquitetura DAW',
    titleFr: 'Mixeur, Séquenceur (Timeline) & Éditeur',
    titlePt: 'Mixador, Sequenciador (Linha do Tempo) & Editor',
    bodyFr: 'Basculez entre la Console de Mixage (tranches, Bus, Master), la Timeline multipiste (signatures, rampes BPM/Volume, 1ª VEZ, Toada) et l’Éditeur Détail.',
    bodyPt: 'Alterne entre a Console de Mixagem (canais, Bus, Master), a Linha do Tempo (fórmulas, rampas de BPM/Volume, 1ª VEZ, Toada) e o Editor.',
    prepare: resetToCleanStudioRoda,
  },
  {
    id: 'studio-editor-dock',
    targetTourId: 'editor-stroke-dock',
    fallbackTourIds: ['editor-modal'],
    badgeFr: 'Écriture Rapide',
    badgePt: 'Escrita Rápida',
    titleFr: 'Peinture, Gomme clic droit & Dock [ Sélect. ]',
    titlePt: 'Pintura, Borracha botão direito & Dock [ Selec. ]',
    bodyFr: 'Peignez au clic gauche glissé, effacez au clic droit glissé, et utilisez Ctrl/Cmd + clic ou le bouton [ Sélect. ] pour copier, coller et dupliquer toute une plage.',
    bodyPt: 'Pinte arrastando com o botão esquerdo, apague com o direito e use Ctrl/Cmd + clique ou [ Selec. ] para copiar, colar e duplicar um trecho.',
    prepare: ensureEditorOpenForTour,
  },
  {
    id: 'studio-editor-pro',
    targetTourId: 'editor-inspector',
    fallbackTourIds: ['editor-fullscreen-btn', 'editor-modal'],
    badgeFr: 'Sculpture & MIDI',
    badgePt: 'Escultura & MIDI',
    titleFr: 'Plein Écran, Dynamique & MIDI Learn direct',
    titlePt: 'Tela Cheia, Dinâmica & MIDI Learn direto',
    bodyFr: 'Passez l’éditeur en plein écran, sculptez Volume, Decay et accordage dans l’inspecteur, et assignez n’importe quel pad USB à la volée via le bouton Learn.',
    bodyPt: 'Amplie o editor em tela cheia, ajuste Volume, Decay e afinação no inspetor, e mapeie qualquer pad USB na hora pelo botão Learn.',
    prepare: ensureEditorOpenForTour,
  },
  {
    id: 'studio-dual-screen',
    targetTourId: 'header-dual-screen',
    fallbackTourIds: ['header-oficina-btn'],
    badgeFr: 'Poste Studio 2 Écrans',
    badgePt: 'Estúdio 2 Telas',
    titleFr: 'Fenêtre Satellite Multi-Écrans (2 ÉCRANS)',
    titlePt: 'Janela Satélite Multi-Telas (2 TELAS)',
    bodyFr: 'Détachez la Console de Mixage, l’Éditeur Détail ou A Oficina sur un second moniteur tout en gardant la Roda ou la Timeline plein cadre sur l’Écran 1.',
    bodyPt: 'Destaque a Mesa de Mixagem, o Editor ou A Oficina para um segundo monitor mantendo a Roda ou a Linha do Tempo na Tela 1.',
    prepare: resetToCleanStudioRoda,
  },
  {
    id: 'studio-oficina',
    targetTourId: 'oficina-domain-son-groove',
    fallbackTourIds: ['oficina-modal', 'header-oficina-btn'],
    badgeFr: 'A Oficina [O]',
    badgePt: 'A Oficina [O]',
    titleFr: 'Les 3 Domaines d’A Oficina',
    titlePt: 'Os 3 Domínios d’A Oficina',
    bodyFr: 'Retrouvez ici Son & Balanço (Lutherie 48 kHz, Balanço), Édition & Scène (La Presse A4, Atelier Papier & Scan, Signaux & Labo Photo) et Système (Audio, MIDI, Espaces Bureau, Mode Éco).',
    bodyPt: 'Acesse Som & Balanço (Lutheria 48 kHz, Balanço), Edição & Palco (A Prensa A4, Atelier Papel & Scan, Sinais & Labo Foto) e Sistema (Áudio, MIDI, Espaços Desktop, Modo Eco).',
    prepare: ensureOficinaOpenForTour,
  },
  {
    id: 'studio-profile',
    targetTourId: 'header-profile-btn',
    badgeFr: 'Profil & Manuel',
    badgePt: 'Perfil & Manual',
    titleFr: 'Mon Profil, Latéralité & Manuel par Fiches-Actions',
    titlePt: 'Meu Perfil, Lateralidade & Manual por Fichas',
    bodyFr: 'Gérez tout à droite votre compte, votre instrument et le mode Gaucher/Droitier — et ouvrez à tout moment MENU > Guide pour consulter les Fiches-Actions illustrées.',
    bodyPt: 'Gerencie à direita sua conta, instrumento e modo Canhoto/Destro — e abra MENU > Guide a qualquer momento para consultar as Fichas de Ação.',
    prepare: resetToCleanStudioRoda,
  },
];
