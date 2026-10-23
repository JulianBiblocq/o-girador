import React from 'react';

export const LandingBookletOrganizador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
          {isFr ? 'LIVRET 03' : 'FOLHETO 03'}
        </span>
        <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
          ORGANIZADOR & DANÇADOR
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
        {isFr ? '« De la partition à la répétition »' : '« Da partitura ao ensaio »'}
      </h2>
      <ul className="space-y-2 text-xs sm:text-sm font-serif text-[#1a1a1a]/85 leading-snug">
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5"></span>
          <span><strong>{isFr ? 'Passerelle pédagogique :' : 'Ponte pedagógica :'}</strong> {isFr ? 'exploitation directe des morceaux créés dans Organizador.' : 'integração direta das músicas criadas no Organizador.'}</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5"></span>
          <span><strong>{isFr ? 'Le geste et le pas :' : 'O gesto e o passo :'}</strong> {isFr ? 'synchronisation des mouvements de danse de Dançador.' : 'sincronização dos movimentos de dança do Dançador.'}</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5"></span>
          <span><strong>{isFr ? 'Gestion collective :' : 'Gestão coletiva :'}</strong> {isFr ? 'organisation du répertoire interne et des répétitions.' : 'organização do repertório interno e dos ensaios.'}</span>
        </li>
      </ul>
    </div>
    <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
      <span>Pédagogie</span>
      <span>Corps & Pas </span>
    </div>
  </>
);
