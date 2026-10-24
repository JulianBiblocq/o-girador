
import React from 'react';
import { CatalogVisibility, Language } from '../../../types';

export interface EditorCloudSaveModalProps {
  saveModalPatternId: number | null;
  onClose: () => void;
  lang: Language;
  savePatternName: string;
  setSavePatternName: (val: string) => void;
  savePatternFolder: string;
  setSavePatternFolder: (val: string) => void;
  existingFolders: string[];
  savePatternVisibility: CatalogVisibility;
  setSavePatternVisibility: (val: CatalogVisibility) => void;
  userProfile: any;
  isGroupMemberOrEditor: boolean;
  autoGeneratePatternAudio: boolean;
  setAutoGeneratePatternAudio: (val: boolean) => void;
  isSavingPattern: boolean;
  isBouncingCloud: boolean;
  handleSavePatternToLibrary: () => void;
}

export const EditorCloudSaveModal: React.FC<EditorCloudSaveModalProps> = React.memo((props) => {
  const {
    saveModalPatternId, onClose, lang, savePatternName, setSavePatternName,
    savePatternFolder, setSavePatternFolder, existingFolders, savePatternVisibility,
    setSavePatternVisibility, userProfile, isGroupMemberOrEditor, autoGeneratePatternAudio,
    setAutoGeneratePatternAudio, isSavingPattern, isBouncingCloud, handleSavePatternToLibrary,
  } = props;

  if (saveModalPatternId === null) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-theme="light" style={{ colorScheme: 'light' }} onClick={onClose}>
      <div className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-sm w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-cactus text-2xl font-bold text-[#1a1a1a] mb-4">{lang === 'fr' ? 'Sauvegarder dans le catalogue' : 'Salvar no catálogo'}</h3>
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-1">{lang === 'fr' ? 'Nom du motif' : 'Nome do padrão'}</label>
          <input type="text" value={savePatternName} onChange={(e) => setSavePatternName(e.target.value)} className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]" placeholder={lang === 'fr' ? 'Ex: Groovy Break' : 'Ex: Groovy Break'} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-1">{lang === 'fr' ? 'Dossier' : 'Pasta'}</label>
          <input type="text" list="folder-suggestions" value={savePatternFolder} onChange={(e) => setSavePatternFolder(e.target.value)} className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]" placeholder={lang === 'fr' ? 'Ex: Général' : 'Ex: Geral'} />
          <datalist id="folder-suggestions">{existingFolders.map((f) => <option key={f} value={f} />)}</datalist>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-1">{lang === 'fr' ? 'Visibilité' : 'Visibilidade'}</label>
          <select value={savePatternVisibility} onChange={(e) => setSavePatternVisibility(e.target.value as CatalogVisibility)} className="w-full bg-[#eaddcf] border border-[#1a1a1a] p-2 text-sm font-bold text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[#8b2a1a]">
            <option value="private">{lang === 'fr' ? 'Privé (Uniquement moi)' : 'Privado (Somente eu)'}</option>
            {(userProfile?.role === 'mestre' || userProfile?.canWriteSequenciador || isGroupMemberOrEditor) && <option value="mestre_group">{lang === 'fr' ? 'Mon groupe' : 'Meu grupo'}</option>}
            {userProfile?.role === 'admin' && <option value="admin_global">{lang === 'fr' ? 'Global (Tout le monde)' : 'Global (Todos)'}</option>}
          </select>
        </div>
        <div className="mb-6 flex items-center gap-2">
          <input type="checkbox" id="autoGeneratePatternAudio" checked={autoGeneratePatternAudio} onChange={(e) => setAutoGeneratePatternAudio(e.target.checked)} disabled={isSavingPattern || isBouncingCloud} className="w-4 h-4 accent-[#8b2a1a]" />
          <label htmlFor="autoGeneratePatternAudio" className="text-sm font-bold text-[#1a1a1a] cursor-pointer">{lang === 'fr' ? "Générer l'aperçu audio (MP3/WAV)" : 'Gerar áudio (MP3/WAV)'}</label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-[#1a1a1a] text-[#1a1a1a] font-bold text-sm hover:bg-[#eaddcf] cursor-pointer" disabled={isSavingPattern || isBouncingCloud}>{lang === 'fr' ? 'Annuler' : 'Cancelar'}</button>
          <button onClick={handleSavePatternToLibrary} disabled={!savePatternName.trim() || isSavingPattern || isBouncingCloud || !userProfile} className="px-4 py-2 bg-[#8b2a1a] text-[#f4ecd8] font-bold text-sm disabled:opacity-50 hover:bg-[#6b1e11] shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center min-w-[120px] cursor-pointer">
            {isSavingPattern || isBouncingCloud ? '...' : (lang === 'fr' ? 'Enregistrer' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
});

EditorCloudSaveModal.displayName = 'EditorCloudSaveModal';
