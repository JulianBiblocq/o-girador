import React from 'react';
import { UserProfile, UserRole } from '../../contexts/AuthContext';
import { User as UserIcon } from 'lucide-react';

interface AdminUserRowProps {
  user: UserProfile;
  mestres: UserProfile[];
  onRoleChange: (uid: string, newRole: UserRole) => void;
  onMestreChange: (uid: string, newMestreId: string) => void;
  onMaxElevesChange: (uid: string, maxEleves: number) => void;
}

export const AdminUserRow: React.FC<AdminUserRowProps> = ({
  user,
  mestres,
  onRoleChange,
  onMestreChange,
  onMaxElevesChange,
}) => {
  return (
    <tr className="border-b border-[var(--cordel-border)]/20 hover:bg-black/5 transition-colors">
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
          onChange={(e) => onRoleChange(user.uid, e.target.value as UserRole)}
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
            onChange={(e) => onMestreChange(user.uid, e.target.value)}
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
              onChange={(e) => onMaxElevesChange(user.uid, parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 cordel-border-sm bg-transparent text-sm focus:outline-none focus:ring-1 ring-black"
              title="0 = illimité"
            />
          </div>
        )}
      </td>
    </tr>
  );
};
