import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, getDoc, doc, updateDoc, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, UserRole } from '../../contexts/AuthContext';
import {
  AdminRawUserDoc, extractAdminGroupId, normalizeAdminRole,
  parseAdminTimestampMs, resolveAdminGroupLabel, resolveAdminUserName,
} from './adminUserHelpers';

export type AdminUserRecord = UserProfile & AdminRawUserDoc;

export interface UseAdminUsersResult {
  users: AdminUserRecord[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredUsers: AdminUserRecord[];
  mestres: AdminUserRecord[];
  groupNamesById: Record<string, string>;
  colorScheme: 'light' | 'dark';
  handleRoleChange: (uid: string, newRole: UserRole) => Promise<void>;
  handleMestreChange: (uid: string, newMestreId: string) => Promise<void>;
  handleMaxElevesChange: (uid: string, maxEleves: number) => Promise<void>;
}

function readDocumentColorScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export const useAdminUsers = (): UseAdminUsersResult => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [groupNamesById, setGroupNamesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(readDocumentColorScheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const syncScheme = () => setColorScheme(readDocumentColorScheme());
    syncScheme();
    const obs = new MutationObserver(syncScheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(200)));
        const usersList: AdminUserRecord[] = usersSnapshot.docs.map((docSnap) => {
          const raw = docSnap.data() as AdminRawUserDoc;
          const createdMs = parseAdminTimestampMs(raw.createdAt ?? raw.dateInscription ?? raw.updatedAt);
          return {
            ...(raw as UserProfile),
            ...raw,
            uid: raw.uid || docSnap.id,
            displayName: resolveAdminUserName(raw),
            role: normalizeAdminRole(raw.role, raw.dbRole),
            createdAt: createdMs,
          };
        });
        usersList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (cancelled) return;
        setUsers(usersList);

        const missingGroupIds = Array.from(
          new Set(usersList.filter((u) => !u.groupName?.trim()).map((u) => extractAdminGroupId(u)).filter(Boolean))
        );
        if (missingGroupIds.length > 0) {
          const entries = await Promise.all(
            missingGroupIds.map(async (gid) => {
              try {
                const snap = await getDoc(doc(db, 'associations', gid));
                if (!snap.exists()) return null;
                const d = snap.data() as { name?: string; nom?: string; groupName?: string };
                const label = (d.name || d.nom || d.groupName || '').trim();
                return label ? ([gid, label] as const) : null;
              } catch {
                return null;
              }
            })
          );
          if (cancelled) return;
          const resolved: Record<string, string> = {};
          entries.forEach((pair) => {
            if (pair) {
              resolved[pair[0]] = pair[1];
              resolved[pair[0].toLowerCase()] = pair[1];
            }
          });
          setGroupNamesById(resolved);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchUsers();
    return () => { cancelled = true; };
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole, dbRole: newRole });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole, dbRole: newRole } : u)));
    } catch (error) { console.error('Erreur lors de la mise à jour du rôle:', error); }
  };

  const handleMestreChange = async (uid: string, newMestreId: string) => {
    try {
      const mestreIdVal = newMestreId === 'none' ? null : newMestreId;
      await updateDoc(doc(db, 'users', uid), { mestreId: mestreIdVal });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, mestreId: mestreIdVal } : u)));
    } catch (error) { console.error("Erreur lors de l'association au Mestre:", error); }
  };

  const handleMaxElevesChange = async (uid: string, maxEleves: number) => {
    try {
      await updateDoc(doc(db, 'users', uid), { maxEleves });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, maxEleves } : u)));
    } catch (error) { console.error("Erreur lors de la mise à jour de la limite d'élèves:", error); }
  };

  const mestres = useMemo(() => users.filter((u) => u.role === 'mestre'), [users]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = resolveAdminUserName(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const group = resolveAdminGroupLabel(u, groupNamesById).toLowerCase();
      return name.includes(q) || email.includes(q) || group.includes(q) || u.role.toLowerCase().includes(q);
    });
  }, [users, searchTerm, groupNamesById]);

  return {
    users, loading, searchTerm, setSearchTerm, filteredUsers, mestres,
    groupNamesById, colorScheme, handleRoleChange, handleMestreChange, handleMaxElevesChange,
  };
};
