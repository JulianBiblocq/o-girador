/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { useBoutonExportDanse } from '../hooks/useBoutonExportDanse';

export const BoutonExportDanse: React.FC = () => {
  const { statut, messageErreurUI, gererExport, isBouncingCloud, progress, stepLabel, lang } = useBoutonExportDanse();
  const estOccupe = statut === 'calcul' || isBouncingCloud;

  return (
    <button
      onClick={gererExport}
      disabled={estOccupe}
      className={`
        flex items-center justify-center gap-1.5 px-2 py-1.5 
        cordel-border-sm text-[10px] font-bold font-cactus cursor-pointer 
        transition-colors w-full
        ${estOccupe ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] opacity-70 cursor-not-allowed' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}
        ${statut === 'succes' ? 'bg-[#2ecc71] text-white border-[#27ae60]' : ''}
        ${statut === 'erreur' ? 'bg-[#e74c3c] text-white border-[#c0392b]' : ''}
      `}
      title={
        isBouncingCloud
          ? (stepLabel ? `${stepLabel} — ${lang === 'pt' ? 'Mantenha a aba aberta no primeiro plano' : 'Veuillez laisser l\'onglet ouvert au premier plan'}` : (lang === 'pt' ? 'Gravando áudio em tempo real...' : 'Enregistrement audio en direct...'))
          : (lang === 'pt' ? "Sincronizar com O Girador Dança" : "Synchroniser vers O Girador Dança")
      }
    >
      {statut === 'repos' && !isBouncingCloud && (
        <>
          <UploadCloud className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'pt' ? 'Sincronizar Dança' : 'Synchroniser Danse'}</span>
        </>
      )}

      {(statut === 'calcul' || isBouncingCloud) && (
        <>
          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span>{progress > 0 ? `${progress}%` : (lang === 'pt' ? 'Gravando...' : 'Enregistrement...')}</span>
        </>
      )}

      {statut === 'succes' && (
        <>
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'pt' ? 'Sucesso!' : 'Succès !'}</span>
        </>
      )}

      {statut === 'erreur' && (
        <span>{messageErreurUI || (lang === 'pt' ? 'Erro' : 'Erreur')}</span>
      )}
    </button>
  );
};
