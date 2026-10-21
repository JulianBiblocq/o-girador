import React from 'react';
import {
  AlfaiaCordelIcon, CaixaCordelIcon, GongueCordelIcon, AgbeCordelIcon,
  MineiroCordelIcon, TimbalCordelIcon
} from './LandingCordelIcons';

export interface InstrumentStrokeInfo {
  symbol: string;
  labelFr: string;
  labelPt: string;
  file: string;
}

export interface BateriaInstrumentDef {
  id: string;
  name: string;
  Icon: React.FC;
  strokes: InstrumentStrokeInfo[];
}

export const BATERIA_INSTRUMENTS_DATA: BateriaInstrumentDef[] = [
  {
    id: 'marcante',
    name: 'Alfaia',
    Icon: AlfaiaCordelIcon,
    strokes: [
      { symbol: 'D', labelFr: 'Main forte', labelPt: 'Toque forte', file: '/Mixdown/Alfaia meiao F 1.ogg' },
      { symbol: 'I', labelFr: 'Baguette Igaraçu', labelPt: 'Bacalhau Igaraçu', file: '/Mixdown/Alfaia meiao I 1.ogg' },
      { symbol: 'd', labelFr: 'Coup faible', labelPt: 'Toque fraco', file: '/Mixdown/Alfaia meiao faible 1.ogg' },
    ],
  },
  {
    id: 'caixa',
    name: 'Caixa',
    Icon: CaixaCordelIcon,
    strokes: [
      { symbol: 'D', labelFr: 'Coup fort', labelPt: 'Toque forte', file: '/Mixdown/Caixa F 1.ogg' },
      { symbol: 'F', labelFr: 'Fla', labelPt: 'Fla', file: '/Mixdown/Caixa Fla 1.ogg' },
      { symbol: 'R', labelFr: 'Roulement', labelPt: 'Rufada', file: '/Mixdown/Caixa R 1.ogg' },
    ],
  },
  {
    id: 'gongue',
    name: 'Gonguê',
    Icon: GongueCordelIcon,
    strokes: [
      { symbol: 'G', labelFr: 'Grave (corps)', labelPt: 'Grave (corpo)', file: '/Mixdown/Gongue G 1.ogg' },
      { symbol: 'A', labelFr: 'Aigu (bouche)', labelPt: 'Agudo (boca)', file: '/Mixdown/Gongue A 1.ogg' },
      { symbol: 'a', labelFr: 'Aigu faible', labelPt: 'Agudo fraco', file: '/Mixdown/Gongue f a 1.ogg' },
    ],
  },
  {
    id: 'agbe',
    name: 'Agbê',
    Icon: AgbeCordelIcon,
    strokes: [
      { symbol: 'E', labelFr: 'Frappe gauche', labelPt: 'Batida esquerda', file: '/Mixdown/Agbe F E 1.ogg' },
      { symbol: 'D', labelFr: 'Frappe droite', labelPt: 'Batida direita', file: '/Mixdown/Agbe F D 1.ogg' },
      { symbol: 'd', labelFr: 'Toucher faible', labelPt: 'Toque fraco', file: '/Mixdown/Agbe f 1.ogg' },
    ],
  },
  {
    id: 'mineiro',
    name: 'Mineiro',
    Icon: MineiroCordelIcon,
    strokes: [
      { symbol: 'P', labelFr: 'Pousser fort', labelPt: 'Ida forte', file: '/Mixdown/Mineiro F P 1.ogg' },
      { symbol: 'T', labelFr: 'Tirer fort', labelPt: 'Volta forte', file: '/Mixdown/Mineiro F T 1.ogg' },
      { symbol: 'p', labelFr: 'Secousse faible', labelPt: 'Toque fraco', file: '/Mixdown/Mineiro f 1.ogg' },
    ],
  },
  {
    id: 'timbal',
    name: 'Timbal',
    Icon: TimbalCordelIcon,
    strokes: [
      { symbol: 'A', labelFr: 'Ouvert (aberto)', labelPt: 'Aberto', file: '/Mixdown/Timbal A 1.ogg' },
      { symbol: 'G', labelFr: 'Basse (baixo)', labelPt: 'Baixo', file: '/Mixdown/Timbal G 1.ogg' },
      { symbol: 'P', labelFr: 'Tonique (preso)', labelPt: 'Preso', file: '/Mixdown/Timbal P 1.ogg' },
      { symbol: 'S', labelFr: 'Claqué (slap)', labelPt: 'Slap', file: '/Mixdown/Timbal S 1.ogg' },
    ],
  },
];

import { getRawAudioContext } from '../../audio/audioContextSuspendManager';

export const ALL_LANDING_SAMPLES = BATERIA_INSTRUMENTS_DATA.flatMap(inst =>
  inst.strokes.map(s => ({ id: inst.id, symbol: s.symbol, file: s.file }))
);

export const decodedAudioBuffers = new Map<string, AudioBuffer>();

export function getLandingAudioContext(): AudioContext | null {
  return getRawAudioContext();
}

export function preloadLandingSamples() {
  try {
    const ctx = getLandingAudioContext();
    if (!ctx) return;
    ALL_LANDING_SAMPLES.forEach(async ({ id, symbol, file }) => {
      const bufferKey = `${id}_${symbol}`;
      if (decodedAudioBuffers.has(bufferKey)) return;
      try {
        const resp = await fetch(file);
        if (!resp.ok) return;
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        decodedAudioBuffers.set(bufferKey, audioBuffer);
        if (!decodedAudioBuffers.has(id)) decodedAudioBuffers.set(id, audioBuffer);
      } catch (_) {}
    });
  } catch (_) {}
}
