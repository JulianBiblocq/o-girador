import { TrackGroup, Language } from '../../types';
import { instrumentsConfig } from '../../data';
import { allocWizardId, clonePatternsForLinkFolder } from './wizardPatternBuilder';
import { linkSameRoleDuplicates } from './wizardBusHelpers';

const ALFAIA_IDS = ['marcante', 'meiao', 'repique'];

export function buildAlfaiasGroup(
  alfaiaTracks: TrackGroup[],
  mode: 'bloc' | 'distinct',
  lang: Language
): TrackGroup[] {
  if (alfaiaTracks.length === 0) return [];

  const busId = allocWizardId();
  const customName = lang === 'pt' ? 'Seção Alfaias' : 'Section Alfaias';
  const masterTrack =
    alfaiaTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'marcante') || alfaiaTracks[0];

  if (mode === 'bloc') {
    const busPatterns = clonePatternsForLinkFolder(masterTrack.patterns);
    const busTrack: TrackGroup = {
      id: busId,
      instrumentIdx: masterTrack.instrumentIdx,
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

    const children = alfaiaTracks.map((tr) => {
      const isMaster = tr.id === masterTrack.id;
      return {
        ...tr,
        busId: String(busId),
        linkedToTrackId: String(busId),
        isLinkMaster: isMaster,
        isHidden: !isMaster,
        patternOverrides: isMaster ? tr.patternOverrides : {},
      };
    });

    const masterChild = children.find((c) => c.isLinkMaster)!;
    const slaveChildren = children.filter((c) => !c.isLinkMaster);
    return [busTrack, masterChild, ...slaveChildren];
  }

  const pureBus: TrackGroup = {
    id: busId,
    instrumentIdx: masterTrack.instrumentIdx,
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

  const distinctChildren = alfaiaTracks.map((tr) => ({
    ...tr,
    busId: String(busId),
    linkedToTrackId: undefined,
    isLinkMaster: false,
    isHidden: false,
  }));

  ALFAIA_IDS.forEach((roleId) => linkSameRoleDuplicates(distinctChildren, roleId));

  return [pureBus, ...distinctChildren];
}
