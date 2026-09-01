/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentConfig, Preset, TimeSignature } from './types';

import { MARACATU_THEME, buildInstrumentColors } from './theme/colorMap';

export const ASSETS_BASE_URL = (import.meta as any).env.BASE_URL;

export const instrumentsConfig: InstrumentConfig[] = [
  {
    id: 'marcante',
    iconImg: 'icones/alfaia.svg',
    name: 'Marcante (alfaia)',
    type: 'hands',
    mixerBg: MARACATU_THEME.marcante.mixerBg,
    path: 'Alfaia/Marcante',
    colors: buildInstrumentColors(MARACATU_THEME, 'marcante'),
    color: MARACATU_THEME.marcante.color
  },
  {
    id: 'meiao',
    iconImg: 'icones/alfaia.svg',
    name: 'Meião (alfaia)',
    type: 'hands',
    mixerBg: MARACATU_THEME.meiao.mixerBg,
    path: 'Alfaia/Meiao',
    colors: buildInstrumentColors(MARACATU_THEME, 'meiao'),
    color: MARACATU_THEME.meiao.color
  },
  {
    id: 'repique',
    iconImg: 'icones/alfaia.svg',
    name: 'Repique (alfaia)',
    type: 'hands',
    mixerBg: MARACATU_THEME.repique.mixerBg,
    path: 'Alfaia/Repique',
    colors: buildInstrumentColors(MARACATU_THEME, 'repique'),
    color: MARACATU_THEME.repique.color
  },
  {
    id: 'caixa',
    iconImg: 'icones/caixa.svg',
    name: 'Caixa',
    type: 'hands',
    mixerBg: MARACATU_THEME.caixa.mixerBg,
    path: 'Caixa',
    colors: buildInstrumentColors(MARACATU_THEME, 'caixa'),
    color: MARACATU_THEME.caixa.color
  },
  {
    id: 'tarol',
    iconImg: 'icones/caixa.svg',
    name: 'Tarol',
    type: 'hands',
    mixerBg: MARACATU_THEME.tarol.mixerBg,
    path: 'Tarol',
    colors: buildInstrumentColors(MARACATU_THEME, 'tarol'),
    color: MARACATU_THEME.tarol.color
  },
  {
    id: 'gongue',
    iconImg: 'icones/gongue.svg',
    name: 'Gonguê',
    type: 'gongue',
    mixerBg: MARACATU_THEME.gongue.mixerBg,
    path: 'Gongue',
    colors: buildInstrumentColors(MARACATU_THEME, 'gongue'),
    color: MARACATU_THEME.gongue.color
  },
  {
    id: 'agbe',
    iconImg: 'icones/agbe.svg',
    name: 'Agbê',
    type: 'shake',
    mixerBg: MARACATU_THEME.agbe.mixerBg,
    path: 'Agbe',
    colors: buildInstrumentColors(MARACATU_THEME, 'agbe'),
    color: MARACATU_THEME.agbe.color
  },
  {
    id: 'mineiro',
    iconImg: 'icones/mineiro.svg',
    name: 'Mineiro',
    type: 'shake',
    mixerBg: MARACATU_THEME.mineiro.mixerBg,
    path: 'Mineiro',
    colors: buildInstrumentColors(MARACATU_THEME, 'mineiro'),
    color: MARACATU_THEME.mineiro.color
  },
  {
    id: 'timbal',
    iconImg: 'icones/timbal.svg',
    name: 'Timbal',
    type: 'hands',
    mixerBg: MARACATU_THEME.timbal.mixerBg,
    path: 'Timbal',
    colors: buildInstrumentColors(MARACATU_THEME, 'timbal'),
    color: MARACATU_THEME.timbal.color
  },
  {
    id: 'apito',
    iconImg: 'icones/apito.svg',
    name: 'Apito',
    type: 'hands',
    mixerBg: MARACATU_THEME.apito.mixerBg,
    path: 'Apito',
    colors: buildInstrumentColors(MARACATU_THEME, 'apito'),
    color: MARACATU_THEME.apito.color
  },
  {
    id: 'puxador',
    iconImg: 'icones/micro.svg',
    name: 'Puxador',
    type: 'voice',
    mixerBg: MARACATU_THEME.puxador.mixerBg,
    path: 'internal',
    colors: buildInstrumentColors(MARACATU_THEME, 'puxador'),
    color: MARACATU_THEME.puxador.color
  },
  {
    id: 'coro',
    iconImg: 'icones/micro.svg',
    name: 'Coro',
    type: 'voice',
    mixerBg: MARACATU_THEME.coro.mixerBg,
    path: 'internal',
    colors: buildInstrumentColors(MARACATU_THEME, 'coro'),
    color: MARACATU_THEME.coro.color
  },
  {
    id: 'toada',
    iconImg: 'icones/micro.svg',
    name: 'Toada',
    type: 'voice',
    mixerBg: MARACATU_THEME.toada.mixerBg,
    path: 'internal',
    colors: buildInstrumentColors(MARACATU_THEME, 'toada'),
    color: MARACATU_THEME.toada.color
  }
];

