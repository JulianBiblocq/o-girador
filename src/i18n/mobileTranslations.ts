/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dictionnaire centralisé des traductions Mobile (FR / BR) < 140 lignes.
 */

export const MOBILE_I18N = {
  fr: {
    // Modes
    modePercussion: 'Mode percussion',
    modeDanse: 'Mode danse',
    modeChant: 'Mode chant (Cantador)',
    modeEditeur: 'Mode édition',
    modeComplet: 'Mode complet (Studio)',
    // Commun
    repere: 'Repère',
    letra: 'Letra',
    tout: 'Tout',
    fermer: 'Fermer',
    aucun: 'Aucun',
    sortir: 'Sortir',
    depart4T: 'Départ 4T',
    // Mode Danse
    exitNextLap: 'Sortir au prochain tour',
    voix: 'Voix',
    synth: 'Synth',
    doubleTapReset: 'Double-tap : 0 dB',
    // Mode Percussion
    pupitre: 'Pupitre',
    baguettes: 'Baguettes',
    basePure: 'Base pure',
    variations: 'Variations',
    treino: 'Treino',
    printScores: 'Imprimer les partitions',
    // Mode Édition
    scanTab: 'Scan & Fiches vierges',
    signalTab: 'Signes du Mestre',
    takePhoto: 'Prendre photo',
    gallery: 'Galerie',
    blankSheets: 'Fiches vierges A4',
    vigilancePoint: 'Point de vigilance',
    injectScore: 'Injecter dans le séquenceur',
    onePhoto: '1 Photo (Fixe)',
    fourBeats: '4 Temps',
    batchPhoto: 'Lot Photos',
    signalName: 'Nom du signe',
    camera: 'Caméra',
    mirror: 'Miroir',
    lockFraming: 'Cadrage fixe',
    brightness: 'Luminosité',
    sobelThreshold: 'Seuil Noir',
    woodgrain: 'Grain bois',
    saveSignal: 'Enregistrer le signe',
    saveDraft: 'Sauver en chantier',
    savedOffline: 'Sauvegardé hors-ligne (synchro auto)',
    // Menu
    toolsMenu: 'Menu Outils & Réglages',
    masterEQ: 'Égalisation Master',
    speaker: 'Enceinte USB / BT',
    room: 'Salle / Studio',
    headphones: 'Casque',
    danceFocus: 'Focus Danse & Chant',
    lockTouch: "Verrouiller l'écran tactile",
    themeLight: 'Thème Clair',
    themeDark: 'Thème Sombre',
    viewMode: 'Mode d’affichage',
  },
  pt: {
    // Modes
    modePercussion: 'Modo percussão',
    modeDanse: 'Modo dança',
    modeChant: 'Modo canto (Cantador)',
    modeEditeur: 'Modo edição',
    modeComplet: 'Modo completo (Estúdio)',
    // Commun
    repere: 'Guia',
    letra: 'Letra',
    tout: 'Tudo',
    fermer: 'Fechar',
    aucun: 'Nenhum',
    sortir: 'Sair',
    depart4T: 'Contagem 4T',
    // Mode Danse
    exitNextLap: 'Sair no próximo giro',
    voix: 'Voz',
    synth: 'Synth',
    doubleTapReset: 'Toque duplo: 0 dB',
    // Mode Percussion
    pupitre: 'Naipe',
    baguettes: 'Baquetas',
    basePure: 'Base pura',
    variations: 'Variações',
    treino: 'Treino',
    printScores: 'Imprimir partituras',
    // Mode Édition
    scanTab: 'Scan e Fichas em branco',
    signalTab: 'Sinais do Mestre',
    takePhoto: 'Tirar foto',
    gallery: 'Galeria',
    blankSheets: 'Fichas em branco A4',
    vigilancePoint: 'Ponto de atenção',
    injectScore: 'Injetar no sequenciador',
    onePhoto: '1 Foto (Fixo)',
    fourBeats: '4 Tempos',
    batchPhoto: 'Lote de Fotos',
    signalName: 'Nome do sinal',
    camera: 'Câmera',
    mirror: 'Espelho',
    lockFraming: 'Enquadramento fixo',
    brightness: 'Brilho',
    sobelThreshold: 'Limiar preto',
    woodgrain: 'Veio da madeira',
    saveSignal: 'Salvar sinal',
    saveDraft: 'Salvar em rascunho',
    savedOffline: 'Salvo offline (sinc. auto)',
    // Menu
    toolsMenu: 'Menu e Ajustes',
    masterEQ: 'Equalização Master',
    speaker: 'Caixa USB / BT',
    room: 'Sala / Estúdio',
    headphones: 'Fones',
    danceFocus: 'Foco Dança e Canto',
    lockTouch: 'Bloquear tela tátil',
    themeLight: 'Tema Claro',
    themeDark: 'Tema Escuro',
    viewMode: 'Modo de visualização',
  },
} as const;

export type MobileI18nKey = keyof typeof MOBILE_I18N['fr'];

export function tMobile(lang: 'fr' | 'pt' | undefined, key: MobileI18nKey): string {
  const currentLang = lang === 'fr' ? 'fr' : 'pt';
  return MOBILE_I18N[currentLang][key] || MOBILE_I18N.pt[key] || key;
}
