import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AdminAccessDenied: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[var(--cordel-text)]">
      <ShieldAlert size={64} className="mb-4 text-[#8b2a1a]" />
      <h2 className="text-2xl font-cactus font-bold mb-2">Accès Refusé</h2>
      <p className="max-w-md">
        Vous n'avez pas les autorisations nécessaires pour accéder au panneau d'administration.
      </p>
    </div>
  );
};
