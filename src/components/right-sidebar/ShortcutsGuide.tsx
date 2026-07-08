import React from 'react';
import DOMPurify from 'dompurify';
import { Language } from '../../types';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';

interface ShortcutsGuideProps {
  lang: Language;
  t: (key: string) => string;
}

export const ShortcutsGuide: React.FC<ShortcutsGuideProps> = ({ lang, t }) => {
  return (
    <div className="flex flex-col gap-1.5 pr-1 flex-grow overflow-y-auto custom-scrollbar min-h-0">
      
      {/* Shortcuts & Gestures */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            ⌨️ {lang === 'fr' ? 'Raccourcis & Gestes' : 'Atalhos e Gestos'}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed">
          {lang === 'fr' ? (
            <>
              <p>• <b>Double-clic</b> (ou appui long) sur un temps pour y insérer une frappe forte.</p>
              <p>• <b>Clic simple</b> pour insérer une frappe faible.</p>
              <p>• <b>Molette souris</b> (ou glisser haut/bas) sur une cellule pour changer la frappe/nuance.</p>
              <p>• <b>Ctrl + Clic</b> (ou appui long) sur l'entête d'une ligne pour couper le son (mute) de l'instrument.</p>
            </>
          ) : (
            <>
              <p>• <b>Duplo clique</b> (ou toque longo) em um tempo para inserir uma batida forte.</p>
              <p>• <b>Clique simples</b> para inserir uma batida fraca.</p>
              <p>• <b>Roda do mouse</b> (ou deslizar para cima/baixo) em uma célula para mudar a batida/nuance.</p>
              <p>• <b>Ctrl + Clique</b> (ou toque longo) no cabeçalho de uma linha para silenciar (mute) o instrumento.</p>
            </>
          )}
        </div>
      </details>

      {/* Export WAV */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {t('wavExportTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('wavExportDesc')) }} />
        </div>
      </details>

      {/* Offline Mode */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {t('pwaOfflineTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwaOfflineDesc')) }} />
        </div>
      </details>

      {/* Vocals */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/micro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            {t('voiceLegendTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-xs text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend1')) }} />
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend2')) }} />
        </div>
      </details>

      {/* Alfaia */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/alfaia.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            Alfaia
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">D / d</span>
            <span>{t('mainDroite')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">E / e</span>
            <span>{t('mainGauche')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#8c7b7b] text-[#f4ecd8]">X / x</span>
            <span>{t('legendAlfaiaCerclage')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#ff8da1] text-[#1a1a1a]">I / i</span>
            <span>{t('legendAlfaiaIguarassu')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a89f91] text-[#1a1a1a]">C / c</span>
            <span>{t('legendTarolClick')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4c1c1c] text-[#f4ecd8]">B / b</span>
            <span>{t('legendAlfaiaBarulho')}</span>
          </div>
        </div>
      </details>

      {/* Caixa & Tarol */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/caixa.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            Caixa & Tarol
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">D / d</span>
            <span>{t('mainDroite')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">E / e</span>
            <span>{t('mainGauche')}</span>
          </div>
          <div className="w-full h-px bg-[var(--cordel-border)]/10 my-1"></div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a855f7] text-[#f4ecd8]">R</span>
            <span>{t('legendCaixaRufadaD')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d8b4fe] text-[#1a1a1a]">r</span>
            <span>{t('legendCaixaRufadaG')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d946ef] text-[#f4ecd8]">F / f</span>
            <span>{t('legendCaixaFla')} {lang === 'fr' ? '(Caixa : F / f, Tarol : F / f en bleu)' : '(Caixa: F / f, Tarol: F / f em azul)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7e7b8c] text-[#f4ecd8]">X / x</span>
            <span>{t('legendCaixaCerclage')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a89f91] text-[#1a1a1a]">C / c</span>
            <span>{t('legendTarolClick')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#4a044e] text-[#f4ecd8]">B / b</span>
            <span>{lang === 'fr' ? 'Barulho / Tremblement (Caixa : Violet foncé, Tarol : Bleu)' : 'Barulho / Tremor (Caixa: Violeta escuro, Tarol: Azul)'}</span>
          </div>
        </div>
      </details>

      {/* Timbal */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/timbal.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            Timbal
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#92400e] text-[#f4ecd8]">G / g</span>
            <span>{lang === 'fr' ? 'Basse (baixo) - Main forte / faible' : 'Baixo - Mão forte / fraca'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#d97706] text-[#f4ecd8]">A / a</span>
            <span>{lang === 'fr' ? 'Ouvert (aberto) - Main forte / faible' : 'Aberto - Mão forte / fraca'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#fbbf24] text-[#1a1a1a]">S / s</span>
            <span>{lang === 'fr' ? 'Claqué (slap) - Main forte / faible' : 'Slap - Mão forte / fraca'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7e7b8c] text-[#f4ecd8]">D / d</span>
            <span>{lang === 'fr' ? 'Fantôme (dedilhado) - Main forte / faible' : 'Dedilhado - Mão forte / fraca'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#5c2205] text-[#f4ecd8]">P / p</span>
            <span>{lang === 'fr' ? 'Fermé (preso) - Main forte / faible' : 'Abafado / Preso - Mão forte / fraca'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#ea580c] text-[#f4ecd8]">F / f</span>
            <span>{lang === 'fr' ? 'Fla ouvert (aberto)' : 'Fla aberto'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#f97316] text-[#f4ecd8]">V / v</span>
            <span>{lang === 'fr' ? 'Fla claqué (slap)' : 'Fla slap'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a89f91] text-[#1a1a1a]">C / c</span>
            <span>{lang === 'fr' ? 'Clap (mains) - Deux mains l\'une contre l\'autre' : 'Clap (mãos) - Duas mãos uma contra a outra'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#291002] text-[#f4ecd8]">B / b</span>
            <span>{lang === 'fr' ? 'Tremblement (Barulho)' : 'Tremor (Barulho)'}</span>
          </div>
        </div>
      </details>

      {/* Gongue */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/gongue.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            {t('gongueLegend')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">G / g</span>
            <span>{t('gongueGrave')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">A / a</span>
            <span>{t('gongueAigu')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#7f8c8d] text-[#f4ecd8]">X / x</span>
            <span>{t('legendGongueBord')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#6d4c41] text-[#f4ecd8]">B / b</span>
            <span>{t('gongueBarulho')}</span>
          </div>
        </div>
      </details>

      {/* Agbe */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/agbe.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            {t('agbeLegend')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">E / e</span>
            <span>{t('agbeG')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">D / d</span>
            <span>{t('agbeD')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#dcfce7] text-[#1a1a1a]">S / s</span>
            <span>{t('legendAgbeSaut')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#a7f3d0] text-[#1a1a1a]">V / v</span>
            <span>{t('legendAgbeVolta')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#052e16] text-[#f4ecd8]">B / b</span>
            <span>{t('legendAgbeBarulho')}</span>
          </div>
        </div>
      </details>

      {/* Mineiro */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/mineiro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            {t('mineiroLegend')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)]">P / p</span>
            <span>{t('mineiroP')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-transparent border-[2px] border-[var(--cordel-border)] text-[var(--cordel-text)]">T / t</span>
            <span>{t('mineiroT')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#f59e0b] text-[#1a1a1a]">L / l</span>
            <span>{t('mineiroL')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#78350f] text-[#f4ecd8]">B / b</span>
            <span>{t('mineiroB')}</span>
          </div>
        </div>
      </details>

      {/* Apito */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            <img src="icones/apito.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
            {t('apitoLegend')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#eab308] text-[#1a1a1a]">W</span>
            <span>{t('apitoLong')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-[18px] text-[9px] font-bold bg-[#fef08a] text-[#1a1a1a]">w</span>
            <span>{t('apitoShort')}</span>
          </div>
        </div>
      </details>

      {/* Contact & Feedback */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {t('feedbackTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-3 border-t border-[var(--cordel-border)]/20 text-center">
          <p className="text-[10px] text-[var(--cordel-text)] leading-relaxed mb-2">
            {lang === 'fr' 
              ? "Une idée, un bug ou un retour ? Venez en discuter sur le forum !" 
              : "Uma ideia, um bug ou feedback? Venha conversar no fórum!"}
          </p>
          <button
            onClick={() => window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank')}
            className="bg-[#27ae60] text-[#1a1a1a] hover:opacity-90 px-3 py-1 text-xs font-bold cordel-border-sm cursor-pointer mx-auto flex items-center gap-1"
          >
            <span>💬</span>
            <span>{t('feedbackBtn')}</span>
          </button>
        </div>
      </details>

    </div>
  );
};
