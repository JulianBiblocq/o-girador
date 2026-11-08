/**
 * vocalPaperSequenciadorHelper.ts
 * Impression A4 100 % N&B des 4 feuilles vocales et conversion multi-photos vers les pistes 5. Puxador & 6. Coro (< 138 lignes).
 * Préserve les pistes de percussion (instrumentIdx < 10) et le BPM maître du Batuque.
 */
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
  { key: 'A', label: 'La (A)', isBlack: false, strong: true }, { key: 'Bb', label: 'Si♭', isBlack: true }, { key: 'B', label: 'Si (B)', isBlack: false },
  { key: 'C', label: 'Do (C)', isBlack: false, strong: true }, { key: 'C#', label: 'Do#', isBlack: true }, { key: 'D', label: 'Ré (D)', isBlack: false },
  { key: 'Eb', label: 'Mi♭', isBlack: true }, { key: 'E', label: 'Mi (E)', isBlack: false }, { key: 'F', label: 'Fa (F)', isBlack: false },
  { key: 'F#', label: 'Fa#', isBlack: true }, { key: 'G', label: 'Sol (G)', isBlack: false }, { key: 'G#', label: 'Sol#', isBlack: true },
];
const SEMITONE_FROM_A3: Record<string, number> = { A: 0, LA: 0, BB: 1, 'A#': 1, SIB: 1, 'SI♭': 1, B: 2, SI: 2, C: 3, DO: 3, DÓ: 3, 'C#': 4, 'DO#': 4, D: 5, RE: 5, RÉ: 5, EB: 6, 'D#': 6, MIB: 6, 'MI♭': 6, E: 7, MI: 7, F: 8, FA: 8, 'F#': 9, 'FA#': 9, G: 10, SOL: 10, 'G#': 11, 'SOL#': 11 };
const MIDI_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function printSequenciadorVocalSheet(sheetType: 'sequence' | 'notes_1m' | 'notes_2m' | 'rhythm_only' | 'instructions', meta?: { title?: string; bpm?: number; timeSignature?: string }): void {
  const orientation = sheetType === 'notes_2m' ? 'landscape' : 'portrait', maxW = orientation === 'landscape' ? '281mm' : '194mm', pageH = orientation === 'landscape' ? 'calc(210mm - 14mm)' : 'calc(297mm - 14mm)';
  const titleText = (meta?.title || '______________________').toUpperCase(), bpm = meta?.bpm || '____', sig = meta?.timeSignature || '4/4';
  const sq = 'position:absolute;width:6.5mm;height:6.5mm;background:#000;color:#fff;font-size:7pt;display:flex;align-items:center;justify-content:center;font-weight:900;';
  const head = (code: string, t: string, sub: string) => `<div style="${sq}top:1.5mm;left:1.5mm;">■</div><div style="${sq}top:1.5mm;right:1.5mm;">■</div><div style="${sq}bottom:1.5mm;left:1.5mm;">■</div><div style="${sq}bottom:1.5mm;right:1.5mm;">■</div><div style="border-bottom:2px solid #000;padding-bottom:3px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:11pt;font-weight:900;">${t}</div><div style="font-size:7.5pt;font-weight:700;">${sub}</div></div><span style="border:2px solid #000;padding:1px 6px;font-family:monospace;font-size:8.5pt;font-weight:900;">[CODE: ${code}]</span></div>`;

  let body = '';
  if (sheetType === 'sequence') {
    const sys = [1, 9, 17, 25].map((s) => `<table style="margin-bottom:4px;"><tr><th style="width:16mm;font-size:7.5pt;">MESURE</th>${Array.from({ length: 8 }, (_, i) => `<th style="height:18px;font-size:8pt;">M${s + i}</th>`).join('')}</tr><tr><td style="font-weight:900;font-size:8pt;">PUX</td>${Array.from({ length: 8 }, () => '<td style="height:24px;"></td>').join('')}</tr><tr><td style="font-weight:900;font-size:8pt;">COR</td>${Array.from({ length: 8 }, () => '<td style="height:24px;"></td>').join('')}</tr></table>`).join('');
    body = `${head('CHANT-SEQ', `FEUILLE 1 — SÉQUENCE & PAROLES (${titleText} • ${bpm} BPM • ${sig})`, 'Inscrire P1..Pn ou X (Pause) sur Pux et Cor • P5/P5 = Unisson • X/X = [PAUSE 1M]')}${sys}`;
  } else if (sheetType === 'notes_1m' || sheetType === 'notes_2m') {
    const is2M = sheetType === 'notes_2m', count = is2M ? 2 : 3, cols = ((is2M ? 2 : 1) * 4 + 3) * 4;
    const tds = Array.from({ length: cols }, (_, i) => `<td style="height:11px;${(i + 1) % 4 === 0 ? 'border-right:2px solid #000;' : ''}"></td>`).join('');
    const syls = Array.from({ length: cols }, (_, i) => `<td style="height:21px;${(i + 1) % 4 === 0 ? 'border-right:2px solid #000;' : ''}"></td>`).join('');
    const kb = KEYBOARD_ROWS.map((k) => `<tr style="${k.strong ? 'border-top:2px solid #000;' : ''}"><td class="${k.isBlack ? 'hatch-bw' : ''}" style="width:15mm;font-size:6.5pt;font-weight:900;text-align:left;padding-left:2px;border-right:2px solid #000;"><span style="background:#fff;padding:0 1px;">${k.label}</span></td>${tds}</tr>`).join('');
    body = `${head(is2M ? 'CHANT-NOTES-2M' : 'CHANT-NOTES-1M', `FEUILLE 2 — PATTERNS & CLAVIER 1 OCTAVE (${is2M ? '2 MESURES' : '1 MESURE'})`, 'Clavier La ➔ Sol# • Touches noires hachurées N&B • Syllabes en MAJUSCULES BÂTONS')}${Array.from({ length: count }, (_, idx) => `<div style="border:2px solid #000;margin-bottom:4px;"><div style="padding:2px 6px;font-size:8pt;font-weight:900;border-bottom:1.5px solid #000;">[ PATTERN : P${idx + 1} ] (Neutre — Ana T3-T4 | Temps 1..4 | +T1)</div><table><tr><td style="width:15mm;font-size:6.5pt;font-weight:900;border-right:2px solid #000;">OCT / ±</td>${tds}</tr>${kb}<tr style="border-top:2px solid #000;"><td style="font-size:6.5pt;font-weight:900;border-right:2px solid #000;">SYLLABES</td>${syls}</tr></table></div>`).join('')}`;
  } else if (sheetType === 'rhythm_only') {
    const ths = ['ANA T3', 'ANA T4', 'TEMPS 1', 'TEMPS 2', 'TEMPS 3', 'TEMPS 4', '+T1'].map((h) => `<th colspan="4" style="font-size:7.5pt;border-right:2px solid #000;">${h}</th>`).join('');
    const cells = Array.from({ length: 28 }, (_, i) => `<td style="height:26px;${(i + 1) % 4 === 0 ? 'border-right:2px solid #000;' : ''}"></td>`).join('');
    body = `${head('CHANT-RYTHME', `FEUILLE 3 — PAROLES & RYTHME SEUL (${titleText})`, 'Syllabes en MAJUSCULES BÂTONS • Tiret "-" = même mot • "───►" = tenue • "E\'O" = élision')}${Array.from({ length: 5 }, (_, idx) => `<div style="border:2px solid #000;margin-bottom:5px;"><div style="padding:2px 6px;font-size:8pt;font-weight:900;border-bottom:1.5px solid #000;">[ PATTERN : P${idx + 1} ] (Rythme & Syllabes — Sans Notes)</div><table><tr>${ths}</tr><tr>${cells}</tr></table></div>`).join('')}`;
  } else {
    body = `${head('CHANT-GUIDE', "FEUILLE 4 — GUIDE & CONVENTIONS D'ÉCRITURE MANUSCRITE", 'Atelier Papier du Chant — O Girador (100 % Noir & Blanc)')}<div style="font-size:9pt;line-height:1.45;display:flex;flex-direction:column;gap:8px;flex:1;"><div style="border:2px solid #000;padding:8px;"><b>1. Séparation Patterns / Rôles :</b> Patterns neutres [Pattern : P1..Pn]. Sur la Feuille Séquence : <b>Pux : P1 - P2 - X - X - P5</b> / <b>Cor : X - X - P3 - P4 - P5</b>.</div><div style="border:2px solid #000;padding:8px;"><b>2. Syllabes & Liaisons :</b> Tiret <b>-</b> = même mot (VO- | VÓ). Apostrophe = élision (E'O). Flèche <b>───►</b> = tenue.</div></div>`;
  }
  const full = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page{size:A4 ${orientation};margin:7mm;}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif;}.page{position:relative;max-width:${maxW};height:${pageH};margin:0 auto;padding:8.5mm 9mm;border:2px solid #000;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;}.hatch-bw{background-image:repeating-linear-gradient(45deg,#000 0,#000 1px,#fff 1px,#fff 3.5px)!important;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;text-align:center;}</style></head><body><div class="page">${body}</div></body></html>`;
  printViaInvisibleIframe(full, `Atelier Papier Chant — ${sheetType}`);
}

