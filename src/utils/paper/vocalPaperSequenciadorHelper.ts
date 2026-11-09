/**
 * vocalPaperSequenciadorHelper.ts — Impression A4 100 % N&B des feuilles vocales (Grille Paysage 8 Temps Libres) et conversion vers Puxador & Coro (< 142 lignes).
 */
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { printViaInvisibleIframe } from '../print/printIframeHelper';
import { importToadaPackIntoSequencer } from '../toadaPackImporter';

const OPTICAL_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'] as const;
export function getVocalOpticalApiKey(): string {
  const env = (import.meta as any)?.env || {};
  return (env.VITE_GEMINI_API_KEY || (typeof localStorage !== 'undefined' && localStorage.getItem('girador_gemini_api_key')) || env.VITE_FIREBASE_API_KEY || '').trim();
}
export function setVocalOpticalApiKey(key: string): void {
  if (typeof localStorage !== 'undefined') { if (key.trim()) localStorage.setItem('girador_gemini_api_key', key.trim()); else localStorage.removeItem('girador_gemini_api_key'); }
}
const KEYBOARD_ROWS = [
  { key: 'A', label: 'La (A)', isBlack: false, strong: true }, { key: 'Bb', label: 'Si♭', isBlack: true }, { key: 'B', label: 'Si (B)', isBlack: false }, { key: 'C', label: 'Do (C)', isBlack: false, strong: true }, { key: 'C#', label: 'Do#', isBlack: true }, { key: 'D', label: 'Ré (D)', isBlack: false }, { key: 'Eb', label: 'Mi♭', isBlack: true }, { key: 'E', label: 'Mi (E)', isBlack: false }, { key: 'F', label: 'Fa (F)', isBlack: false }, { key: 'F#', label: 'Fa#', isBlack: true }, { key: 'G', label: 'Sol (G)', isBlack: false }, { key: 'G#', label: 'Sol#', isBlack: true },
];
const SEMITONE_FROM_A3: Record<string, number> = { A: 0, LA: 0, BB: 1, 'A#': 1, SIB: 1, 'SI♭': 1, B: 2, SI: 2, C: 3, DO: 3, DÓ: 3, 'C#': 4, 'DO#': 4, D: 5, RE: 5, RÉ: 5, EB: 6, 'D#': 6, MIB: 6, 'MI♭': 6, E: 7, MI: 7, F: 8, FA: 8, 'F#': 9, 'FA#': 9, G: 10, SOL: 10, 'G#': 11, 'SOL#': 11 };
const MIDI_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function printSequenciadorVocalSheet(sheetType: 'sequence' | 'notes_1m' | 'notes_2m' | 'rhythm_only' | 'instructions', meta?: { title?: string; bpm?: number; timeSignature?: string }): void {
  const orientation = sheetType === 'notes_1m' || sheetType === 'notes_2m' || sheetType === 'rhythm_only' ? 'landscape' : 'portrait', maxW = orientation === 'landscape' ? '283mm' : '196mm', pageH = orientation === 'landscape' ? 'calc(210mm - 14mm)' : 'calc(297mm - 14mm)';
  const titleText = (meta?.title || '______________________').toUpperCase(), bpm = meta?.bpm || '____', sig = meta?.timeSignature || '4/4';
  const sq = 'position:absolute;width:6mm;height:6mm;background:#000;color:#fff;font-size:6.5pt;display:flex;align-items:center;justify-content:center;font-weight:900;';
  const head = (code: string, t: string, sub: string) => `<div style="${sq}top:1.2mm;left:1.2mm;">■</div><div style="${sq}top:1.2mm;right:1.2mm;">■</div><div style="${sq}bottom:1.2mm;left:1.2mm;">■</div><div style="${sq}bottom:1.2mm;right:1.2mm;">■</div><div style="height:6mm;max-height:6.5mm;border-bottom:2px solid #000;padding-bottom:0.8mm;display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:baseline;gap:6px;overflow:hidden;white-space:nowrap;"><span style="font-size:9.2pt;font-weight:900;">${t}</span><span style="font-size:6.2pt;font-weight:700;">• ${sub}</span></div><span style="border:2px solid #000;padding:1px 6px;font-family:monospace;font-size:8pt;font-weight:900;">[CODE: ${code}]</span></div>`;
  const blankTemps = Array.from({ length: 8 }, () => `<th colspan="4" class="open-temps-cell" style="height:4.5mm;border-right:1.5px solid #000;"></th>`).join('');
  let body = '';
  if (sheetType === 'sequence') {
    const sys = [1, 9, 17, 25].map((s) => `<table><tr><th style="width:16mm;font-size:7.5pt;">MESURE</th>${Array.from({ length: 8 }, (_, i) => `<th style="height:18px;font-size:8pt;">M${s + i}</th>`).join('')}</tr><tr><td style="font-weight:900;font-size:8pt;">PUX</td>${Array.from({ length: 8 }, () => '<td style="height:26px;"></td>').join('')}</tr><tr><td style="font-weight:900;font-size:8pt;">COR</td>${Array.from({ length: 8 }, () => '<td style="height:26px;"></td>').join('')}</tr></table>`).join('');
    body = `${head('CHANT-SEQ', `FEUILLE 1 — SÉQUENCE & PAROLES (${titleText} • ${bpm} BPM • ${sig})`, 'Inscrire P1..Pn ou X (Pause) sur Pux et Cor • P5/P5 = Unisson • X/X = [PAUSE 1M]')}<div style="display:flex;flex-direction:column;justify-content:flex-start;gap:2.5mm;">${sys}</div>`;
  } else if (sheetType === 'notes_1m' || sheetType === 'notes_2m') {
    const code = sheetType === 'notes_2m' ? 'CHANT-NOTES-2M' : 'CHANT-NOTES-1M', tds = Array.from({ length: 32 }, (_, i) => `<td style="height:2.2mm;${(i + 1) % 4 === 0 ? 'border-right:1.5px solid #000;' : 'border-right:1px dotted #000;'}"></td>`).join('');
    const octs = Array.from({ length: 8 }, () => `<td colspan="4" class="open-beat-cell" style="height:5.5mm;border-right:1.5px solid #000;"></td>`).join(''), syls = Array.from({ length: 8 }, () => `<td colspan="4" class="open-beat-cell" style="height:9.5mm;border-right:1.5px solid #000;"></td>`).join('');
    const kb = KEYBOARD_ROWS.map((k) => `<tr style="${k.strong ? 'border-top:1.8px solid #000;' : ''}"><td class="${k.isBlack ? 'hatch-bw' : ''}" style="width:14mm;height:2.2mm;font-size:5.6pt;font-weight:900;text-align:left;padding-left:2px;border-right:2px solid #000;"><span style="background:#fff;padding:0 1px;">${k.label}</span></td>${tds}</tr>`).join('');
    body = `${head(code, 'FEUILLE 2 — PATTERNS & NOTES (A4 PAYSAGE • 8 TEMPS LIBRES / 32 SUBDIVISIONS)', `TITRE : ${titleText} • Numéroter TEMPS (1..4) • Trait (───) = note • SYLLABES sous le trait`)}<div style="display:flex;flex-direction:column;justify-content:flex-start;gap:2.5mm;">${Array.from({ length: 4 }, (_, idx) => `<div style="border:2px solid #000;page-break-inside:avoid;"><table><tr style="border-bottom:1.5px solid #000;"><th style="width:14mm;height:4.5mm;border-right:2px solid #000;line-height:1;"><span style="font-size:7pt;font-weight:900;">[ P${idx + 1} ]</span><span style="font-size:4.8pt;display:block;">TEMPS</span></th>${blankTemps}</tr><tr style="border-bottom:1.8px solid #000;"><td style="width:14mm;height:5.5mm;font-size:5.4pt;font-weight:900;border-right:2px solid #000;">OCT / ±<br/>(3/4/5)</td>${octs}</tr>${kb}<tr style="border-top:2px solid #000;"><td style="width:14mm;height:9.5mm;font-size:5.6pt;font-weight:900;border-right:2px solid #000;">SYLLABES</td>${syls}</tr></table></div>`).join('')}</div>`;
  } else if (sheetType === 'rhythm_only') {
    const rhythmCells = Array.from({ length: 32 }, (_, i) => `<td style="height:5.5mm;vertical-align:top;text-align:left;padding:0.2mm 0.5mm;font-size:4.8pt;font-weight:700;${(i + 1) % 4 === 0 ? 'border-right:1.5px solid #000;' : 'border-right:1px dotted #000;'}">${(i % 4) + 1}</td>`).join(''), openSyls = Array.from({ length: 8 }, () => `<td colspan="4" class="open-beat-cell" style="height:11mm;border-right:1.5px solid #000;"></td>`).join('');
    body = `${head('CHANT-RYTHME', 'FEUILLE 3 — PAROLES & RYTHME (A4 PAYSAGE • 8 TEMPS LIBRES / 32 SUBDIVISIONS)', `TITRE : ${titleText} • TEMPS (1..4) • Trait RYTHME (───) • SYLLABES ouverte`)}<div style="display:flex;flex-direction:column;justify-content:flex-start;gap:2.5mm;">${Array.from({ length: 6 }, (_, idx) => `<div style="border:2px solid #000;page-break-inside:avoid;"><table><tr style="border-bottom:1.5px solid #000;"><th style="width:14mm;height:4.5mm;border-right:2px solid #000;line-height:1;"><span style="font-size:7.2pt;font-weight:900;">[ P${idx + 1} ]</span><span style="font-size:4.8pt;display:block;">TEMPS</span></th>${blankTemps}</tr><tr style="border-bottom:2px solid #000;"><td style="width:14mm;height:5.5mm;font-size:5.3pt;font-weight:900;border-right:2px solid #000;">RYTHME<br/>(───)</td>${rhythmCells}</tr><tr><td style="width:14mm;height:11mm;font-size:5.6pt;font-weight:900;border-right:2px solid #000;">SYLLABES</td>${openSyls}</tr></table></div>`).join('')}</div>`;
  } else {
    body = `${head('CHANT-GUIDE', "FEUILLE 4 — GUIDE & CONVENTIONS D'ÉCRITURE MANUSCRITE", 'Atelier Papier du Chant — O Girador (100 % Noir & Blanc)')}<div style="font-size:9pt;line-height:1.42;display:flex;flex-direction:column;justify-content:flex-start;gap:2.5mm;flex:1;"><div style="border:2px solid #000;padding:8px;"><b>1. Grille Universelle A4 Paysage à 8 Temps Libres (32 subdivisions de 8.4mm) :</b> Inscrire les numéros de temps dans la bande <b>TEMPS (4.5mm)</b> : <b>2|3|4|1|2|3|4|1</b> (jusqu'à 3T d'anacrouse + 1M + chute +T1) ou <b>1|2|3|4|1|2|3|4</b> (2M complètes). Même code P__ sur 2 lignes = fusion multi-mesures.</div><div style="border:2px solid #000;padding:8px;"><b>2. Traits Horizontaux (───) & Bande SYLLABES ouverte :</b> Tracer un trait horizontal dans la ligne de note (ou la bande RYTHME 5.5mm) et écrire la syllabe sous le début du trait. Tiret <b>-</b> = même mot (VO- | VÓ). Apostrophe = élision (E'O).</div></div>`;
  }
  const full = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page{size:A4 ${orientation};margin:7mm;}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif;}.page{position:relative;max-width:${maxW};height:${pageH};margin:0 auto;padding:4mm 6.5mm;border:2px solid #000;display:flex;flex-direction:column;justify-content:flex-start;gap:2.5mm;overflow:hidden;}.hatch-bw{background-image:repeating-linear-gradient(45deg,#000 0,#000 1px,#fff 1px,#fff 3.5px)!important;}table{width:100%;border-collapse:collapse;table-layout:fixed;}th,td{border:1px solid #000;text-align:center;}</style></head><body><div class="page">${body}</div></body></html>`;
  printViaInvisibleIframe(full, `Atelier Papier Chant — ${sheetType}`);
}

