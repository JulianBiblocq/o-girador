/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentConfig, Preset, TimeSignature } from './types';

export const ASSETS_BASE_URL = '';

export const instrumentsConfig: InstrumentConfig[] = [
  {
    id: 'marcante',
    iconImg: 'icones/alfaia.svg',
    name: 'Alfaia Marcante',
    type: 'hands',
    mixerBg: '#3a1010',
    path: 'Alfaia/Marcante',
    colors: { 'd': '#5a0000', 'D': '#8b0000', 'g': '#ff7676', 'G': '#ff4d4d', text: '#fff' }
  },
  {
    id: 'meiao',
    iconImg: 'icones/alfaia.svg',
    name: 'Alfaia Meião',
    type: 'hands',
    mixerBg: '#3a2010',
    path: 'Alfaia/Meiao',
    colors: { 'd': '#a04000', 'D': '#d35400', 'g': '#fbc531', 'G': '#f39c12', text: '#fff' }
  },
  {
    id: 'repique',
    iconImg: 'icones/alfaia.svg',
    name: 'Alfaia Repique',
    type: 'hands',
    mixerBg: '#3a3010',
    path: 'Alfaia/Repique',
    colors: { 'd': '#b59510', 'D': '#f1c40f', 'g': '#fff5cc', 'G': '#ffeaa7', text: '#121212' }
  },
  {
    id: 'caixa',
    iconImg: 'icones/caixa.svg',
    name: 'Caixa',
    type: 'hands',
    mixerBg: '#2a103a',
    path: 'Caixa',
    colors: { 'd': '#320b61', 'D': '#4a148c', 'g': '#be5be0', 'G': '#9c27b0', text: '#fff' }
  },
  {
    id: 'gongue',
    iconImg: 'icones/gongue.svg',
    name: 'Gonguê',
    type: 'gongue',
    mixerBg: '#1a1a1a',
    path: 'Gongue',
    colors: { 'grv': '#222222', 'GRV': '#000000', 'aig': '#7f8c8d', 'AIG': '#bdc3c7', text: '#fff' }
  },
  {
    id: 'agbe',
    iconImg: 'icones/agbe.svg',
    name: 'Agbê',
    type: 'shake',
    mixerBg: '#103a10',
    path: 'Graines/Agbe',
    colors: { 'g': '#113b14', 'G': '#1b5e20', 'd': '#74d478', 'D': '#4caf50', text: '#fff' }
  },
  {
    id: 'mineiro',
    iconImg: 'icones/mineiro.svg',
    name: 'Mineiro',
    type: 'shake',
    mixerBg: '#203a10',
    path: 'Graines/Mineiro',
    colors: { 'p': '#113b14', 'P': '#1b5e20', 't': '#74d478', 'T': '#4caf50', text: '#fff' }
  },
  {
    id: 'chant',
    iconImg: 'icones/micro.svg',
    name: 'Voz / Coro',
    type: 'voice',
    mixerBg: '#10203a',
    path: 'internal',
    colors: { 'C': '#00d2d3', 'P': '#ff9f43', text: '#121212' }
  }
];

