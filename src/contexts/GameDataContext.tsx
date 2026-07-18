import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import defaultVaralConfig from '../data/varalConfig.json';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { fetchStudentProgressionFromCloud, saveStudentProgressionToCloud } from '../cloudExercises';

export interface CordeReward {
  text?: string;
  type: 'image' | 'video' | 'pdf' | 'json' | 'none';
  url?: string;
  base64?: string;
  jsonContent?: any;
}

export interface VaralCordeConfig {
  cordeIndex: number;
  requiredCount: number;
  gameType?: string;
  games?: any[];
  oeuvreToniBraga: string; // Base64 (legacy fallback)
  rewardData: string;
  reward?: CordeReward;
}

export interface VaralConfigData {
  module: 'varal_config';
  id?: string;
  name?: string;
  cordes: VaralCordeConfig[];
  ownerId?: string;
  access?: 'eleves' | 'public';
  versionId?: number;
  diplomaText?: string;
  diplomaSignature?: string;
}

export interface CustomExercise {
  id: string;
  module: 'quiz' | 'dictee' | 'inspecteur' | 'sablier_mestre' | 'rythme_live';
  folheto_titre?: string;
  [key: string]: any;
}

interface GameDataContextType {
  activeVarals: VaralConfigData[];
  varalConfig: VaralConfigData;
  customExercises: CustomExercise[];
  completedExerciseIds: string[];
  pendingVaralUpdate: VaralConfigData | null;
  loadVaralConfig: (data: VaralConfigData) => void;
  setSelectedVaral: (data: VaralConfigData) => void;
  addExercise: (data: any) => void;
  removeExercise: (id: string) => void;
  clearAllData: () => void;
  completeExercise: (id: string) => void;
  applyPendingVaralUpdate: () => void;
  ignorePendingVaralUpdate: () => void;
}

const GameDataContext = createContext<GameDataContextType | undefined>(undefined);

