import React from 'react';
import { User as UserIcon, Users } from 'lucide-react';
import { UserProfile, UserRole } from '../../contexts/AuthContext';
import { AdminRawUserDoc, formatAdminDate, resolveAdminUserName } from './adminUserHelpers';

interface AdminUserRowProps {
  user: UserProfile & AdminRawUserDoc;
  mestres: UserProfile[];
  groupLabel: string;
  colorScheme: 'light' | 'dark';
  lang: 'pt' | 'fr';
  onRoleChange: (uid: string, newRole: UserRole) => void;
  onMestreChange: (uid: string, newMestreId: string) => void;
  onMaxElevesChange: (uid: string, maxEleves: number) => void;
}

const OPTION_CLS = 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-bold';

export const AdminUserRow: React.FC<AdminUserRowProps> = ({
  user,
  mestres,
  groupLabel,
  colorScheme,
  lang,
  onRoleChange,
  onMestreChange,
  onMaxElevesChange,
}) => {
  const isPt = lang === 'pt';
  const fallbackName = isPt ? 'Usuário' : 'Utilisateur';
  const resolvedName = resolveAdminUserName(user, fallbackName);
  const dateStr = formatAdminDate(user.createdAt ?? user.dateInscription, isPt ? 'pt-BR' : 'fr-FR');
  const selectBaseCls =
    'px-2.5 py-1.5 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] [color-scheme:light] dark:[color-scheme:dark] cursor-pointer text-xs font-bold focus:outline-none focus:border-[var(--cordel-accent-readable)]';

  return (
    <tr className="border-b border-[var(--cordel-border)]/25 hover:bg-[var(--cordel-surface-elevated)]/60 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt={resolvedName} className="w-8 h-8 rounded-full border border-[var(--cordel-border)] object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border)] flex items-center justify-center shrink-0 text-[var(--cordel-text-muted)]">
              <UserIcon size={15} />
            </div>
          )}
          <span className="font-bold text-sm text-[var(--cordel-text)]">{resolvedName}</span>
        </div>
      </td>

      <td className="p-3 text-xs text-[var(--cordel-text-muted)] font-mono">{user.email || '—'}</td>

      <td className="p-3 text-xs font-mono text-[var(--cordel-text)]">{dateStr}</td>

      <td className="p-3">
        <select
          value={user.role}
          style={{ colorScheme }}
          onChange={(e) => onRoleChange(user.uid, e.target.value as UserRole)}
          className={`${selectBaseCls} ${
            user.role === 'admin' || user.role === 'mestre'
              ? 'border-[var(--cordel-accent-readable)]'
              : user.role === 'membre' || user.role === 'eleve'
              ? 'border-[var(--cordel-status-success)]'
              : ''
          }`}
        >
          <option value="visiteur" className={OPTION_CLS}>{isPt ? 'Visitante' : 'Visiteur'}</option>
          <option value="eleve" className={OPTION_CLS}>{isPt ? 'Aluno' : 'Élève'}</option>
          <option value="membre" className={OPTION_CLS}>{isPt ? 'Membro' : 'Membre'}</option>
          <option value="mestre" className={OPTION_CLS}>Mestre</option>
          <option value="admin" className={OPTION_CLS}>Admin</option>
        </select>
      </td>

      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {groupLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-cactus font-bold border border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]">
              <Users size={12} className="shrink-0" />
              <span>{groupLabel}</span>
            </span>
          )}

          {(user.role === 'eleve' || user.role === 'membre') && (
            <select
              value={user.mestreId || 'none'}
              style={{ colorScheme }}
              onChange={(e) => onMestreChange(user.uid, e.target.value)}
              className={selectBaseCls}
              title={isPt ? 'Mestre titular' : 'Mestre attitré'}
            >
              <option value="none" className={OPTION_CLS}>
                {isPt ? '-- Mestre: Nenhum --' : '-- Mestre : Aucun --'}
              </option>
              {mestres.map((m) => (
                <option key={m.uid} value={m.uid} className={OPTION_CLS}>
                  {resolveAdminUserName(m, fallbackName)}
                </option>
              ))}
            </select>
          )}

          {user.role === 'mestre' && (
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cordel-text-muted)]">
              <span>{isPt ? 'Máx. Alunos:' : 'Max Élèves :'}</span>
              <input
                type="number"
                min="0"
                value={user.maxEleves || 0}
                onChange={(e) => onMaxElevesChange(user.uid, parseInt(e.target.value, 10) || 0)}
                className="w-16 px-2 py-1 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] text-xs font-bold focus:outline-none focus:border-[var(--cordel-accent-readable)]"
                title={isPt ? '0 = ilimitado' : '0 = illimité'}
              />
            </label>
          )}

          {!groupLabel && user.role === 'visiteur' && (
            <span className="text-xs text-[var(--cordel-text-muted)]">—</span>
          )}
        </div>
      </td>
    </tr>
  );
};