const isAct = (c: any) => Boolean(c && (c.isTie || (c.pitchKey && String(c.pitchKey).trim()) || (c.durationSteps && c.durationSteps > 0) || (c.syllable && String(c.syllable).trim() && String(c.syllable).trim() !== '_')));

function normalizeAndMergeScanBlocks(rawBlocks: any[] = []): any[] {
  const merged = new Map<string, any>();
  for (const raw of rawBlocks) {
    let b = raw;
    if (Array.isArray(raw?.beatNumbers) || Array.isArray(raw?.cells)) {
      const digits = Array.from({ length: 8 }, (_, i) => { const m = String(raw.beatNumbers?.[i] ?? '').match(/[1-4]/); return m ? Number(m[0]) : null; });
      const anc = digits.findIndex((v) => v !== null), beats = anc < 0 ? [1, 2, 3, 4, 1, 2, 3, 4] : digits.map((ex, c) => ex ?? ((((digits[anc]! - 1) + (c - anc)) % 4 + 4) % 4 + 1));
      const map = new Map<number, any>((raw.cells || raw.mainCells || []).filter((c: any) => c && typeof c.stepIndex === 'number').map((c: any) => [c.stepIndex, { ...c }]));
      const hasColAct = (col: number) => [0, 1, 2, 3].some((s) => isAct(map.get(col * 4 + s))), startB = Math.max(0, beats.indexOf(1)), anacrusisCells: any[] = [], mainCells: any[] = [], tailCells: any[] = [];
      for (let col = 0; col < startB; col++) for (let s = 0; s < 4; s++) if (map.has(col * 4 + s)) anacrusisCells.push({ ...map.get(col * 4 + s), stepIndex: (beats[col] - 1) * 4 + s });
      const second234 = startB === 0 && [5, 6, 7].some((col) => hasColAct(col) || (digits[col] !== null && digits[col]! >= 2)), measuresCount = second234 ? 2 : 1;
      for (let off = 0; off < measuresCount * 4 && startB + off < 8; off++) for (let s = 0; s < 4; s++) if (map.has((startB + off) * 4 + s)) mainCells.push({ ...map.get((startB + off) * 4 + s), stepIndex: off * 4 + s });
      const tailCol = startB === 0 ? (!second234 && hasColAct(4) ? 4 : -1) : (startB + 4 < 8 && beats[startB + 4] === 1 && hasColAct(startB + 4) ? startB + 4 : -1);
      if (tailCol >= 0) for (let s = 0; s < 4; s++) if (map.has(tailCol * 4 + s)) tailCells.push({ ...map.get(tailCol * 4 + s), stepIndex: s });
      b = { ...raw, measuresCount, anacrusisCells, mainCells, tailCells, _anaSteps: 16 };
    }
    const key = String(b.code || 'P1').trim().toUpperCase(), prev = merged.get(key);
    if (!prev) merged.set(key, { ...b, code: key });
    else {
      const off = (prev.measuresCount || 1) * 16;
      prev.mainCells = [...(prev.mainCells || []), ...(b.mainCells || []).map((c: any) => ({ ...c, stepIndex: c.stepIndex + off }))];
      prev.measuresCount = Math.min(4, (prev.measuresCount || 1) + (b.measuresCount || 1));
      if (Array.isArray(b.tailCells) && b.tailCells.length > 0) prev.tailCells = b.tailCells;
    }
  }
  return Array.from(merged.values());
}

