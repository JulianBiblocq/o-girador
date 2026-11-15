/**
 * adminUserHelpers.ts
 * Résolution pure des profils Firestore `/users` (compatibilité Organizador & Sequenciador) (< 105 lignes).
 */
import { UserProfile, UserRole } from '../../contexts/AuthContext';

export interface AdminRawUserDoc extends Partial<UserProfile> {
  prenom?: string;
  nom?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  pseudo?: string;
  group?: string;
  associationId?: string;
  dateInscription?: unknown;
  updatedAt?: unknown;
}

export function resolveAdminUserName(user: AdminRawUserDoc | null | undefined, fallback = 'Utilisateur'): string {
  if (!user) return fallback;
  const direct = user.displayName?.trim();
  if (direct) return direct;

  const frFull = [user.prenom, user.nom].map((s) => s?.trim()).filter(Boolean).join(' ');
  if (frFull) return frFull;

  const enFull = [user.firstName, user.lastName].map((s) => s?.trim()).filter(Boolean).join(' ');
  if (enFull) return enFull;

  const single = user.name?.trim() || user.pseudo?.trim();
  if (single) return single;

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return fallback;
}

export function parseAdminTimestampMs(raw: unknown): number {
  if (raw == null) return 0;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw < 1e11 ? Math.round(raw * 1000) : raw;
  }

  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
  }

  if (typeof raw === 'object') {
    const obj = raw as {
      toDate?: () => Date;
      toMillis?: () => number;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof obj.toMillis === 'function') {
      const ms = obj.toMillis();
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
    if (typeof obj.toDate === 'function') {
      const d = obj.toDate();
      const ms = d instanceof Date ? d.getTime() : NaN;
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
    const sec = typeof obj.seconds === 'number' ? obj.seconds : typeof obj._seconds === 'number' ? obj._seconds : NaN;
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
    return 0;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    if (/^\d+(\.\d+)?$/.test(trimmed)) return parseAdminTimestampMs(Number(trimmed));
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  return 0;
}

export function formatAdminDate(raw: unknown, locale = 'fr-FR'): string {
  const ms = parseAdminTimestampMs(raw);
  if (ms <= 0) return '—';
  return new Date(ms).toLocaleDateString(locale);
}

export function normalizeAdminRole(rawRole: unknown, dbRole?: unknown): UserRole {
  const val = String(dbRole || rawRole || 'visiteur').trim().toLowerCase();
  if (val === 'admin' || val === 'super-admin') return 'admin';
  if (val === 'mestre' || val === 'mestri') return 'mestre';
  if (val === 'membre' || val === 'membro' || val === 'member') return 'membre';
  if (val === 'eleve' || val === 'élève' || val === 'aluno') return 'eleve';
  return 'visiteur';
}

export function extractAdminGroupId(user: AdminRawUserDoc | null | undefined): string {
  if (!user) return '';
  return String(user.groupId || user.associationId || user.group || '').trim();
}

export function resolveAdminGroupLabel(
  user: AdminRawUserDoc | null | undefined,
  groupNamesById: Record<string, string> = {}
): string {
  if (!user) return '';
  const explicitName = user.groupName?.trim();
  if (explicitName) return explicitName;
  const gid = extractAdminGroupId(user);
  if (!gid) return '';
  return groupNamesById[gid] || groupNamesById[gid.toLowerCase()] || gid;
}
