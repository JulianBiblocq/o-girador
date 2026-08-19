import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const telemetryService = {
  /**
   * Envoie une erreur au Hub Central (Orquestrador)
   * @param error - L'erreur interceptée
   * @param context - Le composant ou l'action où l'erreur s'est produite
   * @param groupId - L'ID de l'association (si l'utilisateur est connecté)
   */
  logError: async (error: Error | string, context: string = 'global', groupId: string = 'anonymous') => {
    try {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : null;

      await addDoc(collection(db, 'hub_system_errors'), {
        appId: 'sequenceur',
        groupId: groupId,
        error: errorMsg,
        stack: errorStack,
        context: context,
        timestamp: serverTimestamp(),
        resolved: false
      });
      
      console.log('Télémétrie : Erreur remontée à l\'Orquestrador.');
    } catch (err) {
      console.error('Échec de l\'envoi de la télémétrie:', err);
    }
  }
};
