import React from 'react';

interface SavePresetFieldsProps {
  name: string;
  setName: (v: string) => void;
  disabled: boolean;
  groupDisplayName: string;
  canPublishToGroup: boolean;
  canUploadAudio: boolean;
  autoGenerateAudio: boolean;
  setAutoGenerateAudio: (v: boolean) => void;
  isDraft: boolean;
  setIsDraft: (v: boolean) => void;
  isSuperAdmin: boolean;
  isShowcase: boolean;
  setIsShowcase: (v: boolean) => void;
  keepInGroup: boolean;
  setKeepInGroup: (v: boolean) => void;
  ownedPrivateCount: number;
  maxPrivateCloudPresets: number | null;
  lang: 'fr' | 'pt';
}

export const SavePresetFields: React.FC<SavePresetFieldsProps> = ({
  name, setName, disabled, groupDisplayName, canPublishToGroup, canUploadAudio,
  autoGenerateAudio, setAutoGenerateAudio, isDraft, setIsDraft, isSuperAdmin,
  isShowcase, setIsShowcase, keepInGroup, setKeepInGroup, ownedPrivateCount, maxPrivateCloudPresets, lang,
}) => {
  const isFr = lang === 'fr';
  const hasGroupTarget = canPublishToGroup && groupDisplayName && groupDisplayName !== 'Cloud';
  const destinationLabel = isSuperAdmin && isShowcase
    ? (isFr ? 'Vitrine Découverte (Public — écoute libre)' : 'Vitrine de Descoberta (Público — escuta livre)')
    : hasGroupTarget
    ? (isFr ? `Catalogue ${groupDisplayName}` : `Catálogo ${groupDisplayName}`)
    : (isFr
        ? `Mes brouillons Cloud (Privé — ${ownedPrivateCount}/${maxPrivateCloudPresets ?? 2})`
        : `Meus rascunhos na Nuvem (Privado — ${ownedPrivateCount}/${maxPrivateCloudPresets ?? 2})`);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase">{isFr ? 'Nom du Preset' : 'Nome do Preset'}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          placeholder="Ex: Opanijé"
          className="w-full bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] px-3 py-2 text-sm font-bold outline-none focus:border-[var(--cordel-accent-readable)] disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1 p-3 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
        <label className="text-xs font-bold uppercase text-[var(--cordel-text-muted)]">{isFr ? 'Destination' : 'Destino'}</label>
        <span className="text-sm font-bold text-[var(--cordel-text)] mt-0.5">{destinationLabel}</span>
      </div>

      {isSuperAdmin && (
        <div className="flex flex-col gap-2 p-3 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)]">
          <label className="text-xs font-bold cursor-pointer flex items-start gap-2">
            <input
              type="checkbox"
              data-testid="save-preset-showcase-checkbox"
              checked={isShowcase}
              onChange={(e) => setIsShowcase(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 mt-0.5 shrink-0 accent-[var(--cordel-wood)]"
            />
            <span>
              {isFr
                ? 'Mettre dans la Vitrine Découverte (écoute libre sans compte)'
                : 'Destacar na Vitrine de Descoberta (escuta livre sem conta)'}
            </span>
          </label>
          {isShowcase && hasGroupTarget && (
            <label className="text-[11px] font-semibold cursor-pointer flex items-center gap-2 pl-6 text-[var(--cordel-text-muted)]">
              <input
                type="checkbox"
                checked={keepInGroup}
                onChange={(e) => setKeepInGroup(e.target.checked)}
                disabled={disabled}
                className="w-3.5 h-3.5 shrink-0 accent-[var(--cordel-wood)]"
              />
              <span>
                {isFr ? `Conserver aussi dans Catalogue ${groupDisplayName}` : `Manter também em Catálogo ${groupDisplayName}`}
              </span>
            </label>
          )}
        </div>
      )}

      {canUploadAudio && (
        <label className="flex items-center gap-2 p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] cursor-pointer text-sm font-bold">
          <input
            type="checkbox"
            checked={autoGenerateAudio}
            onChange={(e) => setAutoGenerateAudio(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 accent-[var(--cordel-wood)]"
          />
          <span>{isFr ? "Générer l'audio" : 'Gerar áudio'}</span>
        </label>
      )}

      {canPublishToGroup && !isShowcase && (
        <label className="flex items-center gap-2 p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] cursor-pointer text-xs font-bold">
          <input
            type="checkbox"
            checked={isDraft}
            onChange={(e) => setIsDraft(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 accent-[var(--cordel-wood)]"
          />
          <span>
            {isFr
              ? 'Enregistrer en mode Brouillon / Chantier (masqué aux élèves)'
              : 'Salvar em modo Rascunho / Canteiro (oculto aos alunos)'}
          </span>
        </label>
      )}
    </div>
  );
};
