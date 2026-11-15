// @ts-ignore — vitest est exécuté via npx vitest hors devDependencies locales
import { describe, it, expect } from 'vitest';
import {
  formatAdminDate,
  normalizeAdminRole,
  parseAdminTimestampMs,
  resolveAdminGroupLabel,
  resolveAdminUserName,
} from '../adminUserHelpers';

describe('adminUserHelpers (compatibilité Organizador / Sequenciador)', () => {
  it('resolves user display name across Organizador and Sequenciador fields without Anonyme', () => {
    expect(resolveAdminUserName({ displayName: 'Mestre Carlos' })).toBe('Mestre Carlos');
    expect(resolveAdminUserName({ displayName: null, prenom: 'Ana', nom: 'Silva' })).toBe('Ana Silva');
    expect(resolveAdminUserName({ firstName: 'João', lastName: 'Costa' })).toBe('João Costa');
    expect(resolveAdminUserName({ name: 'Batuqueiro' })).toBe('Batuqueiro');
    expect(resolveAdminUserName({ pseudo: 'Xilo' })).toBe('Xilo');
    expect(resolveAdminUserName({ email: 'camille.dupont@example.org' })).toBe('camille.dupont');
  });

  it('parses Firestore Timestamps, epoch seconds/ms, and ISO strings without Invalid Date', () => {
    const targetMs = Date.UTC(2026, 4, 15, 12, 0, 0);
    const fakeTimestamp = { toDate: () => new Date(targetMs) };
    const plainSecondsObj = { seconds: Math.floor(targetMs / 1000), nanoseconds: 0 };
    const underscoreSecondsObj = { _seconds: Math.floor(targetMs / 1000) };

    expect(parseAdminTimestampMs(fakeTimestamp)).toBe(targetMs);
    expect(parseAdminTimestampMs(plainSecondsObj)).toBe(targetMs);
    expect(parseAdminTimestampMs(underscoreSecondsObj)).toBe(targetMs);
    expect(parseAdminTimestampMs('2026-05-15T12:00:00.000Z')).toBe(targetMs);
    expect(parseAdminTimestampMs(undefined)).toBe(0);

    expect(formatAdminDate(fakeTimestamp, 'fr-FR')).not.toBe('Invalid Date');
    expect(formatAdminDate(undefined, 'fr-FR')).toBe('—');
    expect(formatAdminDate({}, 'fr-FR')).toBe('—');
  });

  it('preserves membre role from Organizador and normalizes variants', () => {
    expect(normalizeAdminRole('membre')).toBe('membre');
    expect(normalizeAdminRole('membro')).toBe('membre');
    expect(normalizeAdminRole('mestre')).toBe('mestre');
    expect(normalizeAdminRole('visiteur', 'admin')).toBe('admin');
    expect(normalizeAdminRole(undefined)).toBe('visiteur');
  });

  it('resolves group label from groupName, associations map, or groupId fallback', () => {
    expect(resolveAdminGroupLabel({ groupName: 'Nação Estrela', groupId: 'estrela' })).toBe('Nação Estrela');
    expect(resolveAdminGroupLabel({ groupId: 'baque-sul' }, { 'baque-sul': 'Baque do Sul' })).toBe('Baque do Sul');
    expect(resolveAdminGroupLabel({ associationId: 'percussao-norte' }, {})).toBe('percussao-norte');
    expect(resolveAdminGroupLabel({}, {})).toBe('');
  });
});
