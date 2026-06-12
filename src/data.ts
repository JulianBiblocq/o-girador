/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentConfig, Preset, TimeSignature } from './types';

export const ASSETS_BASE_URL = (import.meta as any).env.BASE_URL;

export const instrumentsConfig: InstrumentConfig[] = [
  {
    id: 'marcante',
    iconImg: 'icones/alfaia.svg',
    name: 'Alfaia Marcante',
    type: 'hands',
    mixerBg: '#3a1010',
    path: 'Alfaia/Marcante',
    colors: { 'd': '#632b2b', 'D': '#8a2b2b', 'e': '#b55a5a', 'E': '#c74c4c', 't': '#4c1c1c', 'x': '#8c7b7b', 'i': '#ff8da1', 'c': '#a89f91', 'C': '#a89f91', text: '#f4ecd8' }
  },
  {
    id: 'meiao',
    iconImg: 'icones/alfaia.svg',
    name: 'Alfaia Meião',
    type: 'hands',
    mixerBg: '#3a2010',
    path: 'Alfaia/Meiao',
    colors: { 'd': '#8c502b', 'D': '#ab5318', 'e': '#c79c3e', 'E': '#c98124', 't': '#4c2c16', 'x': '#9c8476', 'i': '#ffb74d', 'c': '#a89f91', 'C': '#a89f91', text: '#f4ecd8' }
  },
  {
    id: 'repique',
    iconImg: 'icones/alfaia.svg',
    name: 'Alfaia Repique',
    type: 'hands',
    mixerBg: '#3a3010',
    path: 'Alfaia/Repique',
    colors: { 'd': '#947f2b', 'D': '#c9a724', 'e': '#d4cca1', 'E': '#d4c492', 't': '#4d441c', 'x': '#9c9984', 'i': '#fff59d', 'c': '#a89f91', 'C': '#a89f91', text: '#1a1a1a' }
  },
  {
    id: 'caixa',
    iconImg: 'icones/caixa.svg',
    name: 'Caixa',
    type: 'hands',
    mixerBg: '#2a103a',
    path: 'Caixa',
    colors: { 'd': '#3f255e', 'D': '#4c267a', 'e': '#925c9c', 'E': '#7a3187', 'rd': '#a855f7', 're': '#d8b4fe', 'x': '#7e7b8c', 'f': '#d946ef', 't': '#4a044e', text: '#f4ecd8' }
  },
  {
    id: 'tarol',
    iconImg: 'icones/caixa.svg',
    name: 'Tarol',
    type: 'hands',
    mixerBg: '#102a3a',
    path: 'Tarol',
    colors: { 'd': '#3b82f6', 'D': '#1e3a8a', 'e': '#93c5fd', 'E': '#2563eb', 'X': '#3a506b', 'F': '#60a5fa', 'C': '#bfdbfe', 'T': '#059669', text: '#f4ecd8' }
  },
  {
    id: 'gongue',
    iconImg: 'icones/gongue.svg',
    name: 'Gonguê',
    type: 'gongue',
    mixerBg: '#1a1a1a',
    path: 'Gongue',
    colors: { 'grv': '#444444', 'GRV': '#222222', 'aig': '#7f8c8d', 'AIG': '#bdc3c7', 't': '#6d4c41', text: '#f4ecd8' }
  },
  {
    id: 'agbe',
    iconImg: 'icones/agbe.svg',
    name: 'Agbê',
    type: 'shake',
    mixerBg: '#103a20',
    path: 'Agbe',
    colors: { 'e': '#22c55e', 'E': '#15803d', 'd': '#86efac', 'D': '#4ade80', 's': '#dcfce7', 't': '#052e16', text: '#f4ecd8' }
  },
  {
    id: 'mineiro',
    iconImg: 'icones/mineiro.svg',
    name: 'Mineiro',
    type: 'shake',
    mixerBg: '#3a1a10',
    path: 'Mineiro',
    colors: { 'p': '#ea580c', 'P': '#c2410c', 't': '#fdba74', 'T': '#f97316', text: '#f4ecd8' }
  },
  {
    id: 'voice',
    iconImg: 'icones/micro.svg',
    name: 'Vocal / Toada',
    type: 'voice',
    mixerBg: '#114a4a',
    path: 'internal',
    colors: { 'C': '#449c9c', 'P': '#c4864b', text: '#f4ecd8' }
  }
];