export const NEWTON_NOTE_COLORS: Record<string, string> = {
  'C': '#a83232', // Rouge brique
  'D': '#ab5c23', // Terracotta
  'E': '#ab8f1b', // Moutarde
  'F': '#287545', // Vert forêt doux
  'G': '#1e6280', // Bleu ardoise
  'A': '#3e4d80', // Bleu indigo patiné
  'B': '#6e3b75', // Prune/Violet sourd
};

export const i18n = {
  pt: {
    loading: "Carregando vozes...",
    mixer: "🎛️ Misturador",
    legend: "Legenda",
    seqLegendTitle: "⌨️ Controles e Gestos",
    seqDesktopTitle: "Computador :",
    seqDesktopKeys: "• Espaço : Reproduzir / Pausar<br>• Ctrl+Z / Ctrl+Y : Desfazer / Refazer<br>• C / V : Copiar / Colar padrão<br>• Delete / Backspace : Limpar célula",
    seqMobileTitle: "Celular e Tablet :",
    seqMobileKeys: "• Toque curto : Abre o seletor de notas (toque fora para fechar)<br>• Arraste e solte : Escolhe a nota deslizando o dedo<br>• Timeline : Arraste a régua superior para rolar; toque no compasso para mover a reprodução",
    voiceLegendTitle: "Vozes / Coro",
    voiceLegend1: "Use as faixas separadas Puxador e Coro para distribuir o canto.",
    voiceLegend2: "Digite no formato <Nota>:<Sílaba> (ex: C4:Vou).",
    alfaiaCaixa: "🥁 Alfaia & Caixa",
    mainDroite: "Mão Direita",
    mainGauche: "Mão Esquerda",
    strokeStrongGroup: "Forte (Direita / Esquerda)",
    strokeWeakGroup: "Fraca (Direita / Esquerda)",
    legendCaixaRufadaD: "Rufada mão direita (Rufada Direita)",
    legendCaixaRufadaG: "Rufada mão esquerda (Rufada Esquerda)",
    legendCaixaCerclage: "Toque no aro",
    legendCaixaFla: "Fla",
    legendCaixaBarulho: "Barulho",
    legendTarolCerclage: "Toque no aro",
    legendTarolFla: "Fla",
    legendTarolClick: "Click (baquetas)",
    legendTarolTremer: "Barulho",
    legendAlfaiaBarulho: "Barulho",
    legendAlfaiaCerclage: "Toque no aro",
    legendAlfaiaIguarassu: "Bacalhau (iguarassu)",
    gongueLegend: "Gonguê",
    gongueGrave: "Grave Forte / Fraco",
    gongueAigu: "Agudo Forte / Fraco",
    gongueBarulho: "Barulho",
    legendGongueBord: "Toque na borda",
    agbeLegend: "Agbê",
    agbeG: "Esquerda (Forte / Fraco)",
    agbeD: "Direita (Forte / Fraco)",
    legendAgbeBarulho: "Barulho",
    legendAgbeSaut: "Salto / Lançamento",
    legendAgbeVolta: "Volta / Retorno",
    mineiroLegend: "Mineiro",
    mineiroP: "Cima (Forte / Fraco)",
    mineiroT: "Baixo (Forte / Fraco)",
    mineiroL: "Toque lateral (lado)",
    mineiroB: "Barulho",
    apitoLegend: "Apito",
    apitoLong: "Sopro longo (W)",
    apitoShort: "Sopro curto (w)",
    addInst: "adicionar",
    clear: "Criar uma roda",
    save: "Salvar",
    load: "Carregar",
    stepsNum: "Passos:",
    promptVoice: "Sílaba / Palavra (Use ':' para adicionar a nota. Ex: C4:Vou) :",
    selectInst: "Escolher um instrumento...",
    toggleBtn: "Mostrar painel",
    toggleLegendBtn: "Ocultar / Mostrar legenda",
    toggleLetrasBtn: "Ocultar / Mostrar toada",
    tsLabel: "Fórmula:",
    metroBtn: "Metrônomo",
    patterns: "Padrões",
    tutorialBtn: "Tutorial em vídeo",
    rewindBtn: "Parar e Voltar ao início",
    confirmResize: "Deseja ajustar automaticamente o número de passos de todas as faixas?",
    letrasTitle: "📝 Toada",
    extractBtn: "🔄 Extrair do mixador",
    letrasPlaceholder: "Cole a toada completa aqui (Pressione Extrair para o Karaokê)...",
    limitReached: "Limite máximo de instrumentos atingido (20)!",
    invalidFile: "Arquivo de ritmo inválido!",
    swingBtn: "Balanço",
    creditLabel: "Criado por Julian Biblocq | Arte: Toni Braga",
    metaInfo: "Informações",
    metaToada: "Nome da Toada",
    metaNacao: "Nação / Bloco",
    metaCompositor: "Compositor",
    metaRitmo: "Ritmo",
    saveLocal: "Salvar no meu catálogo",
    catPersonal: "Catálogo pessoal",
    catDefault: "Catálogo",
    promptName: "Nome da sua Toada:",
    saveFile: "Salvar arquivo (.json)",
    loadFile: "Carregar arquivo (.json)",
    wavExportTitle: "🎙️ Gravação & Exportação WAV",
    wavExportDesc: "• Clique no botão 🔴 REC para gravar a reprodução em tempo real.<br>• Clique novamente para parar e baixar um arquivo <b>.wav</b> (16-bit PCM estéreo sem perdas, compatível com iPhone e WhatsApp).",
    pwaOfflineTitle: "📶 Modo Offline (PWA)",
    pwaOfflineDesc: "• Este aplicativo funciona 100% offline para ensaios na rua.<br>• Uma vez carregado, as telas, sons e ritmos ficam guardados no aparelho mesmo sem internet.",
    feedbackBtn: "Dar sua Opinião",
    feedbackTitle: "💬 Opinião & Feedback",
    eqTitle: "EQ 3 BANDAS",
    eqLow: "LOW",
    eqMid: "MID",
    eqHigh: "HIGH",
    compTitle: "COMPRESSOR",
    compThreshold: "THRESH.",
    compRatio: "RATIO",
    expandSteps: "Mostrar passos",
    collapseSteps: "Ocultar passos"
  },
  fr: {
    loading: "Chargement des voix...",
    mixer: "🎛️ Mixeur",
    legend: "Légende",
    seqLegendTitle: "⌨️ Commandes & Gestes",
    seqDesktopTitle: "Ordinateur :",
    seqDesktopKeys: "• Espace : Lecture / Pause<br>• Ctrl+Z / Ctrl+Y : Annuler / Rétablir<br>• C / V : Copier / Colar motif<br>• Suppr / Retour arrière : Vider une case",
    seqMobileTitle: "Mobile & Tablette :",
    seqMobileKeys: "• Appui court : Ouvre le sélecteur de notes (tapez en dehors pour fermer)<br>• Glisser-déposer : Choisit la note en glissant le doigt<br>• Timeline : Glissez la règle supérieure pour faire défiler; tapez pour déplacer la tête de lecture",
    voiceLegendTitle: "Voix / Chœur",
    voiceLegend1: "Utilisez les pistes séparées Puxador et Coro pour répartir le chant.",
    voiceLegend2: "Saisissez au format <Note>:<Syllabe> (ex: C4:Vou).",
    alfaiaCaixa: "🥁 Alfaia & Caixa",
    mainDroite: "Main Droite",
    mainGauche: "Main Gauche",
    strokeStrongGroup: "Coup Fort (Droite / Gauche)",
    strokeWeakGroup: "Coup Faible (Droite / Gauche)",
    legendCaixaRufadaD: "Rufada (Roulement main droite)",
    legendCaixaRufadaG: "Rufada (Roulement main gauche)",
    legendCaixaCerclage: "Coup sur le cerclage",
    legendCaixaFla: "Fla",
    legendCaixaBarulho: "Barulho",
    legendTarolCerclage: "Coup sur le cerclage",
    legendTarolFla: "Fla",
    legendTarolClick: "Click (baguettes l'une contre l'autre)",
    legendTarolTremer: "Barulho",
    legendAlfaiaBarulho: "Barulho",
    legendAlfaiaCerclage: "Coup sur le cerclage",
    legendAlfaiaIguarassu: "Bacalhau (Coup sur le bois / Iguarassu)",
    gongueLegend: "Gonguê",
    gongueGrave: "Grave Fort / Faible",
    gongueAigu: "Aigu Fort / Faible",
    gongueBarulho: "Barulho",
    legendGongueBord: "Coup sur le bord",
    agbeLegend: "Agbê",
    agbeG: "Gauche (Fort / Faible)",
    agbeD: "Droite (Fort / Faible)",
    legendAgbeBarulho: "Barulho",
    legendAgbeSaut: "Salto (Lancer)",
    legendAgbeVolta: "Volta (Retour)",
    mineiroLegend: "Mineiro",
    mineiroP: "Haut (Fort / Faible)",
    mineiroT: "Bas (Fort / Faible)",
    mineiroL: "Coup sur le côté (lado)",
    mineiroB: "Barulho",
    apitoLegend: "Apito",
    apitoLong: "Souffle long (W)",
    apitoShort: "Souffle court (w)",
    addInst: "Ajouter",
    clear: "Créer une roda",
    save: "Sauvegarder",
    load: "Charger",
    stepsNum: "Pas:",
    promptVoice: "Syllabe / Mot (Utilisez ':' pour ajouter la note. Ex : C4:Vou) :",
    selectInst: "Choisir un instrument...",
    toggleBtn: "Afficher le panneau",
    toggleLegendBtn: "Afficher / Masquer légende",
    toggleLetrasBtn: "Afficher / Masquer la toada",
    tsLabel: "Signature:",
    metroBtn: "Métronome",
    patterns: "Motifs",
    tutorialBtn: "Tutoriel vidéo",
    rewindBtn: "Stop et Revenir au début",
    confirmResize: "Voulez-vous ajuster automatiquement le nombre de pas de toutes les pistes ?",
    letrasTitle: "📝 Toada",
    extractBtn: "🔄 Extraire du mixeur",
    letrasPlaceholder: "Collez votre Toada ici (Cliquez sur Extraire du mixeur pour le karaokê)...",
    limitReached: "Limite maximale d'instruments atteinte (20) !",
    invalidFile: "Fichier de rythme invalide !",
    swingBtn: "Swing",
    creditLabel: "Créé par Julian Biblocq | Art: Toni Braga",
    metaInfo: "Informations",
    metaToada: "Nom de la Toada",
    metaNacao: "Nação / Bloco",
    metaCompositor: "Compositeur",
    metaRitmo: "Rythme",
    saveLocal: "Sauvegarder dans mon catalogue",
    catPersonal: "Catalogue personnel",
    catDefault: "Catalogue",
    promptName: "Nom de votre Toada :",
    saveFile: "Sauvegarder fichier (.json)",
    loadFile: "Charger fichier (.json)",
    wavExportTitle: "🎙️ Enregistrement & Export WAV",
    wavExportDesc: "• Cliquez sur le bouton 🔴 REC pour enregistrer le rendu en temps réel.<br>• Cliquez de nouveau pour arrêter et télécharger un fichier <b>.wav</b> (16-bit PCM stéréo sans perte, compatible iPhone et WhatsApp).",
    pwaOfflineTitle: "📶 Mode Hors-Ligne (PWA)",
    pwaOfflineDesc: "• Cette application fonctionne à 100% hors-ligne pour vos répétitions de rue.<br>• Une fois chargée, les visuels, sons et rythmes restent accessibles sans connexion internet.",
    feedbackBtn: "Donner votre avis",
    feedbackTitle: "💬 Donner votre avis",
    eqTitle: "EQ 3 BANDES",
    eqLow: "GRAVES",
    eqMid: "MÉDIUMS",
    eqHigh: "AIGUS",
    compTitle: "COMPRESSEUR",
    compThreshold: "SEUIL",
    compRatio: "RATIO",
    expandSteps: "Déplier les pas",
    collapseSteps: "Replier les pas"
  }
};

