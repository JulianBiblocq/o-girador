
import { collection, getDocs, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CloudRhythmSignal } from '../../types';

export const fetchMestreSignals = async (
  mestreId: string,
  lastVisibleDoc?: any
): Promise<{ signals: CloudRhythmSignal[]; lastDoc: any }> => {
  if (!mestreId) return { signals: [], lastDoc: null };
  try {
    const mestreIdsToFetch = mestreId === 'global' ? ['global'] : ['global', mestreId];
    let q = query(collection(db, 'mestre_signals'), where('mestreId', 'in', mestreIdsToFetch), orderBy('createdAt', 'desc'));
    if (lastVisibleDoc) {
      q = query(q, startAfter(lastVisibleDoc));
    }
    const querySnapshot = await getDocs(query(q, limit(50)));
    const signals: CloudRhythmSignal[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as CloudRhythmSignal;
      const resolvedImage = (data.frames && data.frames[0] && data.frames[0].startsWith('data:'))
        ? data.frames[0]
        : (data.image && data.image.startsWith('data:'))
          ? data.image
          : (data.imageUrl && data.imageUrl.startsWith('data:'))
            ? data.imageUrl
            : (data.imageUrl || data.image || '');

      signals.push({
        ...data,
        image: resolvedImage,
      });
    });
    return {
      signals,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
    };
  } catch (err) {
    if (!(err && ((err as any).code === 'permission-denied' || String(err).includes('permission')))) {
      console.error('Error fetching mestre signals:', err);
    }
    return { signals: [], lastDoc: null };
  }
};
