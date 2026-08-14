import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

let sessionStartTime: number | null = null;

/**
 * Starts a new session and sends a 'session_start' event to Firestore.
 * @param userProfile The user profile containing demographics
 * @param appId The application identifier
 * @param groupId Optional group identifier
 */
export const startSession = async (userProfile: any, appId: string, groupId?: string) => {
  if (sessionStartTime !== null) {
    // Session is already running
    return;
  }

  sessionStartTime = Date.now();

  const demographics = {
    ageGroup: userProfile?.ageGroup || 'unknown',
    gender: userProfile?.gender || 'unknown',
    country: userProfile?.country || 'unknown',
  };

  try {
    await addDoc(collection(db, 'hub_telemetry_daily'), {
      eventName: 'session_start',
      appId,
      groupId: groupId || null,
      userId: userProfile?.uid || null,
      timestamp: serverTimestamp(),
      demographics,
    });
  } catch (error) {
    console.error('Failed to send session_start telemetry:', error);
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
    console.error('Failed to send session_end telemetry:', error);
  }
};
