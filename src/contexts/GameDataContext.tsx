import React, { createContext, useContext, useState } from 'react';
import defaultVaralConfig from '../data/varalConfig.json';

export interface VaralCordeConfig {
  cordeIndex: number;
  requiredCount: number;
  oeuvreToniBraga: string; // Base64
  rewardData: string;
}

export interface VaralConfigData {
  module: 'varal_config';
  cordes: VaralCordeConfig[];
}

export interface CustomExercise {
  id: string;
  module: 'quiz' | 'dictee' | 'inspecteur' | 'sablier_mestre' | 'rythme_live';
  folheto_titre?: string;
  [key: string]: any;
}

interface GameDataContextType {
  varalConfig: VaralConfigData;
  customExercises: CustomExercise[];
  loadVaralConfig: (data: VaralConfigData) => void;
  addExercise: (data: any) => void;
  removeExercise: (id: string) => void;
  clearAllData: () => void;
}

const GameDataContext = createContext<GameDataContextType | undefined>(undefined);

export const GameDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [varalConfig, setVaralConfig] = useState<VaralConfigData>(() => {
    try {
      const saved = localStorage.getItem('oGirador_varal');
      return saved ? JSON.parse(saved) : (defaultVaralConfig as VaralConfigData);
    } catch (_) {
      return defaultVaralConfig as VaralConfigData;
    }
  });

  const [customExercises, setCustomExercises] = useState<CustomExercise[]>(() => {
    try {
      const saved = localStorage.getItem('oGirador_exercices');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const loadVaralConfig = (data: VaralConfigData) => {
    setVaralConfig(data);
    localStorage.setItem('oGirador_varal', JSON.stringify(data));
  };

  const addExercise = (data: any) => {
    // Determine unique ID based on module
    const exerciseId = data.id || `custom_${data.module}`;
    const newExercise: CustomExercise = {
      ...data,
      id: exerciseId
    };

    setCustomExercises(prev => {
      // Remove previous exercise of this ID/module to avoid duplicates
      const filtered = prev.filter(ex => ex.id !== exerciseId && ex.module !== data.module);
      const updated = [...filtered, newExercise];
      localStorage.setItem('oGirador_exercices', JSON.stringify(updated));
      return updated;
    });
  };

  const removeExercise = (id: string) => {
    setCustomExercises(prev => {
      const updated = prev.filter(ex => ex.id !== id);
      localStorage.setItem('oGirador_exercices', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllData = () => {
    setVaralConfig(defaultVaralConfig as VaralConfigData);
    setCustomExercises([]);
    localStorage.removeItem('oGirador_varal');
    localStorage.removeItem('oGirador_exercices');
  };

  return (
    <GameDataContext.Provider value={{ varalConfig, customExercises, loadVaralConfig, addExercise, removeExercise, clearAllData }}>
      {children}
    </GameDataContext.Provider>
  );
};

export const useGameData = () => {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context;
};
