import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { GoogleLoginButton } from './GoogleLoginButton';
import * as Tone from 'tone';
import { Edit2, Check, X } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
  lang: 'fr' | 'pt';
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, lang }) => {
  const { userProfile, hasAccess } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [mestreMessage, setMestreMessage] = useState<string | null>(null);
  const [isEditingMsg, setIsEditingMsg] = useState(false);
  const [editMsgContent, setEditMsgContent] = useState('');
  const [isSavingMsg, setIsSavingMsg] = useState(false);

  // Détermine la langue du texte de présentation
  const hasSavedLang = localStorage.getItem('o_girador_lang') !== null;
  const isBrowserFr = typeof navigator !== 'undefined' && navigator.language.startsWith('fr');
  const displayFr = hasSavedLang ? (lang === 'fr') : isBrowserFr;

  useEffect(() => {
    const fetchMestreData = async () => {
      if (hasAccess('mestre')) {
        if (userProfile?.groupLogoUrl) setLogoUrl(userProfile.groupLogoUrl);
        if (userProfile?.mestreMessage) setMestreMessage(userProfile.mestreMessage);
        return;
      }
      
      if (userProfile?.mestreId) {
        try {
          const mestreDoc = await getDoc(doc(db, 'users', userProfile.mestreId));
          if (mestreDoc.exists()) {
            const mestreData = mestreDoc.data();
            if (mestreData) {
              if (mestreData.groupLogoUrl) setLogoUrl(mestreData.groupLogoUrl);
              if (mestreData.mestreMessage) setMestreMessage(mestreData.mestreMessage);
            }
          }
        } catch (error) {
          console.error("Error fetching mestre data:", error);
        }
      }
    };

    fetchMestreData();
  }, [userProfile, hasAccess]);

  const handleSaveMessage = async () => {
    if (!userProfile?.uid) return;
    setIsSavingMsg(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, { mestreMessage: editMsgContent });
      setMestreMessage(editMsgContent);
      setIsEditingMsg(false);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du message :", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSavingMsg(false);
    }
  };

  const handleEnter = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    onEnter();
  };

  const frText = (
    <>
      <p><strong>O Girador : Le séquenceur dédié au Maracatu de Baque Virado</strong><br/>
      Le maracatu de baque virado est une musique traditionnelle forte d'histoire, souvent empreinte d'une grande spiritualité et un symbole de résistance puissant. Cette tradition est transmise par voie orale dans son entièreté par les mestres depuis son origine.</p>

      <p>L'application O Girador ne veut en aucun cas se substituer à la transmission des mestres. Elle a pour seule vocation d'être un outil pédagogique et ludique de compréhension du rythme et de l'entrelacement des percussions et des voix.</p>

      <p>Composez, sculptez le son et partagez vos arrangements :</p>

      <p>
        <strong>Composition et arrangements :</strong> l'application est conçue pour composer et écouter vos arrangements de maracatu de baque virado avec l'Alfaia, le Gonguê, la Caixa, le Tarol, le Mineiro, l'Agbê, le Timbal et les voix !!!<br/><br/>
        <strong>Les samples :</strong> Profitez d'une banque de sons avec de vrais samples et la possibilité de sculpter le son de chaque pas du séquenceur avec précision.<br/><br/>
        <strong>Le "Balanço" :</strong> L'application intègre un groove axé maracatu que vous pouvez modifier, couplé à une humanisation pour se rapprocher de la pulsation organique du maracatu.
      </p>

      <p>Utiliser sur un ordinateur ou un appareil mobile récent vous permettra de profiter des meilleures conditions d'utilisation.</p>

      <p>Profitez bien de cette application en attendant la prochaine vivência !</p>
    </>
  );

  const ptText = (
    <p>O Maracatu de Baque Virado, poderosa percussão brasileira originária do Recife (Pernambuco), aprende-se no coração da roda pela transmissão oral das Nações. Nenhuma máquina substituirá os ensinamentos dos mestres. O Girador foi pensado com humildade para se somar a isso: é um caderno sonoro gratuito, um sequenciador interativo e uma bateria eletrônica online para criar, experimentar seus baques e vislumbrar as polirritmias secretas entre as alfaias, a caixa, o tarol, o gonguê, o agbê, o mineiro e as toadas, aguardando o próximo ensinamento vivo.</p>
  );

  return (
    <div id="landing-page">
      <header className="lp-header">
        <GoogleLoginButton lang={lang} />
      </header>
      
      <main className="lp-center">
        <div className="lp-o-container">
          <svg className="lp-alfaia-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" fill="none" stroke="#1a1a1a" strokeWidth="1"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#1a1a1a" strokeWidth="0.8" strokeDasharray="2 2"/>
            <path d="M 50 2 L 65 12 L 50 22 L 35 12 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 84 16 L 90 30 L 78 38 L 70 24 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 98 50 L 88 65 L 78 50 L 88 35 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 84 84 L 70 90 L 60 78 L 74 70 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 50 98 L 35 88 L 50 78 L 65 88 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 16 84 L 10 70 L 22 62 L 30 76 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 2 50 L 12 35 L 22 50 L 12 65 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
            <path d="M 16 16 L 30 10 L 40 22 L 26 30 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.8" />
          </svg>
          <button id="entra-btn" className="lp-entra-btn" onClick={handleEnter}>ENTRA<br/>NA RODA</button>
        </div>
        <h1 className="sr-only">O Girador - Séquenceur et Boîte à Rythmes de Maracatu de Baque Virado | Sequenciador Interativo</h1>
        <div className="lp-title">GIRADOR</div>
      </main>
      
      <footer className="lp-footer">
        <div className="lp-text-container">
          <div className="lp-text" id="lp-desc">
            {displayFr ? frText : ptText}
          </div>
        </div>
        
        {(mestreMessage || hasAccess('mestre')) && (
          <div className="lp-mestre-message">
            <div className="lp-message-header">
              <span className="lp-message-title">A palavra do mestre / La parole du mestre</span>
              {hasAccess('mestre') && !isEditingMsg && (
                <button onClick={() => { setEditMsgContent(mestreMessage || ''); setIsEditingMsg(true); }} className="lp-edit-btn" title="Modifier le message">
                  <Edit2 size={14} />
                </button>
              )}
            </div>
            
            {isEditingMsg ? (
              <div className="lp-message-editor">
                <textarea 
                  value={editMsgContent} 
                  onChange={(e) => setEditMsgContent(e.target.value)}
                  placeholder="Tapez ici le mot de la semaine, une consigne, etc."
                  className="lp-textarea custom-scrollbar"
                />
                <div className="lp-editor-actions">
                  <button onClick={() => setIsEditingMsg(false)} className="lp-btn lp-btn-cancel" disabled={isSavingMsg}>
                    <X size={16} /> Annuler
                  </button>
                  <button onClick={handleSaveMessage} className="lp-btn lp-btn-save" disabled={isSavingMsg}>
                    {isSavingMsg ? <span className="animate-spin">⚙️</span> : <Check size={16} />} Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div className="lp-message-content">
                {mestreMessage ? (
                  mestreMessage.split('\n').map((line, i) => (
                    <React.Fragment key={i}>{line}<br/></React.Fragment>
                  ))
                ) : (
                  <span className="opacity-50 italic">Cliquez sur l'icône pour ajouter un message pour vos élèves...</span>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="lp-bandeira">
          <svg className="lp-estandarte" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
            <line x1="100" y1="10" x2="100" y2="290" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"/>
            <path d="M 50 60 L 100 20 L 150 60" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="30" y1="60" x2="170" y2="60" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
            <line x1="45" y1="60" x2="45" y2="70" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="100" y1="60" x2="100" y2="70" stroke="#1a1a1a" strokeWidth="1.5"/>
            <line x1="155" y1="60" x2="155" y2="70" stroke="#1a1a1a" strokeWidth="1.5"/>
            <path d="M 40 70 L 160 70 L 175 220 L 25 220 Z" fill="#f4ecd8" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round"/>
            
            <g className="lp-fringes">
              <path d="M 25 220 l 1.5 24.6 l 1.5 -18.6 l 1.5 23.2 l 1.5 -18.5 l 1.5 16.4 l 1.5 -20.5 l 1.5 24.9 l 1.5 -19.5 l 1.5 23.5 l 1.5 -22.8 l 1.5 21.1 l 1.5 -20.3 l 1.5 23.2 l 1.5 -16.2 l 1.5 19.0 l 1.5 -21.6 l 1.5 22.8 l 1.5 -17.1 l 1.5 16.2 l 1.5 -23.0 l 1.5 22.5 l 1.5 -18.3 l 1.5 22.3 l 1.5 -15.6 l 1.5 24.2 l 1.5 -20.2 l 1.5 18.8 l 1.5 -17.4 l 1.5 21.2 l 1.5 -17.8 l 1.5 20.2 l 1.5 -19.3 l 1.5 16.5 l 1.5 -18.5 l 1.5 22.3 l 1.5 -22.9 l 1.5 19.7 l 1.5 -23.2 l 1.5 21.9 l 1.5 -22.8 l 1.5 18.6 l 1.5 -17.2 l 1.5 15.0 l 1.5 -23.8 l 1.5 17.8 l 1.5 -20.2 l 1.5 16.8 l 1.5 -17.7 l 1.5 15.3 l 1.5 -16.5 l 1.5 24.5 l 1.5 -15.4 l 1.5 23.5 l 1.5 -22.8 l 1.5 17.7 l 1.5 -18.0 l 1.5 16.6 l 1.5 -22.0 l 1.5 23.5 l 1.5 -17.6 l 1.5 17.8 l 1.5 -15.7 l 1.5 15.3 l 1.5 -23.2 l 1.5 17.9 l 1.5 -24.3 l 1.5 20.5 l 1.5 -18.2 l 1.5 18.4 l 1.5 -18.9 l 1.5 15.7 l 1.5 -21.4 l 1.5 15.7 l 1.5 -21.2 l 1.5 23.3 l 1.5 -24.0 l 1.5 20.2 l 1.5 -15.8 l 1.5 22.3 l 1.5 -20.2 l 1.5 16.3 l 1.5 -18.5 l 1.5 18.2 l 1.5 -22.3 l 1.5 20.2 l 1.5 -17.5 l 1.5 18.0 l 1.5 -21.0 l 1.5 22.9 l 1.5 -20.2 l 1.5 22.6 l 1.5 -17.1 l 1.5 24.3 l 1.5 -22.9 l 1.5 18.0 l 1.5 -19.0 l 1.5 20.0 l 1.5 -16.0 l 1.5 17.0 l 1.5 -21.0" fill="none" stroke="#1a1a1a" strokeWidth="1.2"/>
            </g>
            
            <text x="100" y={logoUrl ? "98" : "110"} fontFamily="Cactus, sans-serif" fontSize={logoUrl ? "24" : "28"} fontWeight="bold" textAnchor="middle" fill="#1a1a1a">MARACATU</text>
            <text x="100" y={logoUrl ? "115" : "140"} fontFamily="Lora, serif" fontSize={logoUrl ? "10" : "12"} fontWeight="bold" textAnchor="middle" fill="#1a1a1a">DE BAQUE VIRADO</text>
            
            {logoUrl && (
              <image href={logoUrl} x="50" y="125" width="100" height="65" preserveAspectRatio="xMidYMid meet" />
            )}
            
            <text x="100" y={logoUrl ? "208" : "200"} fontFamily="Cactus, sans-serif" fontSize={logoUrl ? "14" : "16"} textAnchor="middle" fill="#1a1a1a">2026-2027</text>
          </svg>
        </div>
      </footer>
    </div>
  );
};
