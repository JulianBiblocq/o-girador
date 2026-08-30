/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, db, auth } from '../firebase/config';
import { telemetryService } from '../services/telemetryService';

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
      
      // Force le content-type en audio pour respecter les règles Firebase (Storage)
      // Chrome MediaRecorder génère souvent du video/webm même pour de l'audio.
      let mimeType = blob.type || 'audio/webm';
      if (mimeType.includes('video/webm')) mimeType = 'audio/webm';
      if (mimeType.includes('video/mp4')) mimeType = 'audio/mp4';
      
      // 1. Upload vers Storage
      const cheminFichier = `exports_danse/${tenantId}/${id}.${ext}`;
      const storageRef = ref(storage, cheminFichier);
      

      await uploadBytes(storageRef, blob, { contentType: mimeType });
      
      // 2. Récupération de l'URL publique
      const audioUrl = await getDownloadURL(storageRef);

      
      // 3. Mise à jour de Firestore (collection audio_masters)
      const safeTenantId = tenantId || "tenant_local";
      const documentId = `${safeTenantId}_${id}`;

      const documentRef = doc(db, 'audio_masters', documentId);
      
      try {
        const payload = {
          ...metadonnees,
          tenantId: safeTenantId,
          audioUrl,
          createdAt: new Date().toISOString()
        };

        
        await setDoc(documentRef, payload, { merge: true });

      } catch (firestoreError: any) {
        console.error("ÉCHEC Écriture Firestore :", firestoreError);
        throw firestoreError;
      }
      
      setEstEnCours(false);
      return audioUrl;
      
    } catch (err: any) {
      console.error('[Export Danse] Erreur lors de la publication:', err);
      telemetryService.logError(err, 'usePublierVersDanca', auth.currentUser?.uid);
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
