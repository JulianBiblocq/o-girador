/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';

export interface MetadonneesDanse {
  tenantId: string;
  morceauId: string;
  bpm: number;
  totalMesures: number;
  signature: string;
  titre: string;
  dateExport: number;
}

/**
 * Hook gérant la publication du master audio vers Firebase (Storage + Firestore).
 * Destiné à l'application "O Girador Dança".
 */
export function usePublierVersDanca() {
  const [estEnCours, setEstEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Uploade l'audio et publie les métadonnées.
   */
  const publierMasterAudio = async (blob: Blob, metadonnees: MetadonneesDanse): Promise<string> => {
    setEstEnCours(true);
    setErreur(null);

    try {
      const { tenantId, morceauId } = metadonnees;
      
      // 1. Upload vers Storage
      const cheminFichier = `exports_danse/${tenantId}/${morceauId}.wav`;
      const storageRef = ref(storage, cheminFichier);
      
      console.log(`[Export Danse] ÉTAPE 3: Upload Firebase Storage vers ${cheminFichier}...`);
      await uploadBytes(storageRef, blob, { contentType: 'audio/wav' });
      
      // 2. Récupération de l'URL publique
      const audioUrl = await getDownloadURL(storageRef);
      console.log(`[Export Danse] Fichier uploadé avec succès: ${audioUrl}`);
      
      // 3. Mise à jour de Firestore
      console.log(`[Export Danse] ÉTAPE 4: Écriture Firestore (document ${tenantId}_${morceauId})...`);
      const documentRef = doc(db, 'choregraphies', `${tenantId}_${morceauId}`);
      await setDoc(documentRef, {
        ...metadonnees,
        audioUrl,
        derniereMiseAJour: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[Export Danse] Métadonnées publiées dans Firestore avec succès.`);
      
      setEstEnCours(false);
      return audioUrl;
      
    } catch (err: any) {
      console.error('[Export Danse] Erreur lors de la publication:', err);
      // Différencie si c'est Firebase Permission, etc.
      let messageErreur = 'Une erreur est survenue lors de la publication.';
      if (err.code && err.code.includes('permission-denied')) {
        messageErreur = 'Erreur Firebase Permission';
      } else if (err.message) {
        messageErreur = err.message;
      }
      setErreur(messageErreur);
      setEstEnCours(false);
      throw new Error(messageErreur); // Repropage l'erreur formatée
    }
  };

  return {
    publierMasterAudio,
    estEnCoursPublication: estEnCours,
    erreurPublication: erreur
  };
}
