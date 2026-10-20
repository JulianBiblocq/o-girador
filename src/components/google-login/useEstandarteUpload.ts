/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export function useEstandarteUpload(currentUser: any, onComplete: () => void) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image.');
      return;
    }

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          if (dataUrl.length > 800000) {
            alert("L'image est trop volumineuse même après compression.");
            setIsUploading(false);
            return;
          }

          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, { groupLogoUrl: dataUrl });
            alert('Votre logo a été mis à jour avec succès !');
          } catch (err) {
            console.error('Erreur Firestore:', err);
            alert('Erreur lors de la sauvegarde.');
          } finally {
            setIsUploading(false);
            onComplete();
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erreur générale:', error);
      alert('Une erreur est survenue.');
      setIsUploading(false);
      onComplete();
    }
  };

  return { isUploading, handleFileUpload };
}
