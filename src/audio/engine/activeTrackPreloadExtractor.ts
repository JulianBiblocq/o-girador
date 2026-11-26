/**
 * activeTrackPreloadExtractor.ts — Extraction des instruments actifs de `state.tracks` (+ Wizard)
 * et planification en 2 passes (Passe 1 = frappes écrites, Passe 2 = 100 % des autres articulations) (< 118 lignes).
 */

import { instrumentsConfig } from '../../data';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { useWizardStore } from '../../stores/useWizardStore';
import { Pattern, TrackGroup } from '../../types';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';
import { ActiveInstrumentData } from './engineTypes';

function normalizeStrokeSymbolForPreload(instId: string, raw: string): string {
  const s = raw.trim();
  if ((s === 't' || s === 'T') && instId !== 'mineiro') return 'B';
  return s;
}

function collectWrittenStrokesFromPatterns(instId: string, patterns?: Pattern[]): Set<string> {
  const strokes = new Set<string>();
  if (!Array.isArray(patterns)) return strokes;

  const collectCells = (cells?: unknown[]) => {
    if (!Array.isArray(cells)) return;
    for (const cell of cells) {
      if (Array.isArray(cell)) {
        for (const sub of cell) {
          const s = String(sub ?? '').trim();
          if (s && s !== '0' && s !== '-' && s !== '/' && s !== '.') {
            strokes.add(normalizeStrokeSymbolForPreload(instId, s));
          }
        }
      } else {
        const s = String(cell ?? '').trim();
        if (s && s !== '0' && s !== '-' && s !== '/' && s !== '.') {
          strokes.add(normalizeStrokeSymbolForPreload(instId, s));
        }
      }
    }
  };

  for (const ptn of patterns) {
    collectCells(ptn?.activeSteps);
    collectCells(ptn?.preRollActiveSteps);
    collectCells(ptn?.tailActiveSteps);
    if (Array.isArray(ptn?.variations)) {
      for (const v of ptn.variations) collectCells(v?.steps);
    }
  }
  return strokes;
}

export function extractActiveInstrumentsFromTracks(tracks: TrackGroup[]): ActiveInstrumentData[] {
  const byInstId = new Map<string, Set<string>>();
  const safeTracks = tracks || [];

  for (const t of safeTracks) {
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst?.id || inst.type === 'voice') continue;

    let set = byInstId.get(inst.id);
    if (!set) {
      set = new Set<string>();
      byInstId.set(inst.id, set);
    }

    let patternsToScan = t.patterns;
    if (t.linkedToTrackId) {
      const master = resolveMasterTrack(t.id, safeTracks);
      const parentLink = safeTracks.find((p) => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
      patternsToScan = master?.patterns?.length ? master.patterns : (parentLink?.patterns ?? t.patterns);
    }
    for (const s of collectWrittenStrokesFromPatterns(inst.id, patternsToScan)) set.add(s);
  }

  const wiz = useWizardStore.getState();
  if (wiz.isWizardOpen && Array.isArray(wiz.placedInstruments)) {
    for (const p of wiz.placedInstruments) {
      if (p?.instrumentType && !byInstId.has(p.instrumentType)) {
        byInstId.set(p.instrumentType, new Set<string>());
      }
    }
  }

  return Array.from(byInstId.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, strokeSet]) => ({ id, activeStrokes: Array.from(strokeSet).sort() }));
}

export interface TwoPassSamplePlan {
  pass1Paths: string[];
  pass2Paths: string[];
  retainedPaths: Set<string>;
}

export function buildTwoPassSamplePlan(
  configMap: Map<string, InstrumentAudioConfig>,
  activeInstruments: ActiveInstrumentData[]
): TwoPassSamplePlan {
  const merged = new Map<string, Set<string>>();
  for (const item of activeInstruments) {
    if (!item?.id) continue;
    let set = merged.get(item.id);
    if (!set) { set = new Set<string>(); merged.set(item.id, set); }
    for (const s of item.activeStrokes || []) set.add(s);
  }

  const pass1Set = new Set<string>();
  const retainedPaths = new Set<string>();

  for (const [instId, activeSet] of merged.entries()) {
    const config = configMap.get(instId);
    if (!config) continue;
    const activeArr = Array.from(activeSet);

    for (const stroke of config.strokes) {
      for (const file of stroke.files) retainedPaths.add(file);
      const isWritten = activeArr.length === 0
        ? config.strokes[0] === stroke
        : activeArr.some((as) =>
            stroke.caseSensitive === false ? as.toUpperCase() === stroke.symbol.toUpperCase() : as === stroke.symbol
          );

      if (isWritten) {
        for (const file of stroke.files) pass1Set.add(file);
        if (stroke.compositeRimSymbol) {
          const rim = config.strokes.find((s) => s.symbol === stroke.compositeRimSymbol);
          if (rim) for (const file of rim.files) pass1Set.add(file);
        }
      }
    }
  }

  const pass1Paths = Array.from(pass1Set);
  const pass2Paths = Array.from(retainedPaths).filter((p) => !pass1Set.has(p));
  return { pass1Paths, pass2Paths, retainedPaths };
}
