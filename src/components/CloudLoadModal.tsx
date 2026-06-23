import React, { useEffect, useState } from 'react';
import { CloudExercise, CloudProgression, fetchMestreExercises, fetchMestreProgressions, GameType, deleteExerciseFromCloud, deleteProgressionFromCloud } from '../cloudExercises';
import { X, Trash2, Cloud, FileJson, Loader2 } from 'lucide-react';

interface CloudLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  activeTab: string; // 'quiz', 'dictee', 'sablier', 'inspecteur', 'cordes'
  onLoadExercise: (json: any) => void;
  lang: 'fr' | 'pt';
}

export function CloudLoadModal({ isOpen, onClose, ownerId, activeTab, onLoadExercise, lang }: CloudLoadModalProps) {
  const [items, setItems] = useState<(CloudExercise | CloudProgression)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    const loadItems = async () => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'cordes' || activeTab === 'varal') {
          const progressions = await fetchMestreProgressions(ownerId);
          setItems(progressions);
        } else {
          const exercises = await fetchMestreExercises(ownerId, activeTab as GameType);
          setItems(exercises);
        }
      } catch (err) {
        console.error("Error fetching cloud items", err);
        setError(lang === 'fr' ? "Erreur lors du chargement." : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    };
    
    loadItems();
  }, [isOpen, activeTab, ownerId, lang]);

  const handleSelect = (item: CloudExercise | CloudProgression) => {
    try {
      const LZString = require('lz-string');
      const jsonStr = LZString.decompressFromBase64(item.data);
      if (!jsonStr) throw new Error("Invalid compression");
      const json = JSON.parse(jsonStr);
      onLoadExercise(json);
      onClose();
    } catch (e) {
      console.error("Failed to parse cloud item", e);
      alert(lang === 'fr' ? "Fichier corrompu." : "Arquivo corrompido.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: CloudExercise | CloudProgression) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(lang === 'fr' ? "Êtes-vous sûr de vouloir supprimer cet élément ?" : "Tem certeza que deseja excluir este item?");
    if (!confirmDelete) return;

    try {
      if (activeTab === 'cordes' || activeTab === 'varal') {
        await deleteProgressionFromCloud(item.id);
      } else {
        await deleteExerciseFromCloud(item.id);
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      console.error(err);
      alert(lang === 'fr' ? "Erreur lors de la suppression." : "Erro ao excluir.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-md p-6 relative flex flex-col gap-4 max-h-[80vh]">
        <button onClick={onClose} className="absolute top-2 right-2 text-[var(--cordel-text)]/50 hover:text-[var(--cordel-text)]">
          <X className="w-6 h-6" />
        </button>
        
        <h3 className="font-cactus text-2xl font-black text-[var(--cordel-wood)] text-center uppercase flex items-center justify-center gap-2">
          <Cloud className="w-6 h-6" />
          {lang === 'fr' ? 'Mon Cloud' : 'Meu Cloud'}
        </h3>
        
        <p className="text-sm text-center text-[var(--cordel-text)]/80 mb-2 font-bold">
          {activeTab === 'cordes' 
            ? (lang === 'fr' ? "Vos progressions sauvegardées" : "Seus progressos salvos")
            : (lang === 'fr' ? "Vos exercices sauvegardés" : "Seus exercícios salvos")}
        </p>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--cordel-wood)]" />
          </div>
        ) : error ? (
          <p className="text-red-600 font-bold text-center">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-center italic opacity-70 p-4">
            {lang === 'fr' ? "Aucun élément trouvé." : "Nenhum item encontrado."}
          </p>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
            {items.map(item => (
              <div 
                key={item.id}
                onClick={() => handleSelect(item)}
                className="flex items-center justify-between p-3 border-2 border-[var(--cordel-border)]/30 rounded cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileJson className="w-5 h-5 shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold truncate">{item.name}</span>
                    <span className="text-[10px] opacity-70">
                      {new Date(item.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => handleDelete(e, item)}
                  className="p-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
