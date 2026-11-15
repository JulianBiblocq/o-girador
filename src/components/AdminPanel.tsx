import React from 'react';
import { Shield, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminUsers } from './admin/useAdminUsers';
import { AdminAccessDenied } from './admin/AdminAccessDenied';
import { AdminUserRow } from './admin/AdminUserRow';
import { resolveAdminGroupLabel } from './admin/adminUserHelpers';

export const AdminPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    loading, searchTerm, setSearchTerm, filteredUsers, mestres,
    groupNamesById, colorScheme, handleRoleChange, handleMestreChange, handleMaxElevesChange,
  } = useAdminUsers();

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] overflow-hidden" style={{ colorScheme }}>
      <div className="p-6 md:p-8 flex-shrink-0 border-b border-[var(--cordel-border)]/30 bg-[var(--cordel-surface)]">
        <div className="flex items-center gap-3 mb-1.5">
          <Shield className="text-[var(--cordel-accent-readable)] shrink-0" size={30} />
          <h1 className="text-2xl md:text-3xl font-cactus font-bold">Administration</h1>
        </div>
        <p className="text-sm text-[var(--cordel-text-muted)]">
          Gérez les accès, les groupes et les rôles des utilisateurs inscrits.
        </p>
      </div>

      <div className="p-6 md:p-8 flex-1 overflow-auto custom-scrollbar">
        <div className="mb-5 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cordel-text-muted)]" size={17} />
          <input
            type="text"
            placeholder="Rechercher par nom, email, groupe ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] focus:outline-none focus:border-[var(--cordel-accent-readable)] transition-colors text-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12 text-[var(--cordel-accent-readable)]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--cordel-surface-muted)] border-b-2 border-[var(--cordel-border)] text-xs uppercase tracking-wider">
                    <th className="p-3 font-bold font-cactus">Utilisateur</th>
                    <th className="p-3 font-bold font-cactus">Email</th>
                    <th className="p-3 font-bold font-cactus">Inscription</th>
                    <th className="p-3 font-bold font-cactus">Rôle</th>
                    <th className="p-3 font-bold font-cactus">Groupe / Mestre Attitré</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <AdminUserRow
                      key={user.uid}
                      user={user}
                      mestres={mestres}
                      groupLabel={resolveAdminGroupLabel(user, groupNamesById)}
                      colorScheme={colorScheme}
                      onRoleChange={handleRoleChange}
                      onMestreChange={handleMestreChange}
                      onMaxElevesChange={handleMaxElevesChange}
                    />
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--cordel-text-muted)] italic">
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