export const vouVadiarPreset: Preset = {
  bpm: 83,
  timeSig: "4/4",
  version: 2,
  circles: [
    {
      id: 1,
      steps: 16,
      repeats: 1,
      activeSteps: ["e", "D", 0, "d", "E", 0, "D", 0, "e", "D", 0, "d", "E", 0, 0, 0],
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
      activeSteps: ["D", "D", "e", "D", "D", "e", "D", "e", "D", "D", "e", "D", "D", "e", "D", "e"],
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
      activeSteps: [0, "G", 0, 0, "G", 0, "G", 0, 0, "G", 0, 0, "G", 0, "G", 0],
      instrumentIdx: 5,
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
      activeSteps: ["E", 0, "d", "e", "D", 0, "e", "d", "E", 0, "d", "e", "D", 0, "e", "d"],
      instrumentIdx: 6,
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
      instrumentIdx: 8,
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
      instrumentIdx: 8,
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
  version: 2,
  circles: [
    {
      id: 1,
      steps: 16,
      repeats: 1,
      activeSteps: ["D", 0, 0, 0, "e", 0, "D", 0, "e", "D", 0, 0, "e", "D", 0, 0],
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
      activeSteps: ["E", 0, 0, "d", "e", 0, "D", 0, "e", "D", 0, "d", "e", "D", 0, "d"],
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
      activeSteps: ["D", "D", "e", "D", "D", "e", "D", "e", "D", "D", "e", "D", "D", "e", "D", "e"],
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
      activeSteps: ["G", 0, "A", 0, "G", 0, "A", 0, "G", "A", 0, "a", "G", 0, "A", 0],
      instrumentIdx: 5,
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
      activeSteps: ["E", 0, "d", "e", "D", 0, "e", "d", "E", 0, "d", "e", "D", 0, "e", "d"],
      instrumentIdx: 6,
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

export function isDarkText(instId: string, strokeVal: string): boolean {
  if (!strokeVal) return false;
  if (instId === 'apito' && strokeVal === 'w') return true;
  if (instId === 'gongue' && (strokeVal === 'A' || strokeVal === 'a')) return true;
  if (instId === 'agbe' && ['s', 'S', 'd', 'D', 'e', 'E', 'v', 'V'].includes(strokeVal)) return true;
  if (instId === 'caixa' && ['r', 'R', 'd', 'e', 'c', 'C'].includes(strokeVal)) return true;
  if (instId === 'timbal' && ['s', 'S', 'd', 'D', 'c', 'C'].includes(strokeVal)) return true;
  if (instId === 'mineiro' && ['t', 'p', 'L'].includes(strokeVal)) return true;
  if (instId === 'tarol' && ['c', 'C', 'd', 'e', 'F'].includes(strokeVal)) return true;
  if (['marcante', 'meiao', 'repique'].includes(instId) && ['c', 'C', 'd', 'e'].includes(strokeVal)) return true;
  return false;
}

export function getVisualStrokeSymbol(symbol: string | number, isLeftHanded: boolean, instId: string): string | number {
  if (!isLeftHanded || typeof symbol !== 'string') return symbol;
  const targetInsts = ['marcante', 'meiao', 'repique', 'caixa', 'tarol'];
  if (!targetInsts.includes(instId)) return symbol;

  if (symbol === 'D') return 'E';
  if (symbol === 'E') return 'D';
  if (symbol === 'd') return 'e';
  if (symbol === 'e') return 'd';
  if (symbol === 'R') return 'r';
  if (symbol === 'r') return 'R';
  // Removed Q and q
  return symbol;
}
