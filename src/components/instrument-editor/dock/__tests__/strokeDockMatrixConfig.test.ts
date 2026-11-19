/**
 * strokeDockMatrixConfig.test.ts — Validation SSOT des 7 matrices 2 lignes, mode Gaucher (dont Agbê),
 * simplification Alfaia A, Rimshot Caixa, ordre Inspecteur et cycles molette (< 120 lignes).
 */
import assert from 'node:assert/strict';
import { buildStrokeDockMatrix } from '../strokeDockMatrixConfig';
import { getStrokePairs, getStrokesForInstrument, getWheelNuanceState, getVisualStrokeSymbol } from '../../../../universes/maracatu/strokes';
import { getNormalizedStroke } from '../../../../hooks/audio-sync/strokeNormalization';
import { getStrokesForRole } from '../../../../utils/paper/paperPopoverStrokes';
import { DockRowCellSpec, StrokeDockMatrixSpec } from '../strokeDockMatrixTypes';

function collectMatrixSymbols(spec: StrokeDockMatrixSpec): string[] {
  const out: string[] = [];
  const pushCell = (c: DockRowCellSpec) => {
    if (c.kind === 'pair') out.push(c.strong.symbol, c.weak.symbol);
    else if (c.kind === 'single') out.push(c.key.symbol);
  };
  for (const col of spec.directionalCols) { pushCell(col.top); pushCell(col.bottom); }
  for (const col of spec.centralCols) {
    if (col.kind === 'tall') out.push(col.key.symbol);
    else out.push(col.main.symbol, ...col.minis.map((m) => m.symbol));
  }
  return out;
}

// 1. Alfaia : A uniquement (0 'a' dans Dock, Inspecteur & Popover mobile), alias a -> A préservé
{
  const alfFr = buildStrokeDockMatrix('marcante', 'hands', true, false);
  const alfLeft = buildStrokeDockMatrix('marcante', 'hands', true, true);
  assert.deepEqual(alfFr.rows?.map((r) => r.text), ['Droite', 'Gauche']);
  assert.deepEqual(alfLeft.rows?.map((r) => r.text), ['Gauche', 'Droite']);
  assert.deepEqual(alfFr.directionalCols.map((c) => c.label), ['Peau', 'Abafado', 'Bacalhau']);
  assert.equal(alfFr.directionalCols[1].top.kind, 'empty');
  assert.deepEqual(alfFr.directionalCols[1].bottom, { kind: 'single', key: { symbol: 'A', title: undefined } });
  const syms = collectMatrixSymbols(alfFr);
  assert.ok(syms.includes('A') && !syms.includes('a'), 'Alfaia dock must expose A only (no lowercase a)');
  assert.ok(!getStrokesForInstrument('marcante', 'hands', 'fr', false).some((s) => s.symbol === 'a'));
  assert.ok(!getStrokesForRole('mc').weak.includes('a'), 'Mobile popover must not expose lowercase a on Alfaia');
  assert.equal(getNormalizedStroke('marcante', 'a'), 'A', 'Transparent a -> A alias must remain intact');
  assert.equal(getWheelNuanceState('A', 'down', 'marcante', 'hands', 'fr', false), 'A');
  assert.equal(getWheelNuanceState('e', 'down', 'marcante', 'hands', 'fr', false), 'e');
}

// 2. Caixa / Tarol : Rimshot remplace Cerclage+Peau, ordre Dock & Inspecteur synchronisés
{
  const cx = buildStrokeDockMatrix('caixa', 'hands', true, false);
  assert.deepEqual(cx.directionalCols.map((c) => c.label), ['Peau', 'Fla', 'Rimshot', 'Rufada']);
  const cxPairs = getStrokePairs('caixa', 'hands', 'fr', false);
  assert.deepEqual(cxPairs.map((p) => p.id), ['D', 'E', 'F', 'A', 'R', 'C', 'B']);
  assert.equal(cxPairs.find((p) => p.id === 'A')?.mainLabel, 'Rimshot');
  assert.equal(getWheelNuanceState('A', 'down', 'caixa', 'hands', 'fr', false), 'a');
  assert.equal(getWheelNuanceState('F', 'down', 'caixa', 'hands', 'fr', false), 'f');
  assert.equal(getWheelNuanceState('R', 'down', 'caixa', 'hands', 'fr', false), 'r');
}

// 3. Timbal : 7 colonnes directionnelles + Clap/Palma + Barulho 4 touches
{
  const tbBr = buildStrokeDockMatrix('timbal', 'hands', false, false);
  assert.deepEqual(tbBr.directionalCols.map((c) => c.label), ['Grave', 'Aberto', 'Slap', 'Dedos', 'Preso', 'Fla', 'Fla Slap']);
  assert.equal(tbBr.centralCols.length, 2);
  assert.equal(tbBr.centralCols[0].label, 'Palma');
  assert.deepEqual(getStrokePairs('timbal', 'hands', 'pt', false).map((p) => p.id), ['G', 'A', 'S', 'D', 'P', 'F', 'V', 'C', 'B']);
}

// 4. Gonguê (Grave/Aigu), Agbê (cohérence Gaucher E/D) & Mineiro (Pousser/Tirer) & Apito
{
  const ggBr = buildStrokeDockMatrix('gongue', 'gongue', false, false);
  assert.deepEqual(ggBr.rows?.map((r) => r.text), ['Grave — Topo', 'Agudo — Base']);
  assert.deepEqual(getStrokePairs('gongue', 'gongue', 'fr', false).map((p) => p.id), ['G', 'A', 'X', 'B']);

  const abRight = buildStrokeDockMatrix('agbe', 'shake', true, false);
  const abLeft = buildStrokeDockMatrix('agbe', 'shake', true, true);
  assert.equal(getVisualStrokeSymbol('E', true, 'agbe'), 'E', 'Agbê E stays invariant in left-handed mode');
  assert.equal(abRight.rows?.[0].text, 'Vers G.');
  assert.equal(abLeft.rows?.[0].text, 'Vers G.', 'Row label stays Vers G. alongside invariant E');
  assert.deepEqual(getStrokePairs('agbe', 'shake', 'fr', false).map((p) => p.id), ['E', 'D', 'S', 'B']);

  const miFr = buildStrokeDockMatrix('mineiro', 'shake', true, false);
  assert.deepEqual(miFr.rows?.map((r) => r.text), ['Pousser', 'Tirer']);
  assert.deepEqual(miFr.rows?.map((r) => r.arrow), ['up', 'down']);

  const apBr = buildStrokeDockMatrix('apito', 'hands', false, false);
  assert.equal(apBr.rows, null);
  assert.deepEqual(apBr.centralCols.map((c) => c.label), ['Longo', 'Curto']);
}

console.log('strokeDockMatrixConfig.test.ts: ALL ASSERTIONS PASSED');
