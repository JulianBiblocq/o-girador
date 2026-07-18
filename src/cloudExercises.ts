import { db } from './firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, limit, orderBy, runTransaction, startAfter } from 'firebase/firestore';
import LZString from 'lz-string';

export type GameType = 'quiz' | 'dictee' | 'sablier' | 'inspecteur';

export interface CloudExercise {
  id: string;
  name: string;
  gameType: GameType;
  data: string; // LZString compressed JSON
  ownerId: string;
  createdAt: number;
}

export interface CloudProgression {
  id: string;
  name: string;
  data: string; // LZString compressed JSON of CordeConfig[]
  ownerId: string;
  createdAt: number;
}

const EXERCISES_COLLECTION = 'exercises';
const PROGRESSIONS_COLLECTION = 'progressions';

// --- EXERCISES (Individual Games) ---

/**
 * Checks if an exercise with the same name already exists for this mestre and gameType.
 */
export async function checkExerciseNameExists(ownerId: string, gameType: GameType, name: string): Promise<boolean> {
  const q = query(
    collection(db, EXERCISES_COLLECTION),
    where('ownerId', '==', ownerId),
    where('gameType', '==', gameType),
    where('name', '==', name)
  );
  const snapshot = await getDocs(query(q, limit(1)));
  return !snapshot.empty;
}

/**
 * Saves a single game exercise to the cloud.
 * Throws an error if the name already exists.
 */
export async function saveExerciseToCloud(
  name: string,
  gameType: GameType,
  exerciseData: any,
  ownerId: string
): Promise<string> {
  // 🛡️ FIX (Audit): Wrap check and creation in runTransaction to avoid race condition
  return await runTransaction(db, async (transaction) => {
    const docId = `${ownerId}_${name}`;
    const newDocRef = doc(collection(db, EXERCISES_COLLECTION), docId);
    
    const docSnap = await transaction.get(newDocRef);
    if (docSnap.exists()) {
      throw new Error('NAME_EXISTS');
    }

    const dataString = LZString.compressToBase64(JSON.stringify(exerciseData));
    
    transaction.set(newDocRef, {
      name,
      gameType,
      data: dataString,
      ownerId,
      createdAt: Date.now()
    });
    
    return newDocRef.id;
  });
}

/**
 * Fetches all exercises for a specific mestre and gameType.
 */
export async function fetchMestreExercises(ownerId: string, gameType: GameType, lastVisibleDoc?: any): Promise<{ exercises: CloudExercise[], lastDoc: any }> {
  // 🛡️ FIX (Audit): Added pagination support with startAfter
  let q = query(
    collection(db, EXERCISES_COLLECTION),
    where('ownerId', '==', ownerId),
    where('gameType', '==', gameType),
    orderBy('createdAt', 'desc')
  );
  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }
  const snapshot = await getDocs(query(q, limit(50)));
  
  return {
    exercises: snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<CloudExercise, 'id'>)
    })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

/**
 * Fetches all exercises for a specific mestre, regardless of gameType.
 */
export async function fetchAllMestreExercises(ownerId: string, lastVisibleDoc?: any): Promise<{ exercises: CloudExercise[], lastDoc: any }> {
  // 🛡️ FIX (Audit): Added pagination support with startAfter
  let q = query(
    collection(db, EXERCISES_COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }
  const snapshot = await getDocs(query(q, limit(50)));
  
  return {
    exercises: snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<CloudExercise, 'id'>)
    })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

export async function deleteExerciseFromCloud(id: string): Promise<void> {
  await deleteDoc(doc(db, EXERCISES_COLLECTION, id));
}

// --- PROGRESSIONS (Varal Cordes) ---

export async function checkProgressionNameExists(ownerId: string, name: string): Promise<boolean> {
  const q = query(
    collection(db, PROGRESSIONS_COLLECTION),
    where('ownerId', '==', ownerId),
    where('name', '==', name)
  );
  const snapshot = await getDocs(query(q, limit(1)));
  return !snapshot.empty;
}

export async function saveProgressionToCloud(
  name: string,
  progressionData: any,
  ownerId: string
): Promise<string> {
  const exists = await checkProgressionNameExists(ownerId, name);
  if (exists) {
    throw new Error('NAME_EXISTS');
  }

  const dataString = LZString.compressToBase64(JSON.stringify(progressionData));
  
  const docRef = await addDoc(collection(db, PROGRESSIONS_COLLECTION), {
    name,
    data: dataString,
    ownerId,
    createdAt: Date.now()
  });
  
  return docRef.id;
}

export async function saveOrUpdateProgressionToCloud(
  id: string | null,
  name: string,
  progressionData: any,
  ownerId: string
): Promise<string> {
  const dataString = LZString.compressToBase64(JSON.stringify(progressionData));

  if (id) {
    const docRef = doc(db, PROGRESSIONS_COLLECTION, id);
    await updateDoc(docRef, {
      name,
      data: dataString,
      lastUpdatedAt: Date.now()
    });
    return id;
  } else {
    const exists = await checkProgressionNameExists(ownerId, name);
    if (exists) {
      throw new Error('NAME_EXISTS');
    }
    const docRef = await addDoc(collection(db, PROGRESSIONS_COLLECTION), {
      name,
      data: dataString,
      ownerId,
      createdAt: Date.now()
    });
    return docRef.id;
  }
}

export async function fetchMestreProgressions(ownerId: string, lastVisibleDoc?: any): Promise<{ progressions: CloudProgression[], lastDoc: any }> {
  // 🛡️ FIX (Audit): Added pagination support with startAfter
  let q = query(
    collection(db, PROGRESSIONS_COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  if (lastVisibleDoc) {
    q = query(q, startAfter(lastVisibleDoc));
  }
  const snapshot = await getDocs(query(q, limit(50)));
  
  return {
    progressions: snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<CloudProgression, 'id'>)
    })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

export async function deleteProgressionFromCloud(id: string): Promise<void> {
  await deleteDoc(doc(db, PROGRESSIONS_COLLECTION, id));
}

// --- STUDENT PROGRESSION ---

const STUDENT_PROGRESS_COLLECTION = 'student_progressions';

export async function saveStudentProgressionToCloud(
  studentUid: string,
  completedExerciseIds: string[]
): Promise<void> {
  // We can use the studentUid as the document ID for quick retrieval
  const docRef = doc(db, STUDENT_PROGRESS_COLLECTION, studentUid);
  // Using updateDoc might fail if it doesn't exist, so we use setDoc (with merge) or similar, but since we imported updateDoc we can try to get it first
  const { setDoc } = await import('firebase/firestore');
  await setDoc(docRef, {
    completedExerciseIds,
    lastUpdatedAt: Date.now()
  }, { merge: true });
}

export async function fetchStudentProgressionFromCloud(studentUid: string): Promise<string[]> {
  const docRef = doc(db, STUDENT_PROGRESS_COLLECTION, studentUid);
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return data.completedExerciseIds || [];
  }
  return [];
}
