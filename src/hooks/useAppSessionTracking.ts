
import React from 'react';
import { UserProfile } from '../contexts/AuthContext';
import { startSession, endSession } from '../utils/O-Girador-Tracker';

export function useAppSessionTracking(userProfile: UserProfile | null) {
  React.useEffect(() => {
    const appId = 'o-girador-sequenceur';
    const currentUid = userProfile?.uid;

    if (currentUid && userProfile) {
      startSession(userProfile, appId);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession(appId, undefined, currentUid);
      } else if (document.visibilityState === 'visible' && userProfile) {
        startSession(userProfile, appId);
      }
    };

    const handleBeforeUnload = () => {
      endSession(appId, undefined, currentUid);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession(appId, undefined, currentUid);
    };
  }, [userProfile?.uid]);
}
