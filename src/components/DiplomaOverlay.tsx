import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameData } from '../contexts/GameDataContext';
import { Award, Download, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import html2canvas from 'html2canvas';

interface DiplomaOverlayProps {
  onClose: () => void;
  lang: 'fr' | 'pt';
}

export const DiplomaOverlay: React.FC<DiplomaOverlayProps> = ({ onClose, lang }) => {
  const { userProfile } = useAuth();
  const { varalConfig } = useGameData();
  const [mestreSignatureUrl, setMestreSignatureUrl] = useState<string | null>(varalConfig.diplomaSignature || 'https://www.girador.fr/assets/valid-varal.png');

  useEffect(() => {
    const fetchMestreSignature = async () => {
      if (varalConfig.ownerId && !varalConfig.diplomaSignature) {
        try {
          const mestreDoc = await getDoc(doc(db, 'users', varalConfig.ownerId));
          if (mestreDoc.exists()) {
            const mestreData = mestreDoc.data();
            if (mestreData.signatureUrl) {
              setMestreSignatureUrl(mestreData.signatureUrl);
            }
          }
        } catch (error) {
          console.error("Error fetching mestre signature", error);
        }
      }
    };
    fetchMestreSignature();
  }, [varalConfig.ownerId]);

  const rawText = varalConfig.diplomaText || (lang === 'fr' 
    ? "Félicitations {studentName} pour avoir terminé le parcours O Girador !"
    : "Parabéns {studentName} por terminar o percurso O Girador!");
    
  const studentName = userProfile?.displayName || (lang === 'fr' ? 'Élève' : 'Aluno');
  const diplomaMessage = rawText.replace('{studentName}', studentName);

  const downloadDiploma = async () => {
    const element = document.getElementById('diploma-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { backgroundColor: '#fdfaf2' });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `diploma_${studentName}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('Error downloading diploma', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="relative max-w-3xl w-full bg-[#fdfaf2] border-8 border-[var(--cordel-border)] p-8 shadow-2xl flex flex-col items-center cordel-bg">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-[var(--cordel-text)] hover:text-red-600 transition"
        >
          <X className="w-8 h-8" />
        </button>

        <div id="diploma-container" className="flex flex-col items-center w-full p-8 border-4 border-dashed border-[var(--cordel-border)]/30 bg-[#fdfaf2]">
          <Award className="w-24 h-24 text-[var(--cordel-wood)] mb-6" />
          
          <h2 className="font-cactus text-4xl md:text-5xl uppercase tracking-widest text-center text-[var(--cordel-text)] font-extrabold mb-8">
            {lang === 'fr' ? 'Certificat de Réussite' : 'Certificado de Conclusão'}
          </h2>

          <div className="flex items-center gap-6 mb-8">
            {userProfile?.photoURL && (
              <img 
                src={userProfile.photoURL} 
                alt="Student" 
                className="w-24 h-24 rounded-full border-4 border-[var(--cordel-border)] object-cover grayscale"
              />
            )}
            <h3 className="font-cactus text-3xl font-bold text-[var(--cordel-text)] uppercase underline decoration-[var(--cordel-wood)] decoration-4 underline-offset-8">
              {studentName}
            </h3>
          </div>

          <p className="text-lg md:text-xl text-center max-w-xl font-medium mb-12 italic opacity-80 leading-relaxed">
            {diplomaMessage}
          </p>

          {mestreSignatureUrl && (
            <div className="mt-8 flex flex-col items-center border-t-2 border-[var(--cordel-border)]/50 pt-4 w-64">
              <span className="text-xs uppercase font-bold tracking-wider mb-2 opacity-60">
                {lang === 'fr' ? 'Signature du Mestre' : 'Assinatura do Mestre'}
              </span>
              <img 
                src={mestreSignatureUrl} 
                alt="Signature Mestre" 
                className="max-h-24 object-contain mix-blend-multiply"
              />
            </div>
          )}
        </div>

        <button 
          onClick={downloadDiploma}
          className="mt-8 flex items-center gap-2 bg-[var(--cordel-wood)] text-white px-6 py-3 font-bold uppercase rounded shadow hover:bg-[var(--cordel-text)] transition cordel-button"
        >
          <Download className="w-5 h-5" />
          {lang === 'fr' ? 'Télécharger' : 'Baixar Diploma'}
        </button>
      </div>
    </div>
  );
};
