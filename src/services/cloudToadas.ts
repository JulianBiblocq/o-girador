/**
 * cloudToadas.ts
 * Service Firestore de consultation des Toadas publiées depuis Cantador (`/toada_packs`)
 * et de synchronisation bidirectionnelle de la Tonalité Troupe (`transpositionSemitones`, `troupeKey`) (< 120 lignes).
 */
import { collection, doc, getDoc, getDocs, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface CloudToadaSummary {
  id: string;
  title: string;
  bpm?: number;
  patternsCount: number;
  updatedAt: number;
  nacao?: string;
  rythme?: string;
  author?: string;
}

const SOLFEGE_FR = ['Do', 'Do#', 'Ré', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'Sib', 'Si'];
const ROOT_TO_PC: Record<string, number> = {
  DO: 0, 'DÓ': 0, C: 0, 'DO#': 1, 'DÓ#': 1, 'C#': 1, REB: 1, 'RÉB': 1, DB: 1,
  RE: 2, 'RÉ': 2, D: 2, 'RE#': 3, 'RÉ#': 3, 'D#': 3, MIB: 3, EB: 3, MI: 4, E: 4,
  FA: 5, 'FÁ': 5, F: 5, 'FA#': 6, 'FÁ#': 6, 'F#': 6, SOLB: 6, GB: 6,
  SOL: 7, G: 7, 'SOL#': 8, 'G#': 8, LAB: 8, AB: 8, LA: 9, 'LÁ': 9, A: 9,
  'LA#': 10, 'LÁ#': 10, 'A#': 10, SIB: 10, BB: 10, SI: 11, B: 11,
};

export function computeTransposedTroupeKey(sungKey: string | undefined, transpositionSemitones: number): string {
  const raw = (sungKey || 'Do Majeur').trim();
  const parts = raw.split(/\s+/);
  const rootToken = (parts[0] || 'Do').toUpperCase();
  const modeSuffix = parts.slice(1).join(' ');
  const basePc = ROOT_TO_PC[rootToken] ?? 0;
  const shift = Math.round(transpositionSemitones || 0);
  const nextPc = (((basePc + shift) % 12) + 12) % 12;
  const nextRoot = SOLFEGE_FR[nextPc] || 'Do';
  return modeSuffix ? `${nextRoot} ${modeSuffix}` : nextRoot;
}

export async function syncCloudToadaTransposition(
  packId: string | undefined,
  transpositionSemitones: number,
  sungKey?: string
): Promise<{ troupeKey: string; transpositionSemitones: number } | null> {
  const clamped = Math.max(-12, Math.min(12, Math.round(transpositionSemitones || 0)));
  const troupeKey = computeTransposedTroupeKey(sungKey, clamped);
  if (!packId) return { troupeKey, transpositionSemitones: clamped };
  try {
    const docRef = doc(db, 'toada_packs', packId);
    await updateDoc(docRef, {
      transpositionSemitones: clamped,
      troupeKey,
      'project.transpositionSemitones': clamped,
      'project.troupeKey': troupeKey,
      'metadata.transpositionSemitones': clamped,
      'metadata.troupeKey': troupeKey,
      'toadaMeta.transpositionSemitones': clamped,
      'toadaMeta.tonaliteDefaut': troupeKey,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn(`[cloudToadas] Synchronisation transposition /toada_packs/${packId} ignorée ou hors-ligne :`, err);
  }
  return { troupeKey, transpositionSemitones: clamped };
}

export async function fetchCloudToadas(): Promise<CloudToadaSummary[]> {
  try {
    const collRef = collection(db, 'toada_packs');
    let snap;
    try {
      snap = await getDocs(query(collRef, orderBy('updatedAt', 'desc'), limit(50)));
    } catch {
      snap = await getDocs(query(collRef, limit(50)));
    }
    const items: CloudToadaSummary[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        title: data.project?.title || data.metadata?.title || data.title || 'Toada sans titre',
        bpm: data.project?.bpm || data.metadata?.bpm || data.bpm,
        patternsCount: Array.isArray(data.patterns) ? data.patterns.length : 0,
        updatedAt: Number(data.updatedAt || data.project?.updatedAt || data.createdAt || Date.now()),
        nacao: data.metadata?.nacao || data.nacao,
        rythme: data.metadata?.rythme || data.rythme,
        author: data.metadata?.author || data.author,
      });
    });
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('[cloudToadas] Erreur récupération toadas :', err);
    return [];
  }
}

export async function fetchCloudToadaById(id: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, 'toada_packs', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error(`[cloudToadas] Erreur récupération toada ${id} :`, err);
    return null;
  }
}
