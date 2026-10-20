import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Search } from 'lucide-react';
import { useAdminUsers } from './admin/useAdminUsers';
import { AdminAccessDenied } from './admin/AdminAccessDenied';
import { AdminUserRow } from './admin/AdminUserRow';

export const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    loading, searchTerm, setSearchTerm, filteredUsers, mestres,
    handleRoleChange, handleMestreChange, handleMaxElevesChange
  } = useAdminUsers();

  if (!isAdmin) {
    return <AdminAccessDenied />;
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
                    <AdminUserRow
                      key={user.uid}
                      user={user}
                      mestres={mestres}
                      onRoleChange={handleRoleChange}
                      onMestreChange={handleMestreChange}
                      onMaxElevesChange={handleMaxElevesChange}
                    />
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
