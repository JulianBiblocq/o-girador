import { TrackGroup } from '../../types';

export interface TrackMeta {
  id: number;
  instrumentIdx: number;
  customName?: string;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
  isLinkMaster?: boolean;
  busId?: string | number;
  linkedToTrackId?: string | number;
  isMute: boolean;
  isSolo: boolean;
  isHidden?: boolean;
  isFolded?: boolean;
  isSequencerFolded?: boolean;
  patternOverrides?: Record<number, number | null>;
  automationBypass?: { volume?: boolean; pan?: boolean; reverb?: boolean };
}

const trackMetaCache = new Map<string, TrackMeta>();

export const getCachedTrackMeta = (
  id: number,
  instrumentIdx: number,
  customName: string | undefined,
  isBusFolder: boolean | undefined,
  isLinkFolder: boolean | undefined,
  isLinkMaster: boolean | undefined,
  busId: string | number | undefined,
  linkedToTrackId: string | number | undefined,
  isMute: boolean,
  isSolo: boolean,
  isHidden: boolean | undefined,
  isFolded: boolean | undefined,
  patternOverrides?: Record<number, number | null>,
  automationBypass?: { volume?: boolean; pan?: boolean; reverb?: boolean },
  isSequencerFolded?: boolean
): TrackMeta => {
  const overridesKey = patternOverrides ? Object.entries(patternOverrides).map(([k, v]) => `${k}:${v}`).join(',') : '';
  const bypassKey = automationBypass ? `${!!automationBypass.volume}_${!!automationBypass.pan}_${!!automationBypass.reverb}` : '';
  const key = `${id}_${instrumentIdx}_${customName || ''}_${!!isBusFolder}_${!!isLinkFolder}_${!!isLinkMaster}_${busId ?? ''}_${linkedToTrackId ?? ''}_${isMute}_${isSolo}_${!!isHidden}_${!!isFolded}_${!!isSequencerFolded}_${overridesKey}_${bypassKey}`;
  let item = trackMetaCache.get(key);
  if (!item) {
    item = {
      id,
      instrumentIdx,
      customName,
      isBusFolder,
      isLinkFolder,
      isLinkMaster,
      busId,
      linkedToTrackId,
      isMute,
      isSolo,
      isHidden,
      isFolded,
      isSequencerFolded,
      patternOverrides,
      automationBypass,
    };
    trackMetaCache.set(key, item);
  }
  return item;
};

let prevTracksArr: TrackGroup[] | null = null;
let prevMetaList: TrackMeta[] = [];

export const selectTracksMeta = (state: { tracks: TrackGroup[] }): TrackMeta[] => {
  const currentTracks = state.tracks;
  if (currentTracks === prevTracksArr) {
    return prevMetaList;
  }

  let hasChanged = currentTracks.length !== prevMetaList.length;
  const nextMetaList: TrackMeta[] = [];

  for (let i = 0; i < currentTracks.length; i++) {
    const t = currentTracks[i];
    const meta = getCachedTrackMeta(
      t.id,
      t.instrumentIdx,
      t.customName,
      t.isBusFolder,
      t.isLinkFolder,
      t.isLinkMaster,
      t.busId,
      t.linkedToTrackId,
      t.isMute,
      t.isSolo,
      t.isHidden,
      t.isFolded,
      t.patternOverrides,
      t.automationBypass,
      t.isSequencerFolded
    );
    nextMetaList.push(meta);
    if (!hasChanged && prevMetaList[i] !== meta) {
      hasChanged = true;
    }
  }

  prevTracksArr = currentTracks;
  if (!hasChanged) {
    return prevMetaList;
  }
  prevMetaList = nextMetaList;
  return nextMetaList;
};