export function buildSequencerToadaPackFromVocalScan(scanResult: any, activeBpm = 88, customTitle?: string): Record<string, any> {
  const blocks = normalizeAndMergeScanBlocks(Array.isArray(scanResult?.patterns) ? scanResult.patterns : []), seqCols = Array.isArray(scanResult?.sequenceColumns) ? scanResult.sequenceColumns : [];
  const blockMap = new Map<string, any>(blocks.map((b: any, i: number) => [String(b.code || `P${i + 1}`).trim().toUpperCase(), { b, cardIdx: i }])), packPatterns: any[] = [], roleMap = new Map<string, any>();
  const toSteps = (cells: any[] = [], count: number, rhythmOnly: boolean, isFirstRef: { v: boolean }, lyricsRef: { v: string }) => {
    const map = new Map<number, any>(cells.filter((c) => c && typeof c.stepIndex === 'number').map((c) => [c.stepIndex, c]));
    for (const c of cells) if (c && typeof c.stepIndex === 'number' && c.durationSteps && c.durationSteps > 1) for (let k = 1; k < c.durationSteps; k++) if (c.stepIndex + k < count && !map.has(c.stepIndex + k)) map.set(c.stepIndex + k, { stepIndex: c.stepIndex + k, isTie: true, syllable: '───' });
    let lastMidi = 60;
    return Array.from({ length: count }, (_, idx) => {
      const c = map.get(idx), rawSyl = String(c?.syllable || '').trim(), isTie = Boolean(c?.isTie || rawSyl === '───' || rawSyl === '---' || rawSyl === '───►');
      if (!isTie && !rawSyl && !c?.pitchKey) return { stepIndex: idx, active: false, note: 'C4', midiNumber: 60, velocity: 0, decay: 0 };
      if (isTie) return { stepIndex: idx, active: true, isTie: true, note: '───', midiNumber: lastMidi, syllable: '───', velocity: 82, decay: 100 };
      const off = SEMITONE_FROM_A3[String(c?.pitchKey || 'C').trim().toUpperCase()] ?? 3, octShift = typeof c?.octaveShift === 'number' ? c.octaveShift : typeof c?.octave === 'number' ? c.octave - 4 : 0;
      const midi = rhythmOnly ? 60 : Math.max(36, Math.min(84, 57 + off + Number(octShift) * 12)); lastMidi = midi;
      const joins = rawSyl.endsWith('-'), baseSyl = rawSyl.replace(/-+$/, '').replace(/[’‘]/g, "'"), cleanSyl = isFirstRef.v ? baseSyl.charAt(0).toUpperCase() + baseSyl.slice(1).toLowerCase() : baseSyl.toLowerCase();
      if (cleanSyl) { isFirstRef.v = false; lyricsRef.v += joins ? cleanSyl : `${cleanSyl} `; }
      return { stepIndex: idx, active: true, isTie: false, note: `${MIDI_NOTES[midi % 12]}${Math.floor(midi / 12) - 1}`, midiNumber: midi, syllable: cleanSyl || 'la', velocity: 92, decay: 100 };
    });
  };
  const getOrCreate = (code: string, role: 'puxador' | 'coro') => {
    const norm = code.trim().toUpperCase(), key = `${norm}_${role}`, entry = blockMap.get(norm);
    if (roleMap.has(key)) return roleMap.get(key);
    if (!entry) return null;
    const { b, cardIdx } = entry, isFirstRef = { v: true }, lyricsRef = { v: '' }, measuresCount = Math.max(1, Math.min(4, Number(b.measuresCount || 1)));
    const hasAna = Array.isArray(b.anacrusisCells) && b.anacrusisCells.some(isAct), hasTail = Array.isArray(b.tailCells) && b.tailCells.some(isAct), anaLen = b._anaSteps || ((b.anacrusisCells || []).some((c: any) => (c?.stepIndex ?? 0) >= 8) ? 16 : 8);
    const ana = hasAna ? toSteps(b.anacrusisCells, anaLen, Boolean(b.rhythmOnlyMode), isFirstRef, lyricsRef) : [], main = toSteps(b.mainCells, measuresCount * 16, Boolean(b.rhythmOnlyMode), isFirstRef, lyricsRef);
    const tail = hasTail ? toSteps(b.tailCells, 4, Boolean(b.rhythmOnlyMode), isFirstRef, lyricsRef).map((s, i) => ({ ...s, stepIndex: measuresCount * 16 + i })) : [];
    const pat = { id: `scan-${norm}-${role}`, cardIndex: cardIdx, name: b.name || `${norm} (${role === 'puxador' ? 'Pux' : 'Cor'})`, role, measuresCount, bpm: activeBpm, baseBpm: activeBpm, hasAnacrusis: hasAna, hasTailBeat: hasTail, exitBeat: hasTail ? 1 : undefined, ignoreMelodyPitch: Boolean(b.rhythmOnlyMode), anacrusisSteps: ana, mainSteps: [...main, ...tail], assignedLyricsText: lyricsRef.v.trim() };
    packPatterns.push(pat); roleMap.set(key, pat); return pat;
  };
  const slots: any[] = [], normCode = (c: any) => (!c || ['X', '-', '—', '_'].includes(String(c).trim().toUpperCase()) ? null : String(c).trim().toUpperCase());
  if (seqCols.length > 0) {
    seqCols.forEach((col: any, i: number) => {
      const pCode = normCode(col.puxCode), cCode = normCode(col.corCode), prev = slots[slots.length - 1];
      if (!pCode && !cCode) { if (prev && !prev.puxadorPatternId && !prev.coroPatternId) prev.advanceMeasures = (prev.advanceMeasures || 1) + 1; else slots.push({ slotId: `s-${i}`, puxadorPatternId: null, coroPatternId: null, advanceMeasures: 1 }); return; }
      const pux = pCode ? getOrCreate(pCode, 'puxador') : null, cor = cCode ? getOrCreate(cCode, 'coro') : null;
      slots.push({ slotId: `s-${i}`, puxadorPatternId: pux?.id || null, coroPatternId: cor?.id || null, advanceMeasures: Math.max(pux?.measuresCount || 1, cor?.measuresCount || 1) });
    });
  } else blocks.forEach((b: any, i: number) => { const p = getOrCreate(b.code || `P${i + 1}`, 'puxador'); if (p) slots.push({ slotId: `s-${i}`, puxadorPatternId: p.id, coroPatternId: null, advanceMeasures: p.measuresCount }); });
  return { id: `vocal-paper-${Date.now()}`, title: customTitle || scanResult?.title || 'Toada Manuscrit', bpm: activeBpm, timeSignature: scanResult?.timeSignature || '4/4', patterns: packPatterns, slots };
}