export const GameDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, loading } = useAuth();
  
  const [activeVarals, setActiveVarals] = useState<VaralConfigData[]>([]);
  const [varalConfig, setVaralConfig] = useState<VaralConfigData>(() => {
    try {
      const saved = localStorage.getItem('oGirador_varal');
      return saved ? JSON.parse(saved) : (defaultVaralConfig as VaralConfigData);
    } catch (_) {
      return defaultVaralConfig as VaralConfigData;
    }
  });

  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oGirador_completed_exercises');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [pendingVaralUpdate, setPendingVaralUpdate] = useState<VaralConfigData | null>(null);

  useEffect(() => {
    if (loading) return;

    const fetchVaral = async () => {
      try {
        let varalId = 'global_public';
        
        if (userProfile) {
          if (userProfile.role === 'eleve' && userProfile.mestreId) {
            varalId = `mestre_${userProfile.mestreId}`;
          } else if (userProfile.role === 'mestre' || userProfile.role === 'admin') {
            // Mestre tests their own varal, Admin tests their own or public
            varalId = `mestre_${userProfile.uid}`;
          }
        }
        
        const docRef = doc(db, 'varals', varalId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const fetchedData = docSnap.data();
          let varalList: VaralConfigData[] = [];
          if (fetchedData.activeVarals && Array.isArray(fetchedData.activeVarals)) {
            varalList = fetchedData.activeVarals;
          } else {
            // Legacy single configuration
            varalList = [fetchedData as VaralConfigData];
          }
          setActiveVarals(varalList);

          // Find saved selected varal or default to first
          const savedSelectedId = localStorage.getItem('oGirador_selected_varal_id');
          let selected = varalList.find(v => v.id === savedSelectedId) || null;
          if (!selected && varalList.length > 0) {
            selected = varalList[0];
          }

          if (selected) {
            setVaralConfig(selected);
            localStorage.setItem('oGirador_varal', JSON.stringify(selected));
          }

          const ignoredVersionStr = localStorage.getItem('oGirador_ignored_varal_version');
          const ignoredVersion = ignoredVersionStr ? parseInt(ignoredVersionStr, 10) : 0;
          
          // Check student progression from Firebase
          let currentProgress = completedExerciseIds;
          if (userProfile && userProfile.uid) {
            const cloudProgress = await fetchStudentProgressionFromCloud(userProfile.uid);
            if (cloudProgress.length > 0) {
              // Merge local and cloud progress
              const merged = Array.from(new Set([...currentProgress, ...cloudProgress]));
              setCompletedExerciseIds(merged);
              localStorage.setItem('oGirador_completed_exercises', JSON.stringify(merged));
              currentProgress = merged;
            }
          }

          // Vérification de la version si on a une progression
          const hasProgress = currentProgress.length > 0;
          const isNewerVersion = selected && fetchedData.versionId && selected.versionId && fetchedData.versionId > selected.versionId;
          const isNotIgnored = !fetchedData.versionId || fetchedData.versionId > ignoredVersion;
          
          if (hasProgress && isNewerVersion && isNotIgnored) {
            setPendingVaralUpdate(fetchedData as VaralConfigData);
          }
        }
      } catch (err) {
        console.error("Error fetching varal from Firebase:", err);
      }
    };
    
    fetchVaral();
  }, [userProfile, loading]); // Remove completedExerciseIds from deps to avoid re-fetching constantly

  const customExercises = useMemo(() => {
    const exercises: CustomExercise[] = [];
    if (varalConfig && varalConfig.cordes) {
      varalConfig.cordes.forEach(corde => {
        if (corde.games && Array.isArray(corde.games)) {
          corde.games.forEach(game => {
            exercises.push(game as CustomExercise);
          });
        }
      });
    }
    return exercises;
  }, [varalConfig]);

  const loadVaralConfig = (data: VaralConfigData) => {
    setVaralConfig(data);
    localStorage.setItem('oGirador_varal', JSON.stringify(data));
  };

  const setSelectedVaral = (data: VaralConfigData) => {
    setVaralConfig(data);
    localStorage.setItem('oGirador_varal', JSON.stringify(data));
    if (data.id) {
      localStorage.setItem('oGirador_selected_varal_id', data.id);
    }
  };

  const addExercise = (data: any) => {};
  const removeExercise = (id: string) => {};

  const clearAllData = () => {
    setVaralConfig(defaultVaralConfig as VaralConfigData);
    localStorage.removeItem('oGirador_varal');
    localStorage.removeItem('oGirador_selected_varal_id');
  };

  const completeExercise = (id: string) => {
    setCompletedExerciseIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem('oGirador_completed_exercises', JSON.stringify(updated));
      
      // Save to Firebase asynchronously if authenticated
      if (userProfile && userProfile.uid) {
        saveStudentProgressionToCloud(userProfile.uid, updated).catch(err => {
          console.error("Failed to save student progress to cloud:", err);
        });
      }
      
      return updated;
    });
  };

  const applyPendingVaralUpdate = () => {
    if (pendingVaralUpdate) {
      setVaralConfig(pendingVaralUpdate);
      localStorage.setItem('oGirador_varal', JSON.stringify(pendingVaralUpdate));
      setCompletedExerciseIds([]);
      localStorage.setItem('oGirador_completed_exercises', JSON.stringify([]));
      setPendingVaralUpdate(null);
    }
  };

  const ignorePendingVaralUpdate = () => {
    if (pendingVaralUpdate && pendingVaralUpdate.versionId) {
      localStorage.setItem('oGirador_ignored_varal_version', pendingVaralUpdate.versionId.toString());
    }
  };

  return (
    <GameDataContext.Provider value={{ 
      activeVarals,
      varalConfig, 
      customExercises, 
      completedExerciseIds,
      pendingVaralUpdate,
      loadVaralConfig, 
      setSelectedVaral,
      addExercise, 
      removeExercise, 
      clearAllData,
      completeExercise,
      applyPendingVaralUpdate,
      ignorePendingVaralUpdate
    }}>
      {children}
    </GameDataContext.Provider>
  );
};

export const useGameData = () => {
  const context = useContext(GameDataContext);
  if (!context) throw new Error('useGameData must be used within a GameDataProvider');
  return context;
};
