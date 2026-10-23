
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { MuteGroupId, MOBILE_FAMILIES, MobileFamilyId } from '../components/mobile/mobileFamilyConfig';
import { useSequencerStore } from './useSequencerStore';
import { getFamilyTracks } from '../utils/mobileFamilyResolver';

interface MuteGroupState {
  muteGroupAssignments: Record<MuteGroupId, string[]>;
  activeMuteGroups: Record<MuteGroupId, boolean>;
  toggleFamilyInMuteGroup: (groupId: MuteGroupId, familyId: string) => void;
  toggleMuteGroupActive: (groupId: MuteGroupId) => void;
  setAssignmentsFromCloud: (assignments: Record<MuteGroupId, string[]>) => void;
}

function normalizeFamilyId(id: string): string {
  return id === 'agbe' ? 'sementes' : id;
}

function syncFamilyMuteStates(
  assignments: Record<MuteGroupId, string[]>,
  activeGroups: Record<MuteGroupId, boolean>,
  affectedFamilyIds: string[]
) {
  const store = useSequencerStore.getState();
  const tracks = store.tracks;
  if (!tracks || tracks.length === 0) return;

  const trackMuteMap = new Map<number, boolean>();

  for (const rawFamId of affectedFamilyIds) {
    const famId = normalizeFamilyId(rawFamId);
    const isMutedByAnyActiveGroup = ([1, 2, 3, 4] as MuteGroupId[]).some(
      (g) => {
        if (!activeGroups[g]) return false;
        const assigned = (assignments[g] || []).map(normalizeFamilyId);
        return assigned.includes(famId);
      }
    );
    const familyTracks = getFamilyTracks(tracks, famId);
    for (const t of familyTracks) {
      trackMuteMap.set(t.id, isMutedByAnyActiveGroup);
    }
  }

  if (trackMuteMap.size === 0) return;

  store.setTracks((prev) =>
    prev.map((t) => {
      const shouldMute = trackMuteMap.get(t.id);
      return shouldMute !== undefined ? { ...t, isMute: shouldMute } : t;
    })
  );
}

export const useMuteGroupStore = create<MuteGroupState>()(
  persist(
    (set, get) => ({
      muteGroupAssignments: { 1: [], 2: [], 3: [], 4: [] },
      activeMuteGroups: { 1: false, 2: false, 3: false, 4: false },

      setAssignmentsFromCloud: (assignments) => {
        if (!assignments) return;
        const norm = (arr?: string[]) => (arr || []).map(normalizeFamilyId);
        const normalized: Record<MuteGroupId, string[]> = {
          1: norm(assignments[1]),
          2: norm(assignments[2]),
          3: norm(assignments[3]),
          4: norm(assignments[4]),
        };
        set({ muteGroupAssignments: normalized });
        const allFamIds = MOBILE_FAMILIES.map((f) => f.id);
        syncFamilyMuteStates(normalized, get().activeMuteGroups, allFamIds);
      },

      toggleFamilyInMuteGroup: (groupId, familyId) => {
        const normFamId = normalizeFamilyId(familyId);
        const current = (get().muteGroupAssignments[groupId] || []).map(normalizeFamilyId);
        const exists = current.includes(normFamId);
        const updatedList = exists ? current.filter((id) => id !== normFamId) : [...current, normFamId];
        const nextAssignments = { ...get().muteGroupAssignments, [groupId]: updatedList };

        set({ muteGroupAssignments: nextAssignments });

        if (get().activeMuteGroups[groupId]) {
          syncFamilyMuteStates(nextAssignments, get().activeMuteGroups, [normFamId]);
        }

        const uid = auth.currentUser?.uid;
        if (uid) {
          setDoc(doc(db, 'users', uid), { muteGroups: nextAssignments }, { merge: true }).catch(() => {});
        }
      },

      toggleMuteGroupActive: (groupId) => {
        const nextActive = !get().activeMuteGroups[groupId];
        const nextActiveGroups = { ...get().activeMuteGroups, [groupId]: nextActive };
        set({ activeMuteGroups: nextActiveGroups });

        const assignedFamilies = (get().muteGroupAssignments[groupId] || []).map(normalizeFamilyId);
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
