/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Barre compacte des options de pré-injection papier (< 130 lignes).
 */
import React, { useState } from 'react';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { PaperInjectOptions, detectActivePaperRoles } from '../../utils/paper/paperTrackBuilder';
import { useWorkspaceTemplateStore } from '../../stores/useWorkspaceTemplateStore';

const EXTRA_ROLES = [
  { code: 'tb', label: 'Timbal' },
  { code: 'tr', label: 'Tarol' },
  { code: 'mi', label: 'Mineiro' },
  { code: 'gg', label: 'Gonguê' },
  { code: 'ab', label: 'Agbê' },
  { code: 'ap', label: 'Apito' },
  { code: 'td', label: 'Toada' },
];

interface Props {
  preset: PaperPreset;
  options: PaperInjectOptions;
  onChange: (opts: PaperInjectOptions) => void;
}

export const PaperInjectOptionsBar: React.FC<Props> = ({ preset, options, onChange }) => {
  const [showRolesMenu, setShowRolesMenu] = useState(false);
  const templates = useWorkspaceTemplateStore((s) => s.templates);
  const detected = detectActivePaperRoles(preset);
  const hasAl = detected.has('al') || (detected.has('mc') && detected.has('me') && detected.has('rp'));
  const hasCx = detected.has('cx');

  const linkAl = options.linkAlfaias !== undefined ? options.linkAlfaias : true;
  const currentCxMode: 'none' | 'caixa_tarol' | 'two_caixas' = options.caixasLinkMode ?? (options.linkCaixas ? 'caixa_tarol' : 'none');
  const currentExtras = options.extraRoles || [];

  const toggleRole = (code: string) => {
    const next = currentExtras.includes(code)
      ? currentExtras.filter((c) => c !== code)
      : [...currentExtras, code];
    onChange({ ...options, extraRoles: next });
  };

  const cycleCxMode = () => {
    if (currentCxMode === 'none') {
      onChange({ ...options, caixasLinkMode: 'caixa_tarol', linkCaixas: true });
    } else if (currentCxMode === 'caixa_tarol') {
      onChange({ ...options, caixasLinkMode: 'two_caixas', linkCaixas: true });
    } else {
      onChange({ ...options, caixasLinkMode: 'none', linkCaixas: false });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded bg-[var(--cordel-bg)]/80 border border-[var(--cordel-border)] text-xs text-[var(--cordel-text)] mb-2">
      {hasAl && (
        <button
          type="button"
          onClick={() => onChange({ ...options, linkAlfaias: !linkAl })}
          className={`px-2 py-1 rounded font-bold transition-colors border flex items-center gap-1 ${
            linkAl
              ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] dark:bg-[#f4ecd8] dark:text-[#1a1a1a]'
              : 'bg-transparent text-stone-500 border-stone-400/40 line-through'
          }`}
          title="Lier Marcante, Meião et Repique dans un groupe ALFAIAS"
        >
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>3 Alfaias</span>
        </button>
      )}

      {hasCx && (
        <button
          type="button"
          onClick={cycleCxMode}
          className={`px-2 py-1 rounded font-bold transition-colors border flex items-center gap-1 ${
            currentCxMode !== 'none'
              ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a] dark:bg-[#f4ecd8] dark:text-[#1a1a1a]'
              : 'bg-transparent text-stone-500 border-stone-400/40 line-through'
          }`}
          title={
            currentCxMode === 'caixa_tarol'
              ? 'Mode Caixa (Maître) + Tarol (Esclave) lié. Clic pour basculer sur 2 Caixas'
              : currentCxMode === 'two_caixas'
              ? 'Mode 2 Caixas liées G/D. Clic pour délier (Caixas libres)'
              : 'Caixas libres (non liées). Clic pour lier Cx + Tarol'
          }
        >
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>
            {currentCxMode === 'caixa_tarol'
              ? 'Cx + Tarol'
              : currentCxMode === 'two_caixas'
              ? '2 Caixas (G/D)'
              : 'Caixas libres'}
          </span>
        </button>
      )}

      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowRolesMenu(!showRolesMenu)}
          className="px-2 py-1 rounded border border-[var(--cordel-border)] hover:bg-stone-500/10 font-medium"
        >
          + Piste ({currentExtras.length}) ▾
        </button>
        {showRolesMenu && (
          <div className="absolute left-0 bottom-full mb-1 z-30 w-36 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] shadow-lg rounded p-1 flex flex-col gap-0.5">
            {EXTRA_ROLES.filter((r) => !detected.has(r.code)).map((r) => (
              <label key={r.code} className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-stone-500/10 cursor-pointer rounded text-[11px]">
                <input
                  type="checkbox"
                  checked={currentExtras.includes(r.code)}
                  onChange={() => toggleRole(r.code)}
                  className="rounded border-stone-400"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <span className="text-[10px] opacity-70">Gabarit :</span>
        <select
          value={options.mixerTemplateId || ''}
          onChange={(e) => onChange({ ...options, mixerTemplateId: e.target.value || null })}
          className="px-1.5 py-0.5 text-[11px] rounded border border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)]"
        >
          <option value="">Standard (Neutre)</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