export const i18n = {
  pt: {
    loading: "Carregando vozes...",
    mixer: "🎛️ Misturador",
    legend: "📖 Legenda",
    seqLegendTitle: "⌨️ Controles e Gestos",
    seqDesktopTitle: "Computador :",
    seqDesktopKeys: "• Espaço / Setas : Avançar / Navegar<br>• C / V (ou botões) : Copiar / Colar padrão<br>• Delete / Backspace : Limpar célula",
    seqMobileTitle: "Celular e Tablet :",
    seqMobileKeys: "• Toque curto : Abre o seletor de notas (toque fora para fechar)<br>• Arraste e solte : Escolhe a nota deslizando o dedo<br>• Timeline : Arraste a régua superior para rolar; toque no compasso para mover a reprodução",
    voiceLegendTitle: "🎤 Vozes / Coro",
    voiceLegend1: "Clique no topo da caixa (PUX/CORO) para alterar quem canta.",
    voiceLegend2: "Puxador: Laranja (Agudo). Coro: Ciano (Grave).",
    goldRule: "💡 Regra de ouro:<br>• Maiúscula = Golpe Forte<br>• Minúscula = Golpe Fraco",
    alfaiaCaixa: "🥁 Alfaia & Caixa",
    mainDroite: "Mão Direita",
    mainGauche: "Mão Esquerda",
    legendCaixaRufadaD: "Rufada mão direita (Rufada Direita)",
    legendCaixaRufadaG: "Rufada mão esquerda (Rufada Esquerda)",
    legendCaixaCerclage: "Toque no aro",
    legendCaixaFla: "Fla",
    legendCaixaBarulho: "Tremor",
    legendTarolCerclage: "Toque no aro",
    legendTarolFla: "Fla",
    legendTarolClick: "Click",
    legendTarolTremer: "Trêmulo",
    legendAlfaiaBarulho: "Tremor",
    legendAlfaiaCerclage: "Toque no aro (cerclage)",
    legendAlfaiaIguarassu: "Bacalhau (iguarassu)",
    gongueLegend: "🔔 Gonguê",
    gongueGrave: "Grave Forte / Fraco",
    gongueAigu: "Agudo Forte / Fraco",
    gongueBarulho: "Tremor",
    agbeLegend: "🌾 Agbê",
    agbeG: "Esquerda (Forte / Fraco)",
    agbeD: "Direita (Forte / Fraco)",
    legendAgbeBarulho: "Tremor",
    legendAgbeSaut: "Salto / Lançamento (saut)",
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
    swingBtn: "Swing",
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
    feedbackBtn: "Feedback & Fórum",
    feedbackTitle: "💬 Contato & Feedback"
  },
  fr: {
    loading: "Chargement des voix...",
    mixer: "🎛️ Mixeur",
    legend: "📖 Légende",
    seqLegendTitle: "⌨️ Commandes & Gestes",
    seqDesktopTitle: "Ordinateur :",
    seqDesktopKeys: "• Espace / Flèches : Avancer / Naviguer<br>• C / V (ou boutons) : Copier / Coller motif<br>• Suppr / Retour arrière : Vider une case",
    seqMobileTitle: "Mobile & Tablette :",
    seqMobileKeys: "• Appui court : Ouvre le sélecteur de notes (tapez en dehors pour fermer)<br>• Glisser-déposer : Choisit la note en glissant le doigt<br>• Timeline : Glissez la règle supérieure pour faire défiler; tapez pour déplacer la tête de lecture",
    voiceLegendTitle: "🎤 Voix / Chœur",
    voiceLegend1: "Cliquez en haut de la case (PUX/CORO) pour changer qui chante.",
    voiceLegend2: "Puxador: Orange (Aigu). Chœur: Cyan (Grave).",
    goldRule: "💡 Règle d'or :<br>• Majuscule = Coup Fort<br>• Minusc. = Coup Faible",
    alfaiaCaixa: "🥁 Alfaia & Caixa",
    mainDroite: "Main Droite",
    mainGauche: "Main Gauche",
    legendCaixaRufadaD: "Roulement main droite (Rufada Direita)",
    legendCaixaRufadaG: "Roulement main gauche (Rufada Esquerda)",
    legendCaixaCerclage: "Coup sur le cerclage",
    legendCaixaFla: "Fla",
    legendCaixaBarulho: "Tremblement",
    legendTarolCerclage: "Coup sur le cerclage",
    legendTarolFla: "Fla",
    legendTarolClick: "Click",
    legendTarolTremer: "Trémolo",
    legendAlfaiaBarulho: "Tremblement",
    legendAlfaiaCerclage: "Coup sur le cerclage",
    legendAlfaiaIguarassu: "Bacalhau (iguarassu)",
    gongueLegend: "🔔 Gonguê",
    gongueGrave: "Grave Fort / Faible",
    gongueAigu: "Aigu Fort / Faible",
    gongueBarulho: "Tremblement",
    agbeLegend: "🌾 Agbê",
    agbeG: "Gauche (Fort / Faible)",
    agbeD: "Droite (Fort / Faible)",
    legendAgbeBarulho: "Tremblement",
    legendAgbeSaut: "Saut / Lancer (saut)",
    mineiroLegend: "🌾 Mineiro",
    mineiroP: "Haut (Fort / Faible)",
    mineiroT: "Bas (Fort / Faible)",
    addInst: "Ajouter",
    clear: "Vider la Roda",
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
    feedbackBtn: "Feedback & Forum",
    feedbackTitle: "💬 Contact & Forum"
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
      activeSteps: [0, "GRV", 0, 0, "GRV", 0, "GRV", 0, 0, "GRV", 0, 0, "GRV", 0, "GRV", 0],
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
      activeSteps: ["GRV", 0, "AIG", 0, "GRV", 0, "AIG", 0, "GRV", "AIG", 0, "aig", "GRV", 0, "AIG", 0],
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
  if (instId === 'gongue' && (strokeVal === 'AIG' || strokeVal === 'aig')) return true;
  if (instId === 'agbe' && ['s', 'S', 'd', 'D', 'e', 'E'].includes(strokeVal)) return true;
  if (instId === 'caixa' && ['rg', 'Re', 're'].includes(strokeVal)) return true;
  if (instId === 'mineiro' && strokeVal === 't') return true;
  if (instId === 'tarol' && ['C', 'e', 'F'].includes(strokeVal)) return true;
  if (['marcante', 'meiao', 'repique'].includes(instId) && ['c', 'C'].includes(strokeVal)) return true;
  return false;
}
