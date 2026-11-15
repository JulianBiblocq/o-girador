import { useMemo } from 'react';
import { DispositionPreset } from '../../../types/disposition.types';
import { isLegacySamambaiaGroup } from '../../../utils/tenantGroupHelpers';

export type TabType = 'mine' | 'group' | 'public';

interface FilterParams {
  dispositions: DispositionPreset[];
  activeTab: TabType;
  userUid: string;
  groupId: string | null;
  isSamambaiaMember: boolean;
}

export function useFilteredDispositions({
  dispositions,
  activeTab,
  userUid,
  groupId,
  isSamambaiaMember,
}: FilterParams): DispositionPreset[] {
  return useMemo(() => {
    return dispositions.filter((d) => {
      if (activeTab === 'mine') {
        return d.ownerId === userUid || d.ownerId === 'local' || d.authorId === userUid;
      }
      if (activeTab === 'group') {
        const docGroupId = d.groupId ? String(d.groupId).trim().toLowerCase() : '';
        const matchVisibility = d.visibility === 'mestre_group';
        const matchGroup = Boolean(groupId && docGroupId && docGroupId === groupId);
        const matchLegacySamambaia = isSamambaiaMember && isLegacySamambaiaGroup(docGroupId);
        return (groupId ? matchGroup : matchVisibility) || matchLegacySamambaia;
      }
      if (activeTab === 'public') {
        return d.visibility === 'public' || d.visibility === 'admin_global';
      }
      return true;
    });
  }, [dispositions, activeTab, userUid, groupId, isSamambaiaMember]);
}
