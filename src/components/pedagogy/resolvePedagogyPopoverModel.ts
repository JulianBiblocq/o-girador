import { InstrumentConfig, Language, Pattern, TrackGroup } from '../../types';
import { getVisualStrokeSymbol, instrumentsConfig, isDarkText } from '../../data';
import { applyCordelInkedPatina, getTrackDisplayName } from '../../utils/colorHelpers';
import { areStepValuesEqual } from '../../utils/slaveStepOpacityResolver';
import { formatStrokeSymbol } from '../circle-sequencer/percussionSatelliteHelpers';
import { resolveStrokePedagogy } from '../../data/strokePedagogyCatalog';
import { getAudioEngine } from '../../hooks/audio-sync/audioEngineNodes';
import { safeResumeAudioContext } from '../../audio/audioContextSuspendManager';
import { StrokeInfoCardItem, StrokeInfoPopoverTarget } from './strokeInfoTypes';

const isStepEmpty = (v: any): boolean => v === 0 || v === '0' || v === '' || v === null || v === undefined || v === '-';

function makePercCard(params: {
  rawSym: string; inst: InstrumentConfig; track: TrackGroup; patternId?: number; stepIdx: number;
  subIndex?: 0 | 1; isLeftHanded: boolean; lang: Language; roleTag?: string;
}): StrokeInfoCardItem | null {
  const { rawSym, inst, track, patternId, stepIdx, subIndex, isLeftHanded, lang, roleTag } = params;
  if (isStepEmpty(rawSym)) return null;
  const ped = resolveStrokePedagogy(inst.id, inst.type, rawSym, lang, isLeftHanded, false);
  const visualSym = String(getVisualStrokeSymbol(rawSym, isLeftHanded, inst.id));
  const rawBg = inst.colors?.[visualSym] || inst.color || 'var(--cordel-wood)';
  const badgeBg = rawBg.startsWith('var(') ? rawBg : applyCordelInkedPatina(rawBg);
  const badgeTxt = isDarkText(inst.id, String(rawSym)) ? 'var(--cordel-ink-dark)' : 'var(--cordel-on-accent)';
  return {
    badgeSymbol: formatStrokeSymbol(inst.id, visualSym),
    badgeBg,
    badgeTxt,
    title: ped?.title || visualSym,
    description: ped?.description || '',
    semanticStroke: String(rawSym),
    roleTag,
    previewTrackId: track.id,
    previewInstId: inst.id,
    previewTuning: track.tuning ?? 0,
    isVoice: false,
    targetTrackId: track.id,
    targetPatternId: patternId,
    targetStepIdx: stepIdx,
    targetSubIndex: subIndex,
  };
}

export function buildPercussionPedagogyTarget(params: {
  anchorX: number; anchorY: number; track: TrackGroup; allTracks: TrackGroup[]; inst: InstrumentConfig;
  pattern: Pattern | null | undefined; measureIdx: number; stepIdx: number; rawVal: any;
  masterBaseVal?: any; clickedSubIndex?: 0 | 1; isLeftHanded: boolean; lang: Language;
}): StrokeInfoPopoverTarget | null {
  const { anchorX, anchorY, track, allTracks, inst, pattern, measureIdx, stepIdx, rawVal, masterBaseVal, clickedSubIndex, isLeftHanded, lang } = params;
  const isFr = lang === 'fr';
  const cards: StrokeInfoCardItem[] = [];

  if (Array.isArray(rawVal) && rawVal.length === 2) {
    const c0 = makePercCard({ rawSym: String(rawVal[0] ?? ''), inst, track, patternId: pattern?.id, stepIdx, subIndex: 0, isLeftHanded, lang, roleTag: '1/2 • Ra' });
    const c1 = makePercCard({ rawSym: String(rawVal[1] ?? ''), inst, track, patternId: pattern?.id, stepIdx, subIndex: 1, isLeftHanded, lang, roleTag: '2/2 • Ra' });
    if (c0) cards.push(c0);
    if (c1) cards.push(c1);
  } else if (!isStepEmpty(rawVal)) {
    const hasCompositeMaster = masterBaseVal !== undefined && !isStepEmpty(masterBaseVal) && !Array.isArray(masterBaseVal) && !areStepValuesEqual(rawVal, masterBaseVal);
    const mainCard = makePercCard({
      rawSym: String(rawVal), inst, track, patternId: pattern?.id, stepIdx, isLeftHanded, lang,
      roleTag: hasCompositeMaster ? (isFr ? 'Variation' : 'Variação') : undefined,
    });
    if (mainCard) cards.push(mainCard);
    if (hasCompositeMaster) {
      const masterCard = makePercCard({
        rawSym: String(masterBaseVal), inst, track, patternId: pattern?.id, stepIdx, isLeftHanded, lang,
        roleTag: isFr ? 'Base Maître' : 'Base Mestre',
      });
      if (masterCard) cards.push(masterCard);
    }
  }

  if (cards.length === 0) return null;
  return {
    anchorX, anchorY, trackId: track.id, patternId: pattern?.id, measureIdx, stepIdx, subIndex: clickedSubIndex,
    instrumentName: getTrackDisplayName(track, allTracks) || inst.name, instId: inst.id, cards,
  };
}

