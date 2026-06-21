import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleLoginButton } from './GoogleLoginButton';
import * as Tone from 'tone';

interface LandingPageProps {
  onEnter: () => void;
  lang: 'fr' | 'pt';
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, lang }) => {
  const { userProfile, hasAccess } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const isFr = lang === 'fr';

  useEffect(() => {
    const fetchLogo = async () => {
      if (hasAccess('mestre') && userProfile?.groupLogoUrl) {
        setLogoUrl(userProfile.groupLogoUrl);
        return;
      }
      
      if (userProfile?.mestreId) {
        try {
          const mestreDoc = await getDoc(doc(db, 'users', userProfile.mestreId));
          if (mestreDoc.exists()) {
            const mestreData = mestreDoc.data();
            if (mestreData.groupLogoUrl) {
              setLogoUrl(mestreData.groupLogoUrl);
            }
          }
        } catch (error) {
          console.error("Error fetching mestre logo:", error);
        }
      }
    };

    fetchLogo();
  }, [userProfile, hasAccess]);
  const handleEnter = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    onEnter();
  };

  const frText = "Le Maracatu de Baque Virado, puissante percussion brésilienne originaire de Recife (Pernambouc), s'apprend au cœur de la roda par la transmission orale des Nações. Aucune machine ne remplacera l'enseignement des mestres. O Girador a été pensé avec humilité pour s'y ajouter : c'est un carnet de notes sonore gratuit, un séquenceur interactif et une boîte à rythmes en ligne pour créer, expérimenter vos baques et entrevoir les polyrythmies secrètes entre les alfaias, la caixa, le tarol, le gonguê, l'agbê, le mineiro et les toadas, en attendant le prochain enseignement vivant.";
  const ptText = "O Maracatu de Baque Virado, poderosa percussão brasileira originária do Recife (Pernambuco), aprende-se no coração da roda pela transmissão oral das Nações. Nenhuma máquina substituirá os ensinamentos dos mestres. O Girador foi pensado com humildade para se somar a isso: é um caderno sonoro gratuito, um sequenciador interativo e uma bateria eletrônica online para criar, experimentar seus baques e vislumbrar as polirritmias secretas entre as alfaias, a caixa, o tarol, o gonguê, o agbê, o mineiro e as toadas, aguardando o próximo ensinamento vivo.";

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
        <h1 className="sr-only">O Girador - Séquenceur de Maracatu de Baque Virado</h1>
        <div className="lp-title">GIRADOR</div>
      </main>
      
      <footer className="lp-footer">
        <div className="lp-text" id="lp-desc">
          {isFr ? frText : ptText}
        </div>
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
