import { BalancoPreset } from '../../types/balanco.types';

export const getPresetBadge = (p: BalancoPreset, lang: 'pt' | 'fr') => {
  if (p.isFactory) {
    return {
      label: lang === 'fr' ? 'Usine' : 'Fábrica',
      className: 'bg-[#d5c3b0] text-[#1a1a1a] border-[#1a1a1a]',
    };
  }
  return {
    label: lang === 'fr' ? 'Mon Balanço' : 'Meu Balanço',
    className: 'bg-[#1b4332] text-[#f4ecd8] border-[#1b4332]',
  };
};

export const canManagePreset = (p: BalancoPreset | undefined | null, userProfile: any): boolean => {
  if (!p || p.isFactory) return false;
  if (!userProfile) return p.ownerId === 'local';
  const role = String(userProfile.role || '');
  if (role === 'admin' || role === 'super-admin') return true;
  if ((role === 'mestre' || role === 'mestri') && p.groupId && userProfile.groupId) {
    return String(p.groupId).toLowerCase() === String(userProfile.groupId).toLowerCase();
  }
  return false;
};
