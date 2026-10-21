/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dicionário em português do Brasil (BR) para a Oficina de Papel Cordel (< 140 linhas).
 */

import { paperWorkshopTranslationsFr } from './paperWorkshopTranslationsFr';

export const paperWorkshopTranslationsPt: Record<keyof typeof paperWorkshopTranslationsFr, string> = {
  // Título e Abas
  workshopTitle: 'Grande Oficina de Papel Cordel',
  tabSheets: 'Imprimir Folhas & Legenda',
  tabScanner: 'Scanner & Montar',
  tabReserve: 'Reserva JSON Mestre',

  // Seção 1 : Tipos de folhas
  step1Type: '1. Tipo de Folha em Branco',
  sheetA: 'Folha A — Padrões Isolados',
  sheetB: 'Folha B — Multi-Instrumentos',
  sheetC: 'Folha C — Regência / Sequência',
  sheetD: 'Folha D — 100% em Branco',

  // Opções Folha D Universal
  optionsUniversal: 'Opções da Folha Universal (Tudo à mão) :',
  formatCarreaux: 'Formato dos quadros :',
  freePortrait24: '24 quadros (Retrato)',
  freeLandscape32: '32 quadros (Paisagem)',
  descUniversal: 'Quadros livres grandes com caixas de margem [____], caixas [×__] e 2 linhas de sequência na base.',

  // Opções Folha C Condutor
  optionsConductor: 'Opções do Condutor (Folha C) :',
  songTitlePlaceholder: 'Título da Música',
  doubleLineSections: 'Linha dupla Seções',
  toadaLine: 'Linha Toada / Canto',

  // Grelha e Seletor de Naipes
  step2GridMode: '2. Modo da Grelha (16 passos)',
  linkAlfaias: 'Vincular Alfaias',
  busCaixas: 'Bus Caixas',
  busSementes: 'Bus Sementes',
  includeVarLine: 'Linha Variação (↳ Me/Rp)',
  freeLines: 'Linhas livres em branco',
  pupitreLegendHint: 'Vermelho = impresso • Pergaminho = não impresso',

  // Botões de impressão e navegação
  printSheet: 'Imprimir Folha',
  readLegend: 'Ler Legenda',
  legendA4: 'Legenda Completa A4',

  // Pré-visualização Direta A4
  directPreviewA4: 'Pré-visualização Direta A4 (Página Inteira)',
  previewMorceauPlaceholder: 'Música / Toada : _________',
  previewSection: 'SEÇÃO',
  previewSequence: 'Sequência :',
  previewToada: 'Toada :',
  previewMemo: 'MEMO : [D/d] Dir  [E/e] Esq  [G/A] Gonguê  [P/T] Mineiro  [||] Fim',

  // Modal Legenda In-App
  legendModalTitle: 'Legenda de Escrita Papel',
  wakeLockActive: 'Tela sempre ativa',
  tabStrokes: '1. Toques & Naipes',
  tabRules: '2. Casas & Sequência',
  printPdfA4: 'PDF A4',
  rulesConventionsTitle: '1. Convenções de Casas & Variações (↳)',
  rulesSyntaxTitle: '2. Sintaxe do Condutor & Toada',
};
