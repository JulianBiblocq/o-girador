import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth, UserProfile, UserRole } from '../contexts/AuthContext';
import { Shield, ShieldAlert, CheckCircle, Search, User as UserIcon } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, limit(100));
      const usersSnapshot = await getDocs(q);
      const usersList = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
      // Sort by creation date descending
      usersList.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(usersList);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.uid === uid ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rôle:", error);
      alert("Erreur lors de la mise à jour du rôle.");
    }
  };

  const handleMestreChange = async (uid: string, newMestreId: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const mestreIdVal = newMestreId === 'none' ? null : newMestreId;
      await updateDoc(userRef, { mestreId: mestreIdVal });
      
      setUsers(prev => prev.map(user => 
        user.uid === uid ? { ...user, mestreId: mestreIdVal } : user
      ));
    } catch (error) {
      console.error("Erreur lors de l'association au Mestre:", error);
      alert("Erreur lors de l'association au Mestre.");
    }
  };

  const handleMaxElevesChange = async (uid: string, maxEleves: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { maxEleves });
      
      setUsers(prev => prev.map(user => 
        user.uid === uid ? { ...user, maxEleves } : user
      ));
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la limite:", error);
      alert("Erreur lors de la mise à jour de la limite d'élèves.");
    }
  };

  const mestres = users.filter(u => u.role === 'mestre');

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[var(--cordel-text)]">
        <ShieldAlert size={64} className="mb-4 text-[#8b2a1a]" />
        <h2 className="text-2xl font-cactus font-bold mb-2">Accès Refusé</h2>
        <p className="max-w-md">
          Vous n'avez pas les autorisations nécessaires pour accéder au panneau d'administration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden">
      <div className="p-6 md:p-8 flex-shrink-0 border-b border-[var(--cordel-border)]/20">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-[#8b2a1a]" size={32} />
          <h1 className="text-3xl font-cactus font-bold">Administration</h1>
        </div>
        <p className="opacity-80">Gérez les accès et les rôles des utilisateurs inscrits.</p>
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-auto custom-scrollbar">
        {/* Barre de recherche */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent cordel-border focus:outline-none focus:ring-1 ring-[#8b2a1a] transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <span className="text-4xl animate-spin font-cactus">⚙️</span>
          </div>
        ) : (
          <div className="bg-white/50 rounded-lg cordel-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--cordel-border)]/10 border-b border-[var(--cordel-border)]">
                    <th className="p-3 font-bold font-cactus tracking-wide">Utilisateur</th>
                    <th className="p-3 font-bold font-cactus tracking-wide">Email</th>
                    <th className="p-3 font-bold font-cactus tracking-wide">Inscription</th>
                    <th className="p-3 font-bold font-cactus tracking-wide">Rôle</th>
                    <th className="p-3 font-bold font-cactus tracking-wide">Mestre Attitré</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="border-b border-[var(--cordel-border)]/20 hover:bg-black/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-black/20" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                              <UserIcon size={16} />
                            </div>
                          )}
                          <span className="font-bold">{user.displayName || 'Anonyme'}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm opacity-80">{user.email}</td>
                      <td className="p-3 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                          className={`px-3 py-1.5 cordel-border-sm bg-transparent cursor-pointer text-sm font-bold focus:outline-none focus:ring-1 ring-black ${
                            user.role === 'admin' ? 'text-[#8b2a1a]' : 
                            user.role === 'mestre' ? 'text-[#b87333]' : 
                            user.role === 'eleve' ? 'text-[#27ae60]' : ''
                          }`}
                        >
                          <option value="visiteur">Visiteur</option>
                          <option value="eleve">Élève</option>
                          <option value="mestre">Mestre</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        {user.role === 'eleve' && (
                          <select
                            value={user.mestreId || 'none'}
                            onChange={(e) => handleMestreChange(user.uid, e.target.value)}
                            className="px-3 py-1.5 cordel-border-sm bg-transparent cursor-pointer text-sm focus:outline-none focus:ring-1 ring-black"
                          >
                            <option value="none">-- Aucun --</option>
                            {mestres.map(m => (
                              <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                            ))}
                          </select>
                        )}
                        {user.role === 'mestre' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold opacity-70">Max Élèves:</span>
                            <input
                              type="number"
                              min="0"
                              value={user.maxEleves || 0}
                              onChange={(e) => handleMaxElevesChange(user.uid, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 cordel-border-sm bg-transparent text-sm focus:outline-none focus:ring-1 ring-black"
                              title="0 = illimité"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center opacity-60 italic">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
