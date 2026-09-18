import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

let sessionStartTime: number | null = null;
let isWriting = false;

/**
 * Starts a new session and sends a 'session_start' event to Firestore.
 * @param userProfile The user profile containing demographics
 * @param appId The application identifier
 * @param groupId Optional group identifier
 */
export const startSession = async (userProfile: any, appId: string, groupId?: string) => {
  if (sessionStartTime !== null || isWriting) {
    // Session is already running or write in progress
    return;
  }

  sessionStartTime = Date.now();

  const demographics = {
    ageGroup: userProfile?.ageGroup || 'unknown',
    gender: userProfile?.gender || 'unknown',
    country: userProfile?.country || 'unknown',
  };

  try {
    isWriting = true;
    await addDoc(collection(db, 'hub_telemetry_daily'), {
      eventName: 'session_start',
      appId,
      groupId: groupId || null,
      userId: userProfile?.uid || null,
      timestamp: serverTimestamp(),
      demographics,
    });
  } catch (error) {
    console.warn('Telemetry session_start ignored:', error);
  } finally {
    isWriting = false;
  }
};

/**
 * Ends the current session and sends a 'session_end' event to Firestore with the duration.
 * @param appId The application identifier
 * @param groupId Optional group identifier
 */
export const endSession = async (appId: string, groupId?: string, userId?: string) => {
  if (sessionStartTime === null) {
    // No active session to end
    return;
  }

  const durationInSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
  sessionStartTime = null;

  // Ignore transient flashes / rapid unmounts < 2s to avoid polluting telemetry and exhausting write queues
  if (durationInSeconds < 2) {
    return;
  }

  try {
    await addDoc(collection(db, 'hub_telemetry_daily'), {
      eventName: 'session_end',
      appId,
      groupId: groupId || null,
      userId: userId || null,
      duration: durationInSeconds,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Telemetry session_end ignored:', error);
  }
};