export async function scanAndInjectVocalPaperInSequenciador(photoDataUrls: string[], activeBpm: number, customTitle?: string, customKey?: string): Promise<{ success: boolean; count?: number; error?: string }> {
  const apiKey = customKey?.trim() || getVocalOpticalApiKey();
  if (!apiKey) return { success: false, error: "Clé d'accès requise pour le service de lecture optique." };
  let refLyrics = '';
  if (customTitle?.trim()) {
    try {
      const normT = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''), target = normT(customTitle), snap = await getDocs(query(collection(db, 'documents'), limit(200)));
      snap.forEach((d) => { const data = d.data(); if (!refLyrics && normT(String(data.titre || '')) === target) refLyrics = String(data.parolesOriginales || data.rawTxtCode || '').replace(/<[^>]+>/g, ' ').trim(); });
    } catch {}
  }
  const refBlock = refLyrics ? `\nTEXTE OFFICIEL :\n"""${refLyrics}"""\n« Utilise obligatoirement les mots et syllabes du texte officiel fourni pour identifier chaque syllabe manuscrite, tout en respectant à 100 % les cases de temps/subdivisions où elles sont inscrites sur la grille. »\n` : '';
  const prompt = `Tu es le moteur de lecture optique de l'Atelier Papier du Chant (O Girador). Analyse ces photos (CHANT-SEQ, CHANT-NOTES-1M/2M, CHANT-RYTHME Paysage à 8 temps libres / 32 subdivisions). Lis beatNumbers (8 chiffres de la bande TEMPS) et cells (stepIndex 0..31, durationSteps, pitchKey La..Sol#, octaveShift et syllabes).${refBlock}Réponds UNIQUEMENT en JSON valide.`;
  const parts: any[] = [{ text: prompt }, ...photoDataUrls.map((u) => ({ inline_data: { mime_type: 'image/jpeg', data: u.replace(/^data:image\/\w+;base64,/, '') } }))];
  for (const model of OPTICAL_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { response_mime_type: 'application/json', temperature: 0.1 } }) });
      if (!res.ok) continue;
      const json = await res.json(), raw = (json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}').replace(/```json|```/gi, '').trim();
      const pack = buildSequencerToadaPackFromVocalScan(JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw), activeBpm, customTitle);
      const imp = await importToadaPackIntoSequencer(null, { pack, deployStartMeasureIdx: 0, preserveMasterBpm: true });
      return { success: true, count: imp.count };
    } catch {}
  }
  return { success: false, error: 'Échec de la lecture optique multi-pages.' };
}