export function buildSequencerToadaPackFromVocalScan(scanResult: any, activeBpm = 88, customTitle?: string): Record<string, any> {
  const blocks = Array.isArray(scanResult?.patterns) ? scanResult.patterns : [];
  const seqCols = Array.isArray(scanResult?.sequenceColumns) ? scanResult.sequenceColumns : [];
  const blockMap = new Map<string, any>(blocks.map((b: any, i: number) => [String(b.code || `P${i + 1}`).trim().toUpperCase(), { b, cardIdx: i }]));
  const packPatterns: any[] = [], roleMap = new Map<string, any>();

  const toSteps = (cells: any[] = [], count: number, rhythmOnly: boolean, isFirstRef: { v: boolean }, lyricsRef: { v: string }) => {
    const map = new Map<number, any>();
    for (const c of cells) if (c && typeof c.stepIndex === 'number') map.set(c.stepIndex, c);
    let lastMidi = 60;
    return Array.from({ length: count }, (_, idx) => {
      const c = map.get(idx), rawSyl = String(c?.syllable || '').trim();
      const isTie = Boolean(c?.isTie || rawSyl === '───' || rawSyl === '---' || rawSyl === '───►');
      if (!isTie && !rawSyl && !c?.pitchKey) return { stepIndex: idx, active: false, note: 'C4', midiNumber: 60, velocity: 0, decay: 0 };
      if (isTie) return { stepIndex: idx, active: true, isTie: true, note: '───', midiNumber: lastMidi, syllable: '───', velocity: 82, decay: 100 };
      const off = SEMITONE_FROM_A3[String(c?.pitchKey || 'C').trim().toUpperCase()] ?? 3;
      const midi = rhythmOnly ? 60 : Math.max(36, Math.min(84, 57 + off + Number(c?.octaveShift || 0) * 12));
      lastMidi = midi;
      const joins = rawSyl.endsWith('-'), baseSyl = rawSyl.replace(/-+$/, '').replace(/[’‘]/g, "'");
      const cleanSyl = isFirstRef.v ? baseSyl.charAt(0).toUpperCase() + baseSyl.slice(1).toLowerCase() : baseSyl.toLowerCase();
      if (cleanSyl) { isFirstRef.v = false; lyricsRef.v += joins ? cleanSyl : `${cleanSyl} `; }
      return { stepIndex: idx, active: true, isTie: false, note: `${MIDI_NOTES[midi % 12]}${Math.floor(midi / 12) - 1}`, midiNumber: midi, syllable: cleanSyl || 'la', velocity: 92, decay: 100 };
    });
  };

  const getOrCreate = (code: string, role: 'puxador' | 'coro') => {
    const norm = code.trim().toUpperCase(), key = `${norm}_${role}`;
    if (roleMap.has(key)) return roleMap.get(key);
    const entry = blockMap.get(norm);
    if (!entry) return null;
    const { b, cardIdx } = entry, isFirstRef = { v: true }, lyricsRef = { v: '' };
    const measuresCount = Math.max(1, Math.min(4, Number(b.measuresCount || 1)));
    const ana = b.hasAnacrusis ? toSteps(b.anacrusisCells, 8, Boolean(b.rhythmOnlyMode), isFirstRef, lyricsRef) : [];
    const main = toSteps(b.mainCells, measuresCount * 16, Boolean(b.rhythmOnlyMode), isFirstRef, lyricsRef);
    const tail = b.hasTailBeat ? toSteps(b.tailCells, 4, Boolean(b.rhythmOnlyMode), isFirstRef, lyricsRef).map((s, i) => ({ ...s, stepIndex: measuresCount * 16 + i })) : [];
    const pat = {
      id: `scan-${norm}-${role}`, cardIndex: cardIdx, name: b.name || `${norm} (${role === 'puxador' ? 'Pux' : 'Cor'})`,
      role, measuresCount, bpm: activeBpm, baseBpm: activeBpm, hasAnacrusis: Boolean(b.hasAnacrusis), hasTailBeat: Boolean(b.hasTailBeat),
      ignoreMelodyPitch: Boolean(b.rhythmOnlyMode), anacrusisSteps: ana, mainSteps: [...main, ...tail], assignedLyricsText: lyricsRef.v.trim(),
    };
    packPatterns.push(pat); roleMap.set(key, pat);
    return pat;
  };

  const slots: any[] = [];
  const normCode = (c: any) => (!c || ['X', '-', '—', '_'].includes(String(c).trim().toUpperCase()) ? null : String(c).trim().toUpperCase());
  if (seqCols.length > 0) {
    seqCols.forEach((col: any, i: number) => {
      const pCode = normCode(col.puxCode), cCode = normCode(col.corCode);
      if (!pCode && !cCode) {
        const prev = slots[slots.length - 1];
        if (prev && !prev.puxadorPatternId && !prev.coroPatternId) prev.advanceMeasures = (prev.advanceMeasures || 1) + 1;
        else slots.push({ slotId: `s-${i}`, puxadorPatternId: null, coroPatternId: null, advanceMeasures: 1 });
        return;
      }
      const pux = pCode ? getOrCreate(pCode, 'puxador') : null, cor = cCode ? getOrCreate(cCode, 'coro') : null;
      slots.push({ slotId: `s-${i}`, puxadorPatternId: pux?.id || null, coroPatternId: cor?.id || null, advanceMeasures: Math.max(pux?.measuresCount || 1, cor?.measuresCount || 1) });
    });
  } else {
    blocks.forEach((b: any, i: number) => { const p = getOrCreate(b.code || `P${i + 1}`, 'puxador'); if (p) slots.push({ slotId: `s-${i}`, puxadorPatternId: p.id, coroPatternId: null, advanceMeasures: p.measuresCount }); });
  }
  return { id: `vocal-paper-${Date.now()}`, title: customTitle || scanResult?.title || 'Toada Manuscrit', bpm: activeBpm, timeSignature: scanResult?.timeSignature || '4/4', patterns: packPatterns, slots };
}