export const i18n = {
  pt: {
    loading: "Carregando vozes...",
    mixer: "🎛️ Misturador",
    legend: "📖 Legenda",
    seqLegendTitle: "⌨️ Dicas de digitação",
    seqLegend1: "Pressione Espaço no teclado para avançar.",
    seqLegend2: "Use as Setas (←/→) para navegar.",
    voiceLegendTitle: "🎤 Vozes / Coro",
    voiceLegend1: "Clique no topo da caixa (PUX/CORO) para alterar quem canta.",
    voiceLegend2: "Puxador: Laranja (Agudo). Coro: Ciano (Grave).",
    goldRule: "💡 Regra de ouro:<br>• Maiúscula = Golpe Forte<br>• Minúscula = Golpe Fraco",
    alfaiaCaixa: "🥁 Alfaia & Caixa",
    mainDroite: "Mão Direita",
    mainGauche: "Mão Esquerda",
    gongueLegend: "🔔 Gonguê",
    gongueGrave: "Grave Forte / Fraco",
    gongueAigu: "Agudo Forte / Fraco",
    agbeLegend: "🌾 Agbê",
    agbeG: "Esquerda (Forte / Fraco)",
    agbeD: "Direita (Forte / Fraco)",
    mineiroLegend: "🌾 Mineiro",
    mineiroP: "Cima (Forte / Fraco)",
    mineiroT: "Baixo (Forte / Fraco)",
    addInst: "adicionar",
    clear: "Limpar a Roda",
    save: "Salvar",
    load: "Carregar",
    stepsNum: "Passos:",
    promptVoice: "Sílaba / Palavra (Use ':' para adicionar a nota. Ex: C4:Vou) :",
    selectInst: "Escolher um instrumento...",
    toggleBtn: "Mostrar painel",
    toggleLegendBtn: "Ocultar / Mostrar legenda",
    toggleLetrasBtn: "Ocultar / Mostrar toada",
    tsLabel: "Compasso:",
    tutorialBtn: "Tutorial em vídeo",
    rewindBtn: "Parar e Voltar ao início",
    confirmResize: "Deseja ajustar automaticamente o número de passos de todas as faixas?",
    letrasTitle: "📝 Toada",
    extractBtn: "🔄 Extrair do mixador",
    letrasPlaceholder: "Cole a toada completa aqui (Pressione Extrair para o Karaokê)...",
    limitReached: "Limite máximo de instrumentos atingido (20)!",
    invalidFile: "Arquivo de ritmo inválido!",
    swingBtn: "Swing",
    creditLabel: "Criado por Julian Biblocq | Arte: Toni Braga",
    metaInfo: "Informações",
    metaToada: "Nome da Toada",
    metaNacao: "Nação / Bloco",
    metaCompositor: "Compositor",
    metaRitmo: "Ritmo"
  },
  fr: {
    loading: "Chargement des voix...",
    mixer: "🎛️ Mixeur",
    legend: "📖 Légende",
    seqLegendTitle: "⌨️ Astuces Séquenceur",
    seqLegend1: "Appuyez sur Espace pour avancer et laisser un silence.",
    seqLegend2: "Utilisez les Flèches (←/→) pour naviguer.",
    voiceLegendTitle: "🎤 Voix / Chœur",
    voiceLegend1: "Cliquez en haut de la case (PUX/CORO) pour changer qui chante.",
    voiceLegend2: "Puxador: Orange (Aigu). Chœur: Cyan (Grave).",
    goldRule: "💡 Règle d'or :<br>• Majuscule = Coup Fort<br>• Minusc. = Coup Faible",
    alfaiaCaixa: "🥁 Alfaia & Caixa",
    mainDroite: "Main Droite",
    mainGauche: "Main Gauche",
    gongueLegend: "🔔 Gonguê",
    gongueGrave: "Grave Fort / Faible",
    gongueAigu: "Aigu Fort / Faible",
    agbeLegend: "🌾 Agbê",
    agbeG: "Gauche (Fort / Faible)",
    agbeD: "Droite (Fort / Faible)",
    mineiroLegend: "🌾 Mineiro",
    mineiroP: "Haut (Fort / Faible)",
    mineiroT: "Bas (Fort / Faible)",
    addInst: "+ Ajouter",
    clear: "Vider la Roda",
    save: "Sauvegarder",
    load: "Charger",
    stepsNum: "Pas:",
    promptVoice: "Syllabe / Mot (Utilisez ':' pour ajouter la note. Ex : C4:Vou) :",
    selectInst: "Choisir un instrument...",
    toggleBtn: "Afficher le panneau",
    toggleLegendBtn: "Afficher / Masquer la légende",
    toggleLetrasBtn: "Afficher / Masquer la toada",
    tsLabel: "Signature:",
    tutorialBtn: "Tutoriel vidéo",
    rewindBtn: "Stop et Revenir au début",
    confirmResize: "Voulez-vous ajuster automatiquement le nombre de pas de toutes les pistes ?",
    letrasTitle: "📝 Toada",
    extractBtn: "🔄 Extraire du mixeur",
    letrasPlaceholder: "Collez votre Toada ici (Cliquez sur Extraire du mixeur pour le karaoké)...",
    limitReached: "Limite maximale d'instruments atteinte (20) !",
    invalidFile: "Fichier de rythme invalide !",
    swingBtn: "Swing",
    creditLabel: "Créé par Julian Biblocq | Art: Toni Braga",
    metaInfo: "Informations",
    metaToada: "Nom de la Toada",
    metaNacao: "Nação / Bloco",
    metaCompositor: "Compositeur",
    metaRitmo: "Rythme"
  }
};

