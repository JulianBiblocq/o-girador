import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface AdminAccessDeniedProps {
  lang?: 'pt' | 'fr';
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({ lang = 'fr' }) => {
  const isPt = lang === 'pt';
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[var(--cordel-text)]">
      <ShieldAlert size={64} className="mb-4 text-[var(--cordel-accent-readable)]" />
      <h2 className="text-2xl font-cactus font-bold mb-2">
        {isPt ? 'Acesso Negado' : 'Accès Refusé'}
      </h2>
      <p className="max-w-md text-[var(--cordel-text-muted)]">
        {isPt
          ? 'Você não tem permissão para acessar o painel de administração.'
          : "Vous n'avez pas les autorisations nécessaires pour accéder au panneau d'administration."}
      </p>
    </div>
  );
};
