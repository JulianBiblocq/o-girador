/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, db, auth } from '../firebase/config';

export interface MetadonneesDanse {
  id: string;
  tenantId: string;
  nom: string;
  bpm: number;
  totalMesures: number;
  sinaisDoMestre: any[];
  toada?: string;
  nacao?: string;
  compositor?: string;
  ritmo?: string;
  videoUrl?: string;
  timeSig?: string;
  mestreId?: string;
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
      const { id, tenantId } = metadonnees;
      
      // Détermine l'extension selon le type MIME du blob
      const ext = blob.type.includes('webm') ? 'webm' : (blob.type.includes('mp4') ? 'mp4' : 'wav');
      
      // 1. Upload vers Storage
      const cheminFichier = `exports_danse/${tenantId}/${id}.${ext}`;
      const storageRef = ref(storage, cheminFichier);
      
      console.log(`[Export Danse] ÉTAPE 3: Upload Firebase Storage vers ${cheminFichier}...`);
      await uploadBytes(storageRef, blob, { contentType: blob.type || 'audio/webm' });
      
      // 2. Récupération de l'URL publique
      const audioUrl = await getDownloadURL(storageRef);
      console.log(`[Export Danse] Fichier uploadé avec succès: ${audioUrl}`);
      
      // 3. Mise à jour de Firestore (collection audio_masters)
      console.log(`[Export Danse] ÉTAPE 4: Écriture Firestore (document ${tenantId}_${id})...`);
      const documentRef = doc(db, 'audio_masters', `${tenantId}_${id}`);
      await setDoc(documentRef, {
        ...metadonnees,
        audioUrl,
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[Export Danse] Métadonnées publiées dans Firestore avec succès.`);
      
      setEstEnCours(false);
      return audioUrl;
      
    } catch (err: any) {
      console.error('[Export Danse] Erreur lors de la publication:', err);
      let messageErreur = 'Une erreur est survenue lors de la publication.';
      if (err.code && err.code.includes('permission-denied')) {
        messageErreur = auth.currentUser 
          ? 'Erreur Firebase Permission (Règles non propagées ?)' 
          : 'Vous devez être connecté (Profil > Login) pour exporter.';
      } else if (err.code && err.code.includes('unauthorized')) {
        messageErreur = auth.currentUser 
          ? 'Erreur Firebase Non-Autorisé' 
          : 'Connexion requise pour exporter.';
      } else if (err.message) {
        messageErreur = err.message;
      }
      setErreur(messageErreur);
      setEstEnCours(false);
      throw new Error(messageErreur);
    }
  };

  return {
    publierMasterAudio,
    estEnCoursPublication: estEnCours,
    erreurPublication: erreur
  };
}
