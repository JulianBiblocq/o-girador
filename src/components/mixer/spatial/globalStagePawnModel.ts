/**
 * globalStagePawnModel.ts — Modèle de pions bidirectionnels (Maîtres ◆, Esclaves ↳ & Escouades) pour « La Place » 140° (< 125 lignes).
 */
import { isSectionEnsembleEligible } from '../../../constants/sectionEnsembleLimits';
import { ASSETS_BASE_URL, instrumentsConfig } from '../../../data';
import { getEffectiveMuteState } from '../../../stores/useSequencerStore';
import type { TrackGroup } from '../../../types';
import { dbToFaderPosition, faderPositionToDb } from '../../../utils/audio-math/faderMath';
import { isAutomationBypassed } from '../../../utils/automationBypassHelper';
import { hasActiveTrackAutomation } from '../../../utils/automationDetectHelper';
import { faderPosToClampedStageDb, mixParamsToStagePointPx, STAGE_MAX_DB, STAGE_MIN_DB } from '../../../utils/stagePlaceBidirectionalMath';
import { getLinkedGroupMembers, isSlaveTrack, resolveMasterTrack } from '../../../utils/trackMasterResolver';
import { buildShortTrackMasterAbbr } from '../channels/useTrackLinkRoleBadge';

export type StagePawnRoleKind = 'master' | 'slave' | 'solo' | 'squad-leader' | 'squad-partner';

export interface GlobalStagePawnItem {
  id: string;
  trackId: number;
  playerIdx: number | null;
  shortLabel: string;
  fullLabel: string;
  iconUrl: string;
  panVal: number;
  faderDb: number;
  isMuted: boolean;
  lockVol: boolean;
  lockPan: boolean;
  roleKind: StagePawnRoleKind;
  linkAnchorPawnId: string | null;
  masterShortCode: string | null;
  pxX: number;
  pxY: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function resolvePrimaryPawnIdForTrack(track: TrackGroup): string {
  const inst = instrumentsConfig[track.instrumentIdx];
  const hasSquad = Boolean(track.sectionPlayers && track.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst?.id, inst?.type));
  return hasSquad ? `${track.id}__p0` : String(track.id);
}

export function buildGlobalStagePawns(
  tracks: readonly TrackGroup[],
  globalBypass: any,
  widthPx: number,
  heightPx: number,
  resolveLabel: (id: string) => string
): GlobalStagePawnItem[] {
  const mutTracks = tracks as TrackGroup[];
  const pawns: GlobalStagePawnItem[] = [];

  for (const t of tracks) {
    if (!t || t.isBusFolder || t.isLinkFolder || t.isHidden || t.id === 999901) continue;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst) continue;

    const baseName = (t.customName || resolveLabel(inst.id) || inst.name || inst.id).trim();
    const iconUrl = `${ASSETS_BASE_URL}icones/${inst.id === 'puxador' || inst.id === 'coro' || inst.id === 'toada' ? 'apito' : inst.id}.svg`;
    const isMuted = getEffectiveMuteState(mutTracks, t.id);
    const lockVol = !isAutomationBypassed(t, 'volume', globalBypass) && hasActiveTrackAutomation(t, 'volume');
    const lockPan = !isAutomationBypassed(t, 'pan', globalBypass) && hasActiveTrackAutomation(t, 'pan');
    const trackPan = t.panVal ?? t.pan ?? 0;
    const trackDb = faderPosToClampedStageDb(t.volumeVal ?? 75);

    const slave = isSlaveTrack(t, mutTracks);
    const masterTrack = slave ? resolveMasterTrack(t.id, mutTracks) : undefined;
    const hasLinkedSlaves = !slave && getLinkedGroupMembers(t, mutTracks).some((m) => m.id !== t.id && !m.isHidden && isSlaveTrack(m, mutTracks));
    const masterAnchorId = slave && masterTrack && masterTrack.id !== t.id && !masterTrack.isHidden
      ? resolvePrimaryPawnIdForTrack(masterTrack)
      : null;
    const masterShortCode = slave && masterTrack && masterTrack.id !== t.id ? buildShortTrackMasterAbbr(masterTrack) : null;

    if (t.sectionPlayers && t.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst.id, inst.type)) {
      const leaderPawnId = `${t.id}__p0`;
      t.sectionPlayers.forEach((p, idx) => {
        const ownPan = typeof p.panVal === 'number' && Number.isFinite(p.panVal) ? p.panVal : Math.round((p.x - 50) * 2);
        const effPan = clamp(Math.round(ownPan + trackPan), -100, 100);
        const ownDb = faderPositionToDb(p.volumeVal ?? 75);
        const effDb = !Number.isFinite(ownDb) ? STAGE_MIN_DB : clamp(trackDb + ownDb, STAGE_MIN_DB, STAGE_MAX_DB);
        const pt = mixParamsToStagePointPx(effPan, effDb, widthPx, heightPx);
        const roleKind: StagePawnRoleKind = idx === 0 ? (hasLinkedSlaves ? 'master' : (slave ? 'slave' : 'squad-leader')) : 'squad-partner';
        pawns.push({
          id: `${t.id}__p${idx}`, trackId: t.id, playerIdx: idx,
          shortLabel: `${baseName.slice(0, 5)}#${idx + 1}`, fullLabel: `${baseName} #${idx + 1}`,
          iconUrl, panVal: effPan, faderDb: effDb, isMuted, lockVol: false, lockPan,
          roleKind, linkAnchorPawnId: idx === 0 ? masterAnchorId : leaderPawnId,
          masterShortCode: idx === 0 ? masterShortCode : null, pxX: pt.pxX, pxY: pt.pxY,
        });
      });
    } else {
      const pt = mixParamsToStagePointPx(trackPan, trackDb, widthPx, heightPx);
      const roleKind: StagePawnRoleKind = slave ? 'slave' : (hasLinkedSlaves ? 'master' : 'solo');
      pawns.push({
        id: String(t.id), trackId: t.id, playerIdx: null,
        shortLabel: baseName.slice(0, 7), fullLabel: baseName,
        iconUrl, panVal: clamp(Math.round(trackPan), -100, 100), faderDb: trackDb,
        isMuted, lockVol, lockPan, roleKind, linkAnchorPawnId: masterAnchorId, masterShortCode,
        pxX: pt.pxX, pxY: pt.pxY,
      });
    }
  }
  return pawns;
}

export function computeUpdatedSquadPlayerFromStage(
  track: TrackGroup, playerIdx: number, targetEffPan: number, targetEffDb: number
) {
  const trackPan = track.panVal ?? track.pan ?? 0;
  const rawTrackDb = faderPositionToDb(track.volumeVal ?? 75);
  const trackDb = Number.isFinite(rawTrackDb) ? rawTrackDb : 0;
  const ownPan = clamp(Math.round(targetEffPan - trackPan), -100, 100);
  const ownDb = clamp(targetEffDb - trackDb, STAGE_MIN_DB, STAGE_MAX_DB);
  const ownVolPos = Number(dbToFaderPosition(ownDb).toFixed(2));
  const nextX = Math.round(clamp(50 + ownPan * 0.5, 4, 96) * 10) / 10;
  return (track.sectionPlayers || []).map((p, i) => (i === playerIdx ? { ...p, panVal: ownPan, x: nextX, volumeVal: ownVolPos } : { ...p }));
}
