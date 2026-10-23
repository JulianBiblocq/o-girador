
import { User } from 'firebase/auth';

export type UserRole = 'visiteur' | 'eleve' | 'membre' | 'mestre' | 'admin';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  dbRole?: string | null;
  createdAt: number;
  isDarkMode?: boolean;
  isLeftHanded?: boolean;
  lateralite?: 'droitier' | 'gaucher';
  mestreId?: string | null;
  groupLogoUrl?: string | null;
  maxEleves?: number;
  mestreMessage?: string;
  signatureUrl?: string;
  instrument?: string;
  customSwingOffsets?: [number, number, number, number];
  customSwingIntensity?: number;
  hasDancaAccess?: boolean;
  canWriteSequenciador?: boolean;
  canWriteDansador?: boolean;
  canWriteOrchestrador?: boolean;
  groupName?: string;
  groupId?: string;
  isSystemAdmin?: boolean;
  isPremium?: boolean;
  lastSequenciadorMode?: 'danse' | 'percussion' | 'editeur' | 'complet';
}

export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (requiredRole: UserRole) => boolean;
  updateUserPreference: (key: 'isDarkMode' | 'isLeftHanded', value: boolean) => Promise<void>;
  updateUserProfileField: (key: string, value: any) => Promise<void>;
  isAdmin: boolean;
  hasFullPlaybackAccess: boolean;
}

export const checkIsAdmin = (profile: UserProfile | null | undefined): boolean => {
  if (!profile) return false;
  const actualRole = profile.dbRole || profile.role;
  return (
    actualRole === 'admin' ||
    actualRole === 'super-admin' ||
    actualRole === 'mestre' ||
    actualRole === 'mestri' ||
    profile.canWriteSequenciador === true ||
    profile.isSystemAdmin === true
  );
};

export const checkHasFullPlaybackAccess = (userProfile: UserProfile | null | undefined, isAdmin?: boolean): boolean => {
  if (!userProfile) return false;
  const role = (userProfile.dbRole || userProfile.role || '').toLowerCase();
  const groupId = (userProfile.groupId || '').trim().toLowerCase();
  return Boolean(
    isAdmin ||
    userProfile.isSystemAdmin ||
    userProfile.isPremium ||
    role === 'mestre' ||
    role === 'mestri' ||
    role === 'admin' ||
    role === 'super-admin' ||
    role === 'membre' ||
    groupId === 'samambaia' ||
    Boolean(userProfile.groupId) ||
    userProfile.canWriteSequenciador
  );
};