export async function scanAndInjectVocalPaperInSequenciador(photoDataUrls: string[], activeBpm: number, customTitle?: string, customKey?: string): Promise<{ success: boolean; count?: number; error?: string }> {
  const apiKey = customKey?.trim() || getVocalOpticalApiKey();
  if (!apiKey) return { success: false, error: "Clé d'accès requise pour le service de lecture optique." };
  const prompt = `Tu es le moteur de lecture optique de l'Atelier Papier du Chant (O Girador). Analyse ces photos (CHANT-SEQ, CHANT-NOTES-1M/2M, CHANT-RYTHME) et réponds UNIQUEMENT en JSON valide: {"title":"...","sequenceColumns":[{"measureNumber":1,"puxCode":"P1","corCode":"X"}],"patterns":[{"code":"P1","measuresCount":1,"hasAnacrusis":false,"hasTailBeat":false,"rhythmOnlyMode":false,"anacrusisCells":[],"mainCells":[{"stepIndex":0,"syllable":"VO-","isTie":false,"pitchKey":"C","octaveShift":0}],"tailCells":[]}]}`;
  const parts: any[] = [{ text: prompt }, ...photoDataUrls.map((u) => ({ inline_data: { mime_type: 'image/jpeg', data: u.replace(/^data:image\/\w+;base64,/, '') } }))];
  for (const model of OPTICAL_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { response_mime_type: 'application/json', temperature: 0.1 } }),
      });
      if (!res.ok) continue;
      const json = await res.json(), raw = (json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}').replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
      const pack = buildSequencerToadaPackFromVocalScan(parsed, activeBpm, customTitle);
      const imp = await importToadaPackIntoSequencer(null, { pack, deployStartMeasureIdx: 0, preserveMasterBpm: true });
      return { success: true, count: imp.count };
    } catch {}
  }
  return { success: false, error: 'Échec de la lecture optique multi-pages.' };
}