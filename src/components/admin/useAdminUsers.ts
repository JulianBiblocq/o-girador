import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, UserRole } from '../../contexts/AuthContext';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, limit(100));
      const usersSnapshot = await getDocs(q);
      const usersList = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
      usersList.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(usersList);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
    }
  };

  const handleMestreChange = async (uid: string, newMestreId: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const mestreIdVal = newMestreId === 'none' ? null : newMestreId;
      await updateDoc(userRef, { mestreId: mestreIdVal });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, mestreId: mestreIdVal } : u));
    } catch (error) {
      console.error("Erreur lors de l'association au Mestre:", error);
    }
  };

  const handleMaxElevesChange = async (uid: string, maxEleves: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { maxEleves });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, maxEleves } : u));
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la limite d'élèves:", error);
    }
  };

  const mestres = useMemo(() => users.filter(u => u.role === 'mestre'), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return {
    users, loading, searchTerm, setSearchTerm, filteredUsers, mestres,
    handleRoleChange, handleMestreChange, handleMaxElevesChange
  };
};
