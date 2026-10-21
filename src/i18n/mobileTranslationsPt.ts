/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dicionário em português do Brasil (BR) para a interface Mobile (< 145 linhas).
 */

import { mobileTranslationsFr } from './mobileTranslationsFr';

export const mobileTranslationsPt: Record<keyof typeof mobileTranslationsFr, string> = {
  // Modos de exibição
  modePercussion: 'Modo percussão',
  modeDanse: 'Modo dança',
  modeChant: 'Modo canto (Cantador)',
  modeEditeur: 'Modo edição',
  modeComplet: 'Modo completo (Estúdio)',

  // Vocabulário comum & transporte
  repere: 'Guia',
  letra: 'Letra',
  tout: 'Tudo',
  fermer: 'Fechar',
  aucun: 'Nenhum',
  sortir: 'Sair',
  depart4T: 'Contagem 4T',
  retour: 'Voltar',
  inverser: 'Inverter',
  fermerCamera: 'Fechar câmera',

  // Modo Dança
  exitNextLap: 'Sair no próximo giro',
  voix: 'Voz',
  synth: 'Synth',
  doubleTapReset: 'Toque duplo: 0 dB',
  tempoNominal: 'Tempo nominal',

  // Modo Percussão
  monPupitre: 'Meu Naipe',
  pupitre: 'Naipe',
  baguettes: 'Baquetas',
  aoVivo: 'Ao Vivo',
  basePure: 'Base pura',
  variations: 'Variações',
  treino: 'Treino',
  printScores: 'Imprimir partituras',
  aucunPupitreSeul: 'Nenhum (Apenas meu naipe)',
  resteDuBatuque: 'Resto do Batuque',

  // Modo Edição - Scan & Sinais
  scanTab: 'Scan e Fichas em branco',
  signalTab: 'Sinais do Mestre',
  takePhoto: 'Tirar foto',
  gallery: 'Galeria',
  blankSheets: 'Fichas em branco A4',
  vigilancePoint: 'Ponto de atenção',
  injectScore: 'INJETAR NO SEQUENCIADOR →',
  injectSuccess: 'Partitura injetada com sucesso!',
  onePhoto: '1 Foto (Fixo)',
  fourBeats: '4 Tempos',
  batchPhoto: 'Lote de Fotos',
  signalName: 'Nome do sinal',
  signalNamePlaceholder: 'Nome do sinal (ex: Luanda, Virada...)',
  camera: 'Câmera',
  mirror: 'Espelho',
  lockFraming: 'Enquadramento fixo',
  photoCapture: 'CAPTURA DE FOTO',
  flipCamera: 'Trocar câmera',
  closeCamera: 'Fechar',
  triggerCapture: 'Disparar',

  // Laboratório de Foto & Sanfonas
  brightness: 'Brilho',
  sobelThreshold: 'Limiar preto',
  woodgrain: 'Veio da madeira',
  sobelContrast: 'Contornos Sobel',
  lightAndCarving: 'Luz e Nitidez da Gravura',
  framingHands: 'Enquadramento das Mãos',
  positionX: 'Posição X',
  positionY: 'Posição Y',
  zoom: 'Zoom',
  resetFilters: 'Redefinir',
  overrideFrame: 'Personalizar quadro',
  frameOverridden: 'Quadro personalizado',

  // Salvamento & Galeria de Sinais
  saveSignal: 'Salvar sinal',
  saveDraft: 'Salvar em rascunho',
  savedOffline: 'Salvo offline (sinc. auto)',
  signalGallery: 'Galeria de Sinais',
  editSignal: 'Editar',
  copyStyle: 'Copiar estilo',
  updateSignal: 'Atualizar sinal',
  newSignal: 'Novo sinal',
  styleApplied: 'Estilo aplicado!',

  // Badges da Roda
  mesure: 'Compasso',
  rythme: 'Ritmo',
  volume: 'Volume',
  tempo: 'Tempo',
  creePar: 'Criado por Julian Biblocq',
  artPar: 'Arte: Toni Braga',

  // Menu lateral & Ajustes
  toolsMenu: 'Menu e Ajustes',
  viewMode: 'Modo de visualização',
  masterEQ: 'Equalização Master',
  speaker: 'Caixa USB / BT',
  room: 'Sala / Estúdio',
  headphones: 'Fones de Ouvido',
  danceFocus: 'Foco Dança e Canto',
  lockTouch: 'Bloquear tela tátil',
  themeLight: 'Tema Claro',
  themeDark: 'Tema Escuro',
  studioMode: 'Modo Estúdio Completo',

  // Modal de impressão de partituras
  scorePreview: 'Pré-visualização da Partitura',
  myPupitreOnly: 'Apenas meu naipe',
  fullScoreAll: 'Partitura completa (Todos)',
  printPdf: 'Imprimir / PDF',
};
