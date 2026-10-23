import React from 'react';

export const LandingBookletOral: React.FC<{ isFr: boolean }> = ({ isFr }) => (
  <>
    <div>
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/30 pb-2 mb-3">
        <span className="font-cactus text-xs uppercase font-bold tracking-wider text-[#8b2a1a]">
          {isFr ? 'LIVRET 01' : 'FOLHETO 01'}
        </span>
        <span className="font-cactus text-xs uppercase text-[#1a1a1a]/70">
          {isFr ? 'LA TRADITION ORALE' : 'A TRADIÇÃO ORAL'}
        </span>
      </div>
      <h2 className="font-cactus font-bold text-xl sm:text-2xl text-[#1a1a1a] mb-3 leading-snug">
        {isFr ? '« La mémoire d\'abord »' : '« A memória primeiro »'}
      </h2>
      <p className="font-serif text-xs sm:text-sm text-[#1a1a1a]/85 leading-relaxed">
        {isFr
          ? "Le Maracatu de Baque Virado vit dans la rue, par le chant, l'écoute et la transmission directe des mestres. Cet outil ne remplace ni les répétitions ni l'enseignement oral. Il a été pensé comme un carnet de notes : un support pour poser des repères, documenter les toadas et mémoriser les arrangements de chaque batuque et Nações."
          : "O Maracatu de Baque Virado vive na rua, pelo canto, pela escuta e pela transmissão direta dos mestres. Esta ferramenta não substitui os ensaios nem o ensino oral. Foi pensada como um caderno de notas: um suporte pour fixar referências, documentar as toadas e memorizar os arranjos de cada batuque e Nações."}
      </p>
    </div>
    <div className="pt-4 mt-4 border-t border-[#1a1a1a]/20 flex justify-between items-center text-[10px] font-mono uppercase text-[#1a1a1a]/60">
      <span>Maracatu Vivo</span>
      <span>Nações & Baque </span>
    </div>
  </>
);