export function buildVocalRoleCard(params: {
  role: 'puxador' | 'coro'; roleTrack: TrackGroup; pattern: Pattern; stepIdx: number; lang: Language;
}): StrokeInfoCardItem | null {
  const { role, roleTrack, pattern, stepIdx, lang } = params;
  const rawVal = pattern.activeSteps?.[stepIdx];
  if (rawVal === 0 || rawVal === '' || rawVal === undefined || rawVal === null || rawVal === '-') return null;
  let resolvedIdx = stepIdx;
  while (resolvedIdx > 0 && !(pattern.lyrics?.[resolvedIdx] || '').trim() && (pattern.activeSteps?.[resolvedIdx - 1] ?? 0) !== 0) {
    if ((pattern.notes?.[resolvedIdx] || '').trim() !== (pattern.notes?.[resolvedIdx - 1] || '').trim()) break;
    resolvedIdx--;
  }
  const syl = (pattern.lyrics?.[resolvedIdx] || '').trim();
  const note = (pattern.notes?.[resolvedIdx] || pattern.notes?.[stepIdx] || '').trim();
  const isExplicitSilence = String(rawVal) === '0' || syl === '0';
  const isMelisma = syl === '_';
  const symKey = isExplicitSilence ? '0' : isMelisma ? '_' : role === 'puxador' ? 'P' : 'C';
  const inst = instrumentsConfig[roleTrack.instrumentIdx];
  const ped = resolveStrokePedagogy(role, 'voice', symKey, lang, false, false);
  return {
    badgeSymbol: role === 'puxador' ? 'P' : 'C',
    badgeBg: role === 'puxador' ? 'var(--cordel-accent)' : 'var(--cordel-status-success)',
    badgeTxt: 'var(--cordel-on-accent)',
    title: ped?.title || (role === 'puxador' ? 'Puxador' : 'Coro'),
    description: ped?.description || '',
    semanticStroke: symKey,
    roleTag: role === 'puxador' ? 'Puxador' : (lang === 'fr' ? 'Chœur' : 'Coro'),
    vocalNote: note || undefined,
    vocalSyllable: syl && syl !== '_' && syl !== '0' ? syl : undefined,
    previewTrackId: roleTrack.id,
    previewInstId: inst?.id || role,
    previewTuning: 0,
    isVoice: true,
    targetTrackId: roleTrack.id,
    targetPatternId: pattern.id,
    targetStepIdx: resolvedIdx,
  };
}

export function triggerPedagogyPreview(card: StrokeInfoCardItem): void {
  const engine = getAudioEngine();
  if (!engine || engine.getIsPlaying()) return;
  safeResumeAudioContext();
  if (card.isVoice) {
    if (card.vocalNote && card.semanticStroke !== '0') {
      engine.triggerVoiceAttackRelease(card.vocalNote, 0.45, undefined, 0.8, card.previewTrackId);
    }
    return;
  }
  engine.playPreview(card.previewInstId, card.semanticStroke, card.previewTuning, 1.0, undefined, 1.0, card.previewTrackId);
  if (card.semanticStroke === 'B' || card.semanticStroke === 'b') {
    setTimeout(() => { if (!engine.getIsPlaying()) engine.stopBarulho(card.previewInstId); }, 700);
  }
}
