import { SHOW_DANCADOR } from '../../constants/featureFlags';
import { GuidePanoramaAppBridge, GuidePanoramaTrack, GuidePoleDef } from './guideTypes';

export const PANORAMA_TRACKS: GuidePanoramaTrack[] = [
  {
    badgeFr: 'Parcours Pratique · Élève & Rue',
    badgePt: 'Percurso Prática · Aluno & Rua',
    titleFr: 'Écouter, comprendre le geste et répéter sans jamais dérégler la partition',
    titlePt: 'Ouvir, compreender o gesto e ensaiar sem risco de alterar a partitura',
    pointsFr: [
      'Roda 360° (balayage Progressif au balai de paille à 6h ou Par mesure à 12h), exploration pas-à-pas aux flèches ← / → en Pause et vue Pistes 100 % protégées en lecture pure.',
      'Popover pédagogique au clic sur chaque pas : écoute du coup isolé, description technique du geste et inversion intégrale Droitier / Gaucher.',
      'Isolation Focus (Mon Pupitre + Référence), baguettes animées Ao Vivo sur le tambour et paroles de Toada synchronisées au centre.',
      'Entraînement autonome : Tocar Junto (coupe votre instrument pour jouer par-dessus le Batuque), Speed Trainer par paliers BPM et PWA 100 % hors-ligne.',
    ],
    pointsPt: [
      'Roda 360° (varredura Progressiva com vassoura em 6h ou Por compasso às 12h), exploração passo a passo com ← / → em Pausa e visão Pistas 100 % protegidas em leitura pura.',
      'Popover pedagógico ao clicar em cada passo: escuta isolada do toque, postura técnica e inversão integral Destro / Canhoto.',
      'Isolamento Focus (Meu Naipe + Referência), baquetas animadas Ao Vivo sobre o tambor e letra da Toada sincronizada no centro.',
      'Treino autônomo: Tocar Junto (silencia seu instrumento para tocar junto com o Batuque), Speed Trainer por patamares de BPM e PWA 100 % offline.',
    ],
  },
  {
    badgeFr: 'Parcours Studio · Mestre & Arrangeur',
    badgePt: 'Percurso Estúdio · Mestre & Arranjador',
    titleFr: 'Composer, sculpter les peaux 48 kHz, arranger, scanner et publier sur 1 ou 2 écrans',
    titlePt: 'Compor, esculpir peles em 48 kHz, arranjar, digitalizar e publicar em 1 ou 2 telas',
    pointsFr: [
      'Éditeur Détail Plein Écran : peinture clic gauche glissé, gomme clic droit glissé (1 Undo), Ciseau [a, b], plages Ctrl+C/X/V/D, MIDI Learn et REC.',
      'Architecture vivante : groupes liés Maître [M] / Esclave [E] à opacité différentielle, variations d’entrée de bloc 1ª VEZ et tirages probabilistes (%).',
      'Timeline DAW & Console Master : signatures métriques libres, rampes BPM/Volume, Bus de pupitres compressés, écoute Mono et Fenêtre Satellite [ 2 ÉCRANS ].',
      'A Oficina [O] : Banc de Lutherie (diapason referencePitchHz), Balanço, La Presse A4 Éco-Encre & Mini-Rodas, Atelier Papier & Scan optique, Labo Photo Cordel.',
    ],
    pointsPt: [
      'Editor Detalhado em Tela Cheia: pintura com arrasto esquerdo, borracha direita (1 Undo), Tesoura [a, b], trechos Ctrl+C/X/V/D, MIDI Learn e REC.',
      'Arquitetura viva: grupos Mestre [M] / Escravo [E] com opacidade diferencial, variações de entrada de bloco 1ª VEZ e sorteios probabilísticos (%).',
      'Timeline DAW & Console Master: fórmulas livres por compasso, rampas de BPM/Volume, Canais de Bus com compressor, soma Mono e Janela Satélite [ 2 TELAS ].',
      'A Oficina [O]: Bancada de Lutheria (referencePitchHz), Balanço, A Prensa A4 Eco-Tinta & Mini-Rodas, Atelier Papel & Scan óptico, Labo Foto Cordel.',
    ],
  },
];

export const PANORAMA_ECOSYSTEM: GuidePanoramaAppBridge[] = [
  {
    appName: 'Orquestrador',
    roleFr: 'Portail central & gouvernance SSOT',
    rolePt: 'Portal central & governança SSOT',
    bridgeFr: 'Authentification unique (SSO), gestion des groupes/Nações, rôles Mestre / Éditeur / Membre et paramètres partagés.',
    bridgePt: 'Autenticação única (SSO), gestão dos grupos/Nações, perfis Mestre / Editor / Membro e configurações compartilhadas.',
  },
  {
    appName: 'Organizador & Mostrador',
    roleFr: 'Vie du groupe, répertoire & vitrine',
    rolePt: 'Vida do grupo, repertório & vitrine',
    bridgeFr: 'Relie chaque morceau sauvegardé dans Sequenciador aux fiches élèves du Varal, à l’agenda de répétition et au portail public Mostrador.',
    bridgePt: 'Conecta cada música salva no Sequenciador às fichas do Varal dos alunos, à agenda de ensaios e à vitrine pública Mostrador.',
  },
  {
    appName: 'Cantador',
    roleFr: 'Laboratoire vocal des Toadas',
    rolePt: 'Laboratório vocal das Toadas',
    bridgeFr: 'Partage la Grammaire Vocale Unifiée v2 (P, C, _ mélisme lié, / soudure, 0 silence explicite, anacrouse) et les prises vocales du groupe.',
    bridgePt: 'Compartilha a Gramática Vocal Unificada v2 (P, C, _ melisma ligado, / soldadura, 0 silêncio explícito, anacruse) e gravações vocais.',
  },
  ...(SHOW_DANCADOR
    ? [
        {
          appName: 'Dançador',
          roleFr: 'Atelier chorégraphique synchronisé',
          rolePt: 'Oficina coreográfica sincronizada',
          bridgeFr: 'Reçoit en 1 clic le Cloud Bounce audio et le découpage exact des mesures, tempos et sections publié depuis Sequenciador.',
          bridgePt: 'Recebe em 1 clique o Cloud Bounce de áudio e o mapa exato de compassos, andamentos e seções publicado pelo Sequenciador.',
        },
      ]
    : []),
];

export const POLE_0_PANORAMA: GuidePoleDef = {
  id: 'panorama',
  num: '00',
  titleFr: 'Panorama Général',
  titlePt: 'Panorama Geral',
  subtitleFr: 'Vue d’ensemble de l’architecture de Sequenciador (Pratique & Studio) et de ses passerelles 100 % Cloud au sein de la suite O Girador.',
  subtitlePt: 'Visão geral da arquitetura do Sequenciador (Prática & Estúdio) e de suas pontes 100 % em Nuvem na suíte O Girador.',
  cards: [],
};
