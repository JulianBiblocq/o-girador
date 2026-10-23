/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Constructeur de pistes et routage strict pour les partitions scannées (< 145 lignes).
 */
import { instrumentsConfig } from '../../data';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { TrackGroup } from '../../types/store.types';
import { useWorkspaceTemplateStore } from '../../stores/useWorkspaceTemplateStore';
import { disambiguateAllPresetPatterns } from './paperRoleDisambiguator';

export interface PaperInjectOptions {
  linkAlfaias?: boolean;
  linkCaixas?: boolean;
  caixasLinkMode?: 'none' | 'caixa_tarol' | 'two_caixas';
  extraRoles?: string[];
  mixerTemplateId?: string | null;
}

export function detectActivePaperRoles(preset: PaperPreset): Set<string> {
  const active = new Set<string>();
  const sanitizedPatterns = disambiguateAllPresetPatterns(preset.patterns || {});
  const secEntries = Object.entries(sanitizedPatterns);
  const baseMap = secEntries[0]?.[1] || {};

  secEntries.forEach(([, pupitreMap]) => {
    Object.entries(pupitreMap).forEach(([roleKey, steps]) => {
      const code = roleKey.toLowerCase();
      let stepArr: any[] = Array.isArray(steps) ? steps : [];
      const rawStepVal: any = steps;
      if (typeof rawStepVal === 'string' && /^(base|idem|%)$/i.test(rawStepVal.trim())) {
        const baseVal = (baseMap as any)[roleKey];
        if (Array.isArray(baseVal)) stepArr = baseVal;
      }
      const hasHit = stepArr.some((s) => s !== 0 && s !== '0' && s !== '' && s !== '.' && s !== '-' && s !== null && s !== undefined);
      if (hasHit) active.add(code);
    });
  });
  return active;
}

function makeTrack(id: number, instIdx: number, customName: string, opts: Partial<TrackGroup> = {}): TrackGroup {
  const vol = opts.volumeVal ?? 75;
  const pan = opts.panVal ?? 0;
  const rev = opts.reverbVal ?? 0;
  return {
    id,
    instrumentIdx: instIdx,
    patterns: [],
    isMute: false,
    isSolo: false,
    isHidden: false,
    volumeVal: vol,
    selectedPatternId: 0,
    customName,
    reverbVal: rev,
    panVal: pan,
    pan,
    fxSends: { reverb: rev, distortion: 0 },
    measureVols: undefined,
    measureVolTransitions: undefined,
    measurePans: undefined,
    measurePanTransitions: undefined,
    measureReverbSends: undefined,
    measureReverbTransitions: undefined,
    patternOverrides: {},
    automationBypass: { volume: false, pan: false, reverb: false },
    ...opts,
    automation: undefined,
    volumeAutomation: undefined,
    panAutomation: undefined,
    isAutomated: false,
  } as TrackGroup;
}