export const vouVadiarPreset: Preset = {
  bpm: 83,
  timeSig: "4/4",
  circles: [
    {
      id: 1,
      steps: 16,
      repeats: 1,
      activeSteps: ["g", "D", 0, "d", "G", 0, "D", 0, "g", "D", 0, "d", "G", 0, 0, 0],
      instrumentIdx: 0,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 4,
      steps: 16,
      repeats: 1,
      activeSteps: ["D", "D", "g", "D", "D", "g", "D", "g", "D", "D", "g", "D", "D", "g", "D", "g"],
      instrumentIdx: 3,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 90
    },
    {
      id: 5,
      steps: 16,
      repeats: 1,
      activeSteps: [0, "GRV", 0, 0, "GRV", 0, "GRV", 0, 0, "GRV", 0, 0, "GRV", 0, "GRV", 0],
      instrumentIdx: 4,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 62
    },
    {
      id: 6,
      steps: 16,
      repeats: 1,
      activeSteps: ["G", 0, "d", "g", "D", 0, "g", "d", "G", 0, "d", "g", "D", 0, "g", "d"],
      instrumentIdx: 5,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 8,
      steps: 16,
      repeats: 1,
      activeSteps: ["P", 0, "P", 0, "P", 0, "P", 0, 0, "C", 0, "C", "C", 0, 0, 0],
      instrumentIdx: 7,
      lyrics: ["Vou", "", "va-", "", "di-", "", "ar", "", "Car-", "Car-", "na-", "na-", "val", "", "!", ""],
      notes: ["C4", "", "C4", "", "D4", "", "D4", "", "", "E4", "", "E4", "F4", "","", ""],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 1779,
      steps: 16,
      repeats: 1,
      activeSteps: ["P", 0, "P", 0, "P", 0, "P", 0, 0, "C", 0, "C", "C", 0, "C", 0],
      instrumentIdx: 7,
      lyrics: ["Vou", "", "Pra", "", "Ba-", "", "hi-", "", "", "a", "", "Brin-", "car", "", "Eu", ""],
      notes: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    }
  ]
};

export const baqueDeImalePreset: Preset = {
  bpm: 77,
  timeSig: "4/4",
  circles: [
    {
      id: 1,
      steps: 16,
      repeats: 1,
      activeSteps: ["D", 0, 0, 0, "g", 0, "D", 0, "g", "D", 0, 0, "g", "D", 0, 0],
      instrumentIdx: 0,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 2,
      steps: 16,
      repeats: 1,
      activeSteps: ["G", 0, 0, "d", "g", 0, "D", 0, "g", "D", 0, "d", "g", "D", 0, "d"],
      instrumentIdx: 1,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 4,
      steps: 16,
      repeats: 1,
      activeSteps: ["D", "D", "g", "D", "D", "g", "D", "g", "D", "D", "g", "D", "D", "g", "D", "g"],
      instrumentIdx: 3,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 5,
      steps: 16,
      repeats: 1,
      activeSteps: ["GRV", 0, "AIG", 0, "GRV", 0, "AIG", 0, "GRV", "AIG", 0, "aig", "GRV", 0, "AIG", 0],
      instrumentIdx: 4,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    },
    {
      id: 6,
      steps: 16,
      repeats: 1,
      activeSteps: ["G", 0, "d", "g", "D", 0, "g", "d", "G", 0, "d", "g", "D", 0, "g", "d"],
      instrumentIdx: 5,
      lyrics: [],
      notes: [],
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 100
    }
  ]
};

export function getMarkers(timeSignature: TimeSignature, maxTicks: number): number[] {
  if (timeSignature === '4/4') return [0, 24, 48, 72];
  if (timeSignature === '3/4') return [0, 24, 48];
  if (timeSignature === '2/4') return [0, 24];
  if (timeSignature === '6/8') return [0, 12, 24, 36, 48, 60];
  if (timeSignature === '12/8') return [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132];
  return [0, 24, 48, 72];
}

export function getMaxTicks(timeSignature: TimeSignature): number {
  if (timeSignature === '4/4') return 96;
  if (timeSignature === '3/4') return 72;
  if (timeSignature === '2/4') return 48;
  if (timeSignature === '6/8') return 72;
  if (timeSignature === '12/8') return 144;
  return 96;
}
