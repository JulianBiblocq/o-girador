import React from 'react';
import { useNewSequencerStore } from '../stores/useNewSequencerStore';

export const NewMestreStudio: React.FC = () => {
  const exportGridToJson = () => {
    // 1. Récupération non-réactive de l'état actuel de la partition
    const { trackIds, tracks, steps } = useNewSequencerStore.getState();

    // 2. Construction de l'objet d'exportation normalisé
    const exportData = {
      format: 'o-girador-exercise',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      trackIds,
      tracks: Object.keys(tracks).reduce((acc, id) => {
        acc[id] = {
          id: tracks[id].id,
          name: tracks[id].name,
          isMuted: tracks[id].isMuted,
        };
        return acc;
      }, {} as Record<string, any>),
      steps: Object.keys(steps).reduce((acc, id) => {
        acc[id] = [...steps[id]];
        return acc;
      }, {} as Record<string, boolean[]>),
    };

    // 3. Génération et déclenchement du téléchargement
    try {
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `o-girador-rythme-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Sécurité mémoire : nettoyage du lien et révocation immédiate du blob
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export rhythm grid to JSON:', error);
    }
  };

  return (
    <div className="mestre-studio-container">
      <h3 className="mestre-studio-title">Mestre Studio</h3>
      <p className="mestre-studio-description">
        Exportez la grille rythmique actuelle pour générer un fichier d'exercice pédagogique (JSON) destiné aux élèves.
      </p>
      <button
        type="button"
        onClick={exportGridToJson}
        className="mestre-studio-export-btn"
      >
        📥 Exporter le rythme
      </button>
    </div>
  );
};
