
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { notifyToast } from '../../utils/toastHelper';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function useEstandarteUpload(currentUser: any, onComplete: () => void) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const isPt = useSequencerStore.getState().lang === 'pt';

    if (!file.type.startsWith('image/')) {
      notifyToast(isPt ? 'Por favor, selecione uma imagem.' : 'Veuillez sélectionner une image.', 'error');
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
            notifyToast(isPt ? 'A imagem é muito grande mesmo após a compressão.' : "L'image est trop volumineuse même après compression.", 'error');
            setIsUploading(false);
            return;
          }

          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, { groupLogoUrl: dataUrl });
            notifyToast(isPt ? 'Seu logo foi atualizado com sucesso!' : 'Votre logo a été mis à jour avec succès !', 'success');
          } catch (err) {
            console.error('Erreur Firestore:', err);
            notifyToast(isPt ? 'Erro ao salvar o logo.' : 'Erreur lors de la sauvegarde.', 'error');
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
      notifyToast(isPt ? 'Ocorreu um erro.' : 'Une erreur est survenue.', 'error');
      setIsUploading(false);
      onComplete();
    }
  };

  return { isUploading, handleFileUpload };
}
