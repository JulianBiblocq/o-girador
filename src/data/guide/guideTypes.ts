export type GuidePoleId = 'panorama' | 'pole-1' | 'pole-2' | 'pole-3' | 'pole-4' | 'pole-5';

export interface GuideActionCard {
  id: string;
  poleId: Exclude<GuidePoleId, 'panorama'>;
  level: 'practice' | 'studio';
  imageSrc?: string;
  shortcut?: string;
  titleFr: string;
  titlePt: string;
  goalFr: string;
  goalPt: string;
  contextFr: string;
  contextPt: string;
  stepsFr: string[];
  stepsPt: string[];
  tipFr: string;
  tipPt: string;
}

export interface GuidePanoramaAppBridge {
  appName: string;
  roleFr: string;
  rolePt: string;
  bridgeFr: string;
  bridgePt: string;
}

export interface GuidePanoramaTrack {
  badgeFr: string;
  badgePt: string;
  titleFr: string;
  titlePt: string;
  pointsFr: string[];
  pointsPt: string[];
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
