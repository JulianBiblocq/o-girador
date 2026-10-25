/**
 * Application chirurgicale et non-destructive d'un gabarit de batuque au morceau en cours (< 135 lignes).
 */
import { TrackGroup, Pattern, WorkspaceTemplate, ApplyWorkspaceTemplateOptions } from '../../types';
import { instrumentsConfig } from '../../data';
import { matchTemplateTracksWithSong, isVoiceTrack } from './workspaceTemplateMatcher';
import { getBusFamily } from './workspaceTemplateBusMatcher';
import { applyRadii } from './trackRodaGeometryHelpers';

export function applyWorkspaceTemplateToSongState(
  state: {
    tracks: TrackGroup[];
    rodaTrackOrder: number[];
    tracksVersion: number;
    totalMeasures: number;
    masterFX: any;
    lang?: string;
  },
  template: WorkspaceTemplate,
  options: ApplyWorkspaceTemplateOptions
): Record<string, any> {
  const { tplToSongIdMap, matchedSongTrackIds } = matchTemplateTracksWithSong(
    state.tracks, template.tracks, instrumentsConfig
  );

  const totalM = state.totalMeasures || 4;
  const defaultSteps = state.tracks[0]?.patterns[0]?.steps || 16;
  const now = Date.now();

  const songAlfaias = state.tracks.filter(t => !t.isBusFolder && [0, 1, 2].includes(t.instrumentIdx));
  const areSongAlfaiasIndependent = songAlfaias.length > 0 && songAlfaias.every(t => !t.linkedToTrackId && !t.isLinkMaster);
  const tplAlfaiaBus = template.tracks.find(t => t.isBusFolder && getBusFamily(t, template.tracks, instrumentsConfig) === 'alfaias');

  // 1. Mise a jour ou creation de chaque piste du gabarit
  const templateMappedTracks: TrackGroup[] = template.tracks.map((tplT, i) => {
    const songId = tplToSongIdMap.get(tplT.id)!;
    const existing = state.tracks.find((t) => t.id === songId);

    const isPureBus = Boolean(tplT.isBusFolder && !tplT.isLinkFolder);
    const newPatId = now + 1000 + i;
    const blankPattern: Pattern = {
      id: newPatId, name: state.lang === 'pt' ? 'Padrão 1' : 'Motif 1', steps: defaultSteps,
      activeSteps: Array(defaultSteps).fill(0), volumes: Array(defaultSteps).fill(80),
      decays: Array(defaultSteps).fill(100), microtimings: Array(defaultSteps).fill(0),
      measureAssignments: Array(totalM).fill(true), lyrics: Array(defaultSteps).fill(''), notes: Array(defaultSteps).fill(''),
    };

    // Resolution securisee des IDs de routage
    const newBusId = options.includeStructure && tplT.busId ? String(tplToSongIdMap.get(Number(tplT.busId)) ?? tplT.busId) : existing?.busId;
    const newLinkedId = options.includeStructure && tplT.linkedToTrackId ? String(tplToSongIdMap.get(Number(tplT.linkedToTrackId)) ?? tplT.linkedToTrackId) : existing?.linkedToTrackId;

    const baseTrack: TrackGroup = existing ? { ...existing } : {
      id: songId, instrumentIdx: tplT.instrumentIdx, customName: tplT.customName,
      patterns: isPureBus ? [] : [blankPattern], selectedPatternId: isPureBus ? 0 : newPatId,
      isMute: false, isSolo: false, isHidden: false, volumeVal: 75,
    };

    if (options.includeStructure) {
      if (areSongAlfaiasIndependent && tplAlfaiaBus) {
        if (tplT.id === tplAlfaiaBus.id) {
          baseTrack.customName = tplAlfaiaBus.customName || 'ALFAIAS';
          baseTrack.isBusFolder = true;
          baseTrack.isLinkFolder = false;
        } else if ([0, 1, 2].includes(tplT.instrumentIdx)) {
          const alfaiaBusSongId = tplToSongIdMap.get(tplAlfaiaBus.id);
          baseTrack.busId = alfaiaBusSongId ? String(alfaiaBusSongId) : newBusId;
          baseTrack.linkedToTrackId = undefined;
          baseTrack.isLinkMaster = undefined;
          baseTrack.isLinkFolder = false;
          baseTrack.isHidden = false;
        } else {
          baseTrack.isBusFolder = tplT.isBusFolder;
          baseTrack.isLinkFolder = tplT.isLinkFolder;
          baseTrack.isLinkMaster = tplT.isLinkMaster;
          baseTrack.busId = newBusId;
          baseTrack.linkedToTrackId = newLinkedId;
          baseTrack.isHidden = Boolean(tplT.linkedToTrackId && !tplT.isLinkFolder && !tplT.isLinkMaster);
        }
      } else {
        baseTrack.isBusFolder = tplT.isBusFolder;
        baseTrack.isLinkFolder = tplT.isLinkFolder;
        baseTrack.isLinkMaster = tplT.isLinkMaster;
        baseTrack.busId = newBusId;
        baseTrack.linkedToTrackId = newLinkedId;
        baseTrack.isHidden = Boolean(tplT.linkedToTrackId && !tplT.isLinkFolder && !tplT.isLinkMaster);
      }
    }
    if (options.includeVolumePan) {
      baseTrack.volumeVal = tplT.volumeVal ?? baseTrack.volumeVal ?? 75;
      baseTrack.pan = tplT.pan ?? baseTrack.pan ?? 0;
      baseTrack.panVal = tplT.panVal ?? baseTrack.panVal ?? 0;
    }
    if (options.includeEQ) {
      baseTrack.eqBands = tplT.eqBands ? JSON.parse(JSON.stringify(tplT.eqBands)) : baseTrack.eqBands;
      baseTrack.lowCut = tplT.lowCut ?? baseTrack.lowCut ?? false;
    }
    if (options.includeFX) {
      baseTrack.reverbVal = tplT.reverbVal ?? baseTrack.reverbVal ?? 0;
      baseTrack.fxSends = tplT.fxSends ? { ...tplT.fxSends } : (baseTrack.fxSends ?? { reverb: 0, distortion: 0 });
    }
    return baseTrack;
  });

  // 2. Gestion des pistes existantes non couvertes par le gabarit
  const preservedExtraTracks = state.tracks.filter((st) => {
    if (matchedSongTrackIds.has(st.id)) return false;
    // Si l'utilisateur demande le nettoyage, on conserve toujours les pistes vocales
    if (options.removeExtraTracks) return isVoiceTrack(st, instrumentsConfig);
    return true;
  });

  // 3. Assemblage et ordre d'affichage (Mixeur & Roda)
  const finalTracks = options.includeDisplayOrder
    ? [...templateMappedTracks, ...preservedExtraTracks]
    : [...state.tracks.filter(t => !matchedSongTrackIds.has(t.id) && preservedExtraTracks.includes(t)), ...templateMappedTracks];

  let finalRodaOrder: number[] = [];
  if (options.includeDisplayOrder && template.rodaTrackOrder?.length) {
    finalRodaOrder = template.rodaTrackOrder
      .map((oldId) => tplToSongIdMap.get(oldId))
      .filter((id): id is number => id !== undefined && finalTracks.some((ft) => ft.id === id));
  } else {
    finalRodaOrder = [...state.rodaTrackOrder].filter((id) => finalTracks.some((ft) => ft.id === id));
  }

  finalTracks.forEach((ft) => {
    if (!finalRodaOrder.includes(ft.id)) finalRodaOrder.push(ft.id);
  });

  const nextTracks = applyRadii(finalTracks, finalRodaOrder);
  const nextMasterFX = options.includeFX && template.masterSettings?.masterFX
    ? JSON.parse(JSON.stringify(template.masterSettings.masterFX))
    : state.masterFX;

  return {
    tracks: nextTracks,
    rodaTrackOrder: finalRodaOrder,
    tracksVersion: state.tracksVersion + 1,
    masterFX: nextMasterFX,
  };
}
