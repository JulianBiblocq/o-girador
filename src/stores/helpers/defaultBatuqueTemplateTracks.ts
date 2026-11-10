import { WorkspaceTemplateTrack } from '../../types/workspaceTemplate.types';
import { StudioMasterAmbianceId } from '../../audio/effects/studioMasterAmbiances';

export const DEFAULT_RODA_TRACK_IDS = [
  1792863601156, 1792863601157, 1792863601158, 1792863601159,
  1792863601196, 1792863601166, 1792863601167, 1792863601168,
  1792954342565, 1792863601177, 1783252010573, 1792954342601,
];

export function buildDefaultBatuqueTracks(mode: StudioMasterAmbianceId): WorkspaceTemplateTrack[] {
  const isStreet = mode === 'street_parade';
  const isStage = mode === 'grand_stage';

  const alfaiaBusRev = isStage ? 34 : isStreet ? 18 : 26;
  const caixaBusRev = isStage ? 58 : isStreet ? 32 : 44;
  const caixaBusDist = isStreet ? 48 : isStage ? 38 : 34;
  const gongueRev = isStage ? 54 : isStreet ? 28 : 40;
  const sementesRev = isStage ? 52 : isStreet ? 26 : 38;

  return [
    {
      id: 1792863601156, instrumentIdx: 0, customName: 'ALFAIAS', isBusFolder: true, isLinkFolder: true,
      volumeVal: isStage ? 78 : 74, pan: 0, panVal: 0,
      eqBands: { low: { f: 85, g: isStage ? 3 : 2 }, mid: { f: 2150, g: 4, q: 'wide' }, high: { f: 8000, g: -2 } },
      lowCut: false, reverbVal: alfaiaBusRev, fxSends: { reverb: alfaiaBusRev, distortion: 0 },
    },
    {
      id: 1792863601157, instrumentIdx: 0, customName: 'Marcante (alfaia)', isBusFolder: false, isLinkFolder: false, isLinkMaster: true,
      busId: '1792863601156', linkedToTrackId: '1792863601156', volumeVal: 72, pan: 0, panVal: 0,
      eqBands: { low: { f: 95, g: 5 }, mid: { f: 2250, g: 4, q: 'wide' }, high: { f: 6700, g: -3 } },
      lowCut: false, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1792863601158, instrumentIdx: 1, customName: 'Meião (alfaia)', isBusFolder: false, isLinkFolder: false, isLinkMaster: false,
      busId: '1792863601156', linkedToTrackId: '1792863601156', volumeVal: 65, pan: isStage ? -55 : -42, panVal: isStage ? -55 : -42,
      eqBands: { low: { f: 140, g: 5 }, mid: { f: 2150, g: 6, q: 'wide' }, high: { f: 8000, g: -5 } },
      lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1792863601159, instrumentIdx: 2, customName: 'Repique (alfaia)', isBusFolder: false, isLinkFolder: false, isLinkMaster: false,
      busId: '1792863601156', linkedToTrackId: '1792863601156', volumeVal: 69, pan: isStage ? 50 : 38, panVal: isStage ? 50 : 38,
      eqBands: { low: { f: 185, g: 3 }, mid: { f: 2150, g: 5, q: 'wide' }, high: { f: 8000, g: -4 } },
      lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1792863601196, instrumentIdx: 5, customName: 'Gonguê',
      volumeVal: isStreet ? 71 : 67, pan: 22, panVal: 22,
      eqBands: { low: { f: 185, g: 2 }, mid: { f: 3800, g: isStreet ? 3 : 1, q: 'wide' }, high: { f: 7300, g: 2 } },
      lowCut: true, reverbVal: gongueRev, fxSends: { reverb: gongueRev, distortion: isStreet ? 45 : 32 },
    },
    {
      id: 1792863601166, instrumentIdx: 3, customName: 'CAIXAS', isBusFolder: true, isLinkFolder: true,
      volumeVal: isStreet ? 66 : 60, pan: 0, panVal: 0,
      lowCut: true, reverbVal: caixaBusRev, fxSends: { reverb: caixaBusRev, distortion: caixaBusDist },
    },
    {
      id: 1792863601167, instrumentIdx: 3, customName: 'Caixa', isBusFolder: false, isLinkFolder: false, isLinkMaster: true,
      busId: '1792863601166', linkedToTrackId: '1792863601166', volumeVal: 66, pan: isStage ? -85 : -65, panVal: isStage ? -85 : -65,
      eqBands: { low: { f: 180, g: 6 }, mid: { f: 900, g: -2, q: 'wide' }, high: { f: 10500, g: 3 } },
      lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1792863601168, instrumentIdx: 4, customName: 'Tarol', isBusFolder: false, isLinkFolder: false, isLinkMaster: false,
      busId: '1792863601166', linkedToTrackId: '1792863601166', volumeVal: 70, pan: isStage ? 85 : 65, panVal: isStage ? 85 : 65,
      eqBands: { low: { f: 200, g: -3 }, mid: { f: 1200, g: -2, q: 'wide' }, high: { f: 9200, g: 4 } },
      lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1792954342565, instrumentIdx: 6, customName: 'Sementes', isBusFolder: true,
      volumeVal: 54, pan: 0, panVal: 0,
      lowCut: true, reverbVal: sementesRev, fxSends: { reverb: sementesRev, distortion: 24 },
    },
    {
      id: 1792863601177, instrumentIdx: 6, customName: 'Agbê', busId: '1792954342565',
      volumeVal: 67, pan: isStage ? -72 : -55, panVal: isStage ? -72 : -55,
      eqBands: { low: { f: 250, g: 4 }, mid: { f: 3300, g: 3, q: 'wide' }, high: { f: 11000, g: 4 } },
      lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1783252010573, instrumentIdx: 7, customName: 'Mineiro', busId: '1792954342565',
      volumeVal: 64, pan: isStage ? 68 : 52, panVal: isStage ? 68 : 52,
      eqBands: { low: { f: 180, g: -4 }, mid: { f: 2400, g: 2, q: 'wide' }, high: { f: 9500, g: 3 } },
      lowCut: true, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
    {
      id: 1792954342601, instrumentIdx: 9, customName: 'Voz (Toada)',
      volumeVal: 72, pan: 0, panVal: 0, lowCut: false, reverbVal: 0, fxSends: { reverb: 0, distortion: 0 },
    },
  ];
}

