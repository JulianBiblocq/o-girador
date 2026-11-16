export type GuidePoleId = 'pole-1' | 'pole-2' | 'pole-3' | 'pole-4' | 'pole-5';

export interface GuideActionCard {
  id: string;
  poleId: GuidePoleId;
  level: 'practice' | 'studio';
  screenshotWebp: string;
  shortcut?: string;
  titleFr: string;
  titlePt: string;
  goalFr: string;
  goalPt: string;
  stepsFr: [string, string, string];
  stepsPt: [string, string, string];
  tipFr: string;
  tipPt: string;
}

export interface GuidePoleDef {
  id: GuidePoleId;
  num: string;
  titleFr: string;
  titlePt: string;
  subtitleFr: string;
  subtitlePt: string;
  cards: GuideActionCard[];
}
