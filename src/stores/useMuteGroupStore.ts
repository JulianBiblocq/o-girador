/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MuteGroupId, MOBILE_FAMILIES } from '../components/mobile/mobileFamilyConfig';
import { useSequencerStore } from './useSequencerStore';
import { instrumentsConfig } from '../data';

interface MuteGroupState {
  muteGroupAssignments: Record<MuteGroupId, string[]>;
  activeMuteGroups: Record<MuteGroupId, boolean>;
  toggleFamilyInMuteGroup: (groupId: MuteGroupId, familyId: string) => void;
  toggleMuteGroupActive: (groupId: MuteGroupId) => void;
}

function syncFamilyMuteStates(
  assignments: Record<MuteGroupId, string[]>,
  activeGroups: Record<MuteGroupId, boolean>,
  affectedFamilyIds: string[]
) {
  const store = useSequencerStore.getState();
  const tracks = store.tracks;
  if (!tracks || tracks.length === 0) return;

  // Determine for each affected family whether it is covered by at least one active mute group
  const familyMuteTarget = new Map<string, boolean>();
  for (const famId of affectedFamilyIds) {
    const isMutedByAnyActiveGroup = ([1, 2, 3, 4] as MuteGroupId[]).some(
      (g) => activeGroups[g] && assignments[g]?.includes(famId)
    );
    familyMuteTarget.set(famId, isMutedByAnyActiveGroup);
  }

  // Find instrument IDs for each affected family
  const affectedInstMap = new Map<string, string>(); // instId -> famId
  for (const fam of MOBILE_FAMILIES) {
    if (familyMuteTarget.has(fam.id)) {
      fam.instrumentIds.forEach((instId) => affectedInstMap.set(instId, fam.id));
    }
  }

  store.setTracks((prev) =>
    prev.map((t) => {
      const instId = instrumentsConfig[t.instrumentIdx]?.id;
      if (!instId) return t;
      const famId = affectedInstMap.get(instId);
      if (!famId) return t;
      const shouldMute = familyMuteTarget.get(famId);
      return shouldMute !== undefined ? { ...t, isMute: shouldMute } : t;
    })
  );
}

export const useMuteGroupStore = create<MuteGroupState>()(
  persist(
    (set, get) => ({
      muteGroupAssignments: { 1: [], 2: [], 3: [], 4: [] },
      activeMuteGroups: { 1: false, 2: false, 3: false, 4: false },

      toggleFamilyInMuteGroup: (groupId, familyId) => {
        const current = get().muteGroupAssignments[groupId] || [];
        const exists = current.includes(familyId);
        const updatedList = exists ? current.filter((id) => id !== familyId) : [...current, familyId];
        const nextAssignments = { ...get().muteGroupAssignments, [groupId]: updatedList };

        set({ muteGroupAssignments: nextAssignments });

        // If this group is currently active, sync mute status of this family immediately
        if (get().activeMuteGroups[groupId]) {
          syncFamilyMuteStates(nextAssignments, get().activeMuteGroups, [familyId]);
        }
      },

      toggleMuteGroupActive: (groupId) => {
        const nextActive = !get().activeMuteGroups[groupId];
        const nextActiveGroups = { ...get().activeMuteGroups, [groupId]: nextActive };
        set({ activeMuteGroups: nextActiveGroups });

        const assignedFamilies = get().muteGroupAssignments[groupId] || [];
        if (assignedFamilies.length > 0) {
          syncFamilyMuteStates(get().muteGroupAssignments, nextActiveGroups, assignedFamilies);
        }
      },
    }),
    {
      name: 'ogirador_mute_groups',
      partialize: (state) => ({ muteGroupAssignments: state.muteGroupAssignments }),
    }
  )
);
