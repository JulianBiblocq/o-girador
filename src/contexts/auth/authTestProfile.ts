
import { UserProfile } from './authTypes';

export const getInitialTestProfile = (): { user: any; profile: UserProfile } | null => {
  try {
    const testProfileRaw = typeof window !== 'undefined' ? localStorage.getItem('girador_test_user_profile') : null;
    if (testProfileRaw) {
      const testProfile = JSON.parse(testProfileRaw);
      if (testProfile && testProfile.uid) {
        const mockUser: any = {
          uid: testProfile.uid,
          email: testProfile.email || `${testProfile.uid}@samambaia.bzh`,
          displayName: testProfile.displayName || testProfile.uid,
        };
        const role = testProfile.role || (testProfile.canWriteSequenciador ? 'mestre' : 'membre');
        const profile: UserProfile = {
          groupId: 'Samambaia',
          groupName: 'Samambaia',
          mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
          canWriteSequenciador: Boolean(testProfile.canWriteSequenciador),
          ...testProfile,
          role,
          dbRole: testProfile.dbRole || role,
        };
        return { user: mockUser, profile };
      }
    }
  } catch (_) {}
  return null;
};