export function buildScannedScoreTracks(preset: PaperPreset, totalM: number, options?: PaperInjectOptions): TrackGroup[] {
  const detected = detectActivePaperRoles(preset);
  const activeRoles = new Set<string>([...detected, ...(options?.extraRoles || []).map((r) => r.toLowerCase())]);
  if (activeRoles.size === 0) activeRoles.add('al');

  const tracks: TrackGroup[] = [];
  const baseId = Date.now();

  const hasAl = activeRoles.has('al') || (activeRoles.has('mc') && activeRoles.has('me') && activeRoles.has('rp'));
  const linkAl = options?.linkAlfaias !== undefined ? options.linkAlfaias : true;

  if (hasAl && linkAl) {
    const busId = baseId + 10;
    tracks.push(makeTrack(busId, 0, 'ALFAIAS', { isBusFolder: true, isLinkFolder: true }));
    tracks.push(makeTrack(baseId + 11, 0, 'Marcante (alfaia)', { busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: true }));
    tracks.push(makeTrack(baseId + 12, 1, 'Meião (alfaia)', { busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: false }));
    tracks.push(makeTrack(baseId + 13, 2, 'Repique (alfaia)', { busId: String(busId), linkedToTrackId: String(busId), isLinkMaster: false }));
  } else {
    if (activeRoles.has('al') || activeRoles.has('mc')) tracks.push(makeTrack(baseId + 11, 0, 'Marcante (alfaia)'));
    if (activeRoles.has('me')) tracks.push(makeTrack(baseId + 12, 1, 'Meião (alfaia)'));
    if (activeRoles.has('rp')) tracks.push(makeTrack(baseId + 13, 2, 'Repique (alfaia)'));
  }

  const hasCx = activeRoles.has('cx'), hasTr = activeRoles.has('tr');
  const cxMode = options?.caixasLinkMode ?? (options?.linkCaixas ? 'caixa_tarol' : 'none');

  if (cxMode === 'caixa_tarol' && hasCx) {
    const cxBusId = baseId + 20;
    tracks.push(makeTrack(cxBusId, 3, 'CAIXAS', { isBusFolder: true, isLinkFolder: true }));
    tracks.push(makeTrack(baseId + 21, 3, 'Caixa', { busId: String(cxBusId), linkedToTrackId: String(cxBusId), isLinkMaster: true, panVal: -25, pan: -25 }));
    tracks.push(makeTrack(baseId + 22, 4, 'Tarol', { busId: String(cxBusId), linkedToTrackId: String(cxBusId), isLinkMaster: false, panVal: 25, pan: 25 }));
  } else if (cxMode === 'two_caixas' && hasCx) {
    const cxBusId = baseId + 20;
    tracks.push(makeTrack(cxBusId, 3, 'CAIXAS', { isBusFolder: true, isLinkFolder: true }));
    tracks.push(makeTrack(baseId + 21, 3, 'Caixa 1 (G)', { busId: String(cxBusId), linkedToTrackId: String(cxBusId), isLinkMaster: true, panVal: -40, pan: -40 }));
    tracks.push(makeTrack(baseId + 22, 3, 'Caixa 2 (D)', { busId: String(cxBusId), linkedToTrackId: String(cxBusId), isLinkMaster: false, panVal: 40, pan: 40 }));
  } else if (hasCx && hasTr) {
    const cxBusId = baseId + 20;
    tracks.push(makeTrack(cxBusId, 3, 'CAIXAS', { isBusFolder: true, isLinkFolder: false }));
    tracks.push(makeTrack(baseId + 21, 3, 'Caixa', { busId: String(cxBusId) }));
    tracks.push(makeTrack(baseId + 22, 4, 'Tarol', { busId: String(cxBusId) }));
  } else {
    if (hasCx) tracks.push(makeTrack(baseId + 21, 3, 'Caixa'));
    if (hasTr) tracks.push(makeTrack(baseId + 22, 4, 'Tarol'));
  }

  const hasAb = activeRoles.has('ab'), hasMi = activeRoles.has('mi');
  if (hasAb && hasMi) {
    const semBusId = baseId + 30;
    tracks.push(makeTrack(semBusId, 6, 'SEMENTES', { isBusFolder: true, isLinkFolder: false }));
    tracks.push(makeTrack(baseId + 31, 6, 'Agbê', { busId: String(semBusId) }));
    tracks.push(makeTrack(baseId + 32, 7, 'Mineiro', { busId: String(semBusId) }));
  } else {
    if (hasAb) tracks.push(makeTrack(baseId + 31, 6, 'Agbê'));
    if (hasMi) tracks.push(makeTrack(baseId + 32, 7, 'Mineiro'));
  }

  if (activeRoles.has('tb')) tracks.push(makeTrack(baseId + 40, 8, 'Timbal'));
  if (activeRoles.has('gg')) tracks.push(makeTrack(baseId + 50, 5, 'Gonguê'));
  if (activeRoles.has('ap')) tracks.push(makeTrack(baseId + 60, 9, 'Apito'));
  if (activeRoles.has('td')) tracks.push(makeTrack(baseId + 70, 12, 'Toada'));

  if (options?.mixerTemplateId) {
    const tpls = useWorkspaceTemplateStore.getState().templates;
    const match = tpls.find((t) => t.id === options.mixerTemplateId);
    if (match && Array.isArray(match.tracks)) {
      tracks.forEach((tr) => {
        const instCode = instrumentsConfig[tr.instrumentIdx]?.id;
        const found = match.tracks.find((mt: any) => mt.instrumentIdx === tr.instrumentIdx || (instCode && mt.customName?.toLowerCase().includes(instCode)));
        if (found) {
          const v = found.volumeVal ?? 75, p = found.panVal ?? 0, r = found.reverbVal ?? 0;
          tr.volumeVal = v; tr.panVal = p; tr.pan = p; tr.reverbVal = r;
        }
      });
    }
  }

  return tracks;
}
