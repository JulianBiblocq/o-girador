
export interface TrackHierarchySlice {
  handleReorderRodaTracks: (activeId: number, overId: number) => void;
  handleReverseRodaTracks: () => void;
  handleReorderMixerTracks: (activeId: number, overId: number, dropSide?: 'left' | 'right') => void;
  handleReorderWagon: (wagonTrackIds: number[], overTrackId: number) => void;
  handleReorderTracksDnd: (activeId: number, overId: number, dropSide?: 'left' | 'right') => void;
  handleLinkTrack: (trackId: number, linkedToTrackId: string | null) => void;
  handleDetachTrack: (trackId: number) => void;
  handleCreateLinkGroup: (trackId: number, name: string) => void;
  handleCreateBus: (trackId: number, name: string) => void;
  handleCreateCustomBus: (trackIds: number[], name: string) => void;
  handleCreateCustomLinkGroup: (masterTrackId: number, slaveTrackIds: number[], name: string) => void;
  handleSetPatternOverride: (trackId: number, measureIdx: number, patternId?: number | null) => void;
  handleAssignToBus: (trackId: number, busId: string | null) => void;
  handleToggleFoldBus: (busId: number | string) => void;
  handleToggleSequencerFoldBus: (busId: number | string) => void;
}
