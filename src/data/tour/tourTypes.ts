export type TourTrackId = 'practice' | 'studio';

export interface TourStepDef {
  id: string;
  targetTourId: string;
  fallbackTourIds?: string[];
  badgeFr: string;
  badgePt: string;
  titleFr: string;
  titlePt: string;
  bodyFr: string;
  bodyPt: string;
  prepare?: () => void;
}
