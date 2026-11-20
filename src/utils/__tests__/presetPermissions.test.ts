// @ts-ignore — vitest est execute via npx vitest hors devDependencies locales
import { describe, expect, it } from 'vitest';
import {
  OFFICIAL_MESTRE_UID,
  isMestreOrAdminProfile,
  canMutatePreset,
  canDeleteCatalogPreset,
  findMestrePresetNameConflict,
} from '../presetPermissions';

describe('presetPermissions — Protection stricte des morceaux du Mestre face aux co-auteurs', () => {
  it('identifies Mestre and Admin strictly while excluding canWriteSequenciador students/members', () => {
    expect(isMestreOrAdminProfile({ uid: 'u1', role: 'mestre' })).toBe(true);
    expect(isMestreOrAdminProfile({ uid: 'u1', role: 'mestri' })).toBe(true);
    expect(isMestreOrAdminProfile({ uid: 'u1', role: 'admin' })).toBe(true);
    expect(isMestreOrAdminProfile({ uid: 'u1', role: 'membre', dbRole: 'mestre' })).toBe(true);
    expect(isMestreOrAdminProfile({ uid: 'u1', role: 'membre', dbRole: 'admin' })).toBe(true);
    expect(isMestreOrAdminProfile({ uid: OFFICIAL_MESTRE_UID, role: 'membre' })).toBe(true);

    // Co-auteur avec isAdminFlag=true issu de AuthContext NE DOIT PAS être Mestre/Admin
    expect(isMestreOrAdminProfile({ uid: 'co1', role: 'membre', canWriteSequenciador: true }, true)).toBe(false);
    expect(isMestreOrAdminProfile({ uid: 'co2', role: 'eleve', canWriteSequenciador: true }, true)).toBe(false);
    expect(isMestreOrAdminProfile({ uid: 'v1', role: 'visiteur' }, false)).toBe(false);
    expect(isMestreOrAdminProfile(null, true)).toBe(false);
  });

  it('restricts canMutatePreset and canDeleteCatalogPreset for co-authors strictly to their own non-sanctuarized presets', () => {
    const mestreProfile = { uid: OFFICIAL_MESTRE_UID, role: 'mestre', canWriteSequenciador: true };
    const coauthorProfile = { uid: 'coauthor-uid', role: 'membre', canWriteSequenciador: true };
    const regularEleve = { uid: 'coauthor-uid', role: 'eleve', canWriteSequenciador: false };

    const mestrePreset = { id: 'mestre-song-1', name: 'Baque Novo', ownerId: OFFICIAL_MESTRE_UID };
    const sanctuarizedPreset = { id: '29dIDjgc2vPuDnwjiy9V', name: 'Opanijé', ownerId: 'coauthor-uid' };
    const coauthorOwnPreset = { id: 'coauthor-song-1', name: 'Exercice Caixa', ownerId: 'coauthor-uid' };
    const orphanPreset = { id: 'legacy-storage', name: 'Legacy' };

    expect(canMutatePreset(mestrePreset, mestreProfile)).toBe(true);
    expect(canMutatePreset(sanctuarizedPreset, mestreProfile)).toBe(true);
    expect(canDeleteCatalogPreset(sanctuarizedPreset, mestreProfile)).toBe(false);
    expect(canDeleteCatalogPreset(mestrePreset, mestreProfile)).toBe(true);

    expect(canMutatePreset(mestrePreset, coauthorProfile)).toBe(false);
    expect(canMutatePreset(sanctuarizedPreset, coauthorProfile)).toBe(false);
    expect(canMutatePreset(orphanPreset, coauthorProfile)).toBe(false);
    expect(canMutatePreset(coauthorOwnPreset, coauthorProfile)).toBe(true);
    expect(canDeleteCatalogPreset(coauthorOwnPreset, coauthorProfile)).toBe(true);
    expect(canDeleteCatalogPreset(mestrePreset, coauthorProfile)).toBe(false);

    expect(canMutatePreset(coauthorOwnPreset, regularEleve)).toBe(false);
  });

  it('blocks normalized homonym collisions against Mestre presets in the same group for non-Mestre users', () => {
    const catalog = [
      { id: '29dIDjgc2vPuDnwjiy9V', name: 'Opanijé', ownerId: OFFICIAL_MESTRE_UID, groupId: 'Samambaia' },
      { id: 'm2', name: 'Baque Virado 1', ownerId: 'mestre-nord', mestreId: 'mestre-nord', groupId: 'maracatu-nord' },
      { id: 'c1', name: 'Mon Atelier', ownerId: 'co1', mestreId: OFFICIAL_MESTRE_UID, groupId: 'samambaia' },
    ];
    const coauthor = { uid: 'co1', role: 'eleve', canWriteSequenciador: true, groupId: 'Samambaia', mestreId: OFFICIAL_MESTRE_UID };
    const mestre = { uid: OFFICIAL_MESTRE_UID, role: 'mestre', groupId: 'Samambaia' };

    expect(findMestrePresetNameConflict(catalog, '  opanije! ', coauthor, OFFICIAL_MESTRE_UID, 'samambaia')?.id).toBe('29dIDjgc2vPuDnwjiy9V');
    expect(findMestrePresetNameConflict(catalog, 'Baque Virado 1', coauthor, OFFICIAL_MESTRE_UID, 'samambaia')).toBeNull();
    expect(findMestrePresetNameConflict(catalog, 'Mon Atelier', coauthor, OFFICIAL_MESTRE_UID, 'samambaia')).toBeNull();
    expect(findMestrePresetNameConflict(catalog, 'Opanijé', mestre, OFFICIAL_MESTRE_UID, 'samambaia')).toBeNull();
  });
});
