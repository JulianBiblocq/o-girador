/**
 * cloudToadas.ts
 * Service Firestore de consultation des Toadas publiées depuis Cantador (< 80 lignes).
 */
import { collection, doc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
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
      const title = data.project?.title || data.metadata?.title || data.title || 'Toada sans titre';
      const bpm = data.project?.bpm || data.metadata?.bpm || data.bpm;
      const patternsCount = Array.isArray(data.patterns) ? data.patterns.length : 0;
      const updatedAt = Number(data.updatedAt || data.project?.updatedAt || data.createdAt || Date.now());
      items.push({
        id: d.id,
        title,
        bpm,
        patternsCount,
        updatedAt,
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
    const docRef = doc(db, 'toada_packs', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error(`[cloudToadas] Erreur récupération toada ${id} :`, err);
    return null;
  }
}
