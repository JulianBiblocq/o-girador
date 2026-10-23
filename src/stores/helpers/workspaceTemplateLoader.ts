import { TrackGroup, Pattern, WorkspaceTemplate, MasterFX } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';

export { applyWorkspaceTemplateAudioSettings } from './workspaceTemplateAudioSettings';


export const createTracksFromTemplateState = (
  state: {
    totalMeasures: number;
    lang?: string;
    tracksVersion: number;
    masterFX: MasterFX;
  },
  template: WorkspaceTemplate
): Record<string, any> => {
  const { options, tracks: tplTracks, rodaTrackOrder: tplRodaOrder } = template;
  const idMap = new Map<number, number>();
  const now = Date.now();

  tplTracks.forEach((t, i) => {
    idMap.set(t.id, now + i * 10 + Math.floor(Math.random() * 9));
  });

  const totalM = state.totalMeasures || 4;

  const newTracks: TrackGroup[] = tplTracks.map((t, i) => {
    const newId = idMap.get(t.id)!;
    const newPatternId = now + 1000 + i;
    const steps = 16;
    const isPureBus = Boolean(options.includeStructure && t.isBusFolder && !t.isLinkFolder);

    const blankPattern: Pattern = {
      id: newPatternId,
      name: state.lang === 'pt' ? 'Padrão 1' : 'Motif 1',
      steps,
      activeSteps: Array(steps).fill(0),
      volumes: Array(steps).fill(80),
      decays: Array(steps).fill(100),
      microtimings: Array(steps).fill(0),
      measureAssignments: Array(totalM).fill(true),
      lyrics: Array(steps).fill(''),
      notes: Array(steps).fill('')
    };

    let newBusId: string | undefined = undefined;
    if (options.includeStructure && t.busId) {
      const oldParent = Number(t.busId);
      newBusId = idMap.has(oldParent) ? String(idMap.get(oldParent)) : undefined;
    }

    let newLinkedToTrackId: string | undefined = undefined;
    if (options.includeStructure && t.linkedToTrackId) {
      const oldLinkParent = Number(t.linkedToTrackId);
      newLinkedToTrackId = idMap.has(oldLinkParent) ? String(idMap.get(oldLinkParent)) : undefined;
    }

    const newTrack: TrackGroup = {
      id: newId,
      instrumentIdx: t.instrumentIdx,
      customName: t.customName,
      patterns: isPureBus ? [] : [blankPattern],
      selectedPatternId: isPureBus ? 0 : newPatternId,
      isMute: false,
      isSolo: false,
      isHidden: Boolean(options.includeStructure && t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster),
      isBusFolder: options.includeStructure ? t.isBusFolder : undefined,
      isLinkFolder: options.includeStructure ? t.isLinkFolder : undefined,
      isLinkMaster: options.includeStructure ? t.isLinkMaster : undefined,
      busId: newBusId,
      linkedToTrackId: newLinkedToTrackId,
      volumeVal: options.includeVolumePan ? (t.volumeVal ?? 75) : 75,
      pan: options.includeVolumePan ? (t.pan ?? 0) : 0,
      panVal: options.includeVolumePan ? (t.panVal ?? 0) : 0,
      eqBands: options.includeEQ && t.eqBands ? JSON.parse(JSON.stringify(t.eqBands)) : undefined,
      lowCut: options.includeEQ ? (t.lowCut ?? false) : false,
      reverbVal: options.includeFX ? (t.reverbVal ?? 0) : 0,
      fxSends: options.includeFX && t.fxSends ? { ...t.fxSends } : { reverb: 0, distortion: 0 }
    };

    return newTrack;
  });

  let newRodaTrackOrder: number[] = [];
  if (options.includeDisplayOrder && tplRodaOrder && tplRodaOrder.length > 0) {
    newRodaTrackOrder = tplRodaOrder
      .map(oldId => idMap.get(oldId))
      .filter((id): id is number => id !== undefined);
  }
  newTracks.forEach(t => {
    if (!newRodaTrackOrder.includes(t.id)) {
      newRodaTrackOrder.push(t.id);
    }
  });

  const finalTracks = applyRadii(newTracks, newRodaTrackOrder);
  const nextMasterFX = (options.includeFX && template.masterSettings?.masterFX)
    ? JSON.parse(JSON.stringify(template.masterSettings.masterFX))
    : state.masterFX;

  return {
    tracks: finalTracks,
    rodaTrackOrder: newRodaTrackOrder,
    tracksVersion: state.tracksVersion + 1,
    masterFX: nextMasterFX,
    letras: '',
    metadata: { toada: '', nacao: '', compositor: '', ritmo: '', youtubeUrl: '', rhythmSignals: [] },
    songSections: [],
    songMarkers: [],
    activeAoVivoTrackId: null,
    isLetraActive: false
  };
};
