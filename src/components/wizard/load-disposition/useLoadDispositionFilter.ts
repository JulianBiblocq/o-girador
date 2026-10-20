/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { DispositionPreset } from '../../../types/disposition.types';

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
        const docGroupId = d.groupId ? String(d.groupId).toLowerCase() : '';
        const matchVisibility = d.visibility === 'mestre_group';
        const matchGroup = Boolean(groupId && docGroupId && docGroupId === groupId);
        const isSamambaiaItem = isSamambaiaMember && (
          docGroupId.includes('samambaia') ||
          d.ownerId === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' ||
          d.ownerId === 'pFAmvjJWGtaWV0a6i9JcReuiyTJ2'
        );
        return matchVisibility || matchGroup || isSamambaiaItem;
      }
      if (activeTab === 'public') {
        return d.visibility === 'public' || d.visibility === 'admin_global';
      }
      return true;
    });
  }, [dispositions, activeTab, userUid, groupId, isSamambaiaMember]);
}
