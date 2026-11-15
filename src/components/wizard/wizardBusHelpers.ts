import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';
import { allocWizardId, clonePatternsForLinkFolder } from './wizardPatternBuilder';

export { createToadaBusAndTracks } from './wizardToadaBus';

export function linkSameRoleDuplicates(tracks: TrackGroup[], roleId: string): void {
  const sameRole = tracks.filter((t) => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === roleId);
  if (sameRole.length < 2) return;

  const master = sameRole[0];
  master.isLinkMaster = true;
  master.linkedToTrackId = undefined;
  master.isHidden = false;
  master.isSequencerFolded = true;

  sameRole.slice(1).forEach((slave) => {
    slave.isLinkMaster = false;
    slave.linkedToTrackId = String(master.id);
    slave.isHidden = true;
    slave.patternOverrides = {};
  });
}

export function buildCaixasGroup(caixasTracks: TrackGroup[], lang: Language): TrackGroup[] {
  if (caixasTracks.length === 0) return [];

  const caixaIdx = instrumentsConfig.findIndex((c) => c.id === 'caixa');
  const busId = allocWizardId();
  const customName = lang === 'pt' ? 'Seção Caixas' : 'Section Caixas';
  const master =
    caixasTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'caixa') || caixasTracks[0];

  if (caixasTracks.length >= 2) {
    const busPatterns = clonePatternsForLinkFolder(master.patterns);
    const linkBus: TrackGroup = {
      id: busId,
      instrumentIdx: caixaIdx !== -1 ? caixaIdx : master.instrumentIdx,
      patterns: busPatterns,
      isMute: false,
      isSolo: false,
      isHidden: false,
      volumeVal: 75,
      selectedPatternId: busPatterns[0]?.id || 0,
      isBusFolder: true,
      isLinkFolder: true,
      isFolded: false,
      isSequencerFolded: true,
      customName,
      reverbVal: 0,
      panVal: 0,
      pan: 0,
      fxSends: { reverb: 0, distortion: 0 },
    };

    const children = caixasTracks.map((tr) => {
      const isMaster = tr.id === master.id;
      return {
        ...tr,
        busId: String(busId),
        linkedToTrackId: String(busId),
        isLinkMaster: isMaster,
        isHidden: !isMaster,
        patternOverrides: isMaster ? tr.patternOverrides : {},
      };
    });

    return [linkBus, children.find((c) => c.isLinkMaster)!, ...children.filter((c) => !c.isLinkMaster)];
  }

  const singleBus: TrackGroup = {
    id: busId,
    instrumentIdx: caixaIdx !== -1 ? caixaIdx : master.instrumentIdx,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    isBusFolder: true,
    isLinkFolder: false,
    isFolded: false,
    isSequencerFolded: false,
    customName,
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  return [singleBus, { ...master, busId: String(busId), isHidden: false }];
}

export function buildSementesGroup(sementesTracks: TrackGroup[]): TrackGroup[] {
  if (sementesTracks.length === 0) return [];

  const agbeIdx = instrumentsConfig.findIndex((c) => c.id === 'agbe');
  const busId = allocWizardId();
  const busTrack: TrackGroup = {
    id: busId,
    instrumentIdx: agbeIdx !== -1 ? agbeIdx : sementesTracks[0].instrumentIdx,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: 75,
    selectedPatternId: 0,
    isBusFolder: true,
    isLinkFolder: false,
    isFolded: false,
    isSequencerFolded: false,
    customName: 'Sementes',
    reverbVal: 0,
    panVal: 0,
    pan: 0,
    fxSends: { reverb: 0, distortion: 0 },
  };

  const children = sementesTracks.map((tr) => ({ ...tr, busId: String(busId), isHidden: false }));
  linkSameRoleDuplicates(children, 'agbe');
  linkSameRoleDuplicates(children, 'mineiro');

  return [busTrack, ...children];
}
