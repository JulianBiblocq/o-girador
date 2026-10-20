import React from 'react';

export const LandingBookletSequenciador: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
          {isFr ? 'LIVRET 02' : 'FOLHETO 02'}
        </span>
        <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
          {isFr ? 'LE SÉQUENCEUR' : 'O SEQUENCIADOR'}
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
        {isFr ? '« Apprendre et décortiquer le baque »' : '« Aprender e decifrar o baque »'}
      </h2>
      <ul className="space-y-2 text-xs sm:text-sm font-serif text-[#1a1a1a]/85 leading-snug">
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
          <span><strong>{isFr ? 'Le cycle à 360° :' : 'O ciclo em 360° :'}</strong> {isFr ? 'visualiser la tourne continue d’un coup d’œil.' : 'visualizar a levada contínua num relance.'}</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
          <span><strong>{isFr ? 'L’écoute analytique :' : 'A escuta analítica :'}</strong> {isFr ? 'isoler un pupitre en solo, ralentir le tempo.' : 'solar um naipe, desacelerar o andamento.'}</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
          <span><strong>{isFr ? 'L’acoustique authentique :' : 'A acústica autêntica :'}</strong> {isFr ? 'banques de sons enregistrées sur instruments réels.' : 'bancos de sons gravados em instrumentos reais.'}</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-[#8b2a1a] font-bold mt-0.5">✦</span>
          <span><strong>{isFr ? 'Le balanço vivant :' : 'O balanço vivo :'}</strong> {isFr ? 'réglage fin du micro-timing pour retrouver le groove organique.' : 'ajuste fino do micro-timing para resgatar o groove.'}</span>
        </li>
      </ul>
    </div>
    <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
      <span>✦ 360° Loop</span>
      <span>Micro-Timing ✦</span>
    </div>
  </>
);
