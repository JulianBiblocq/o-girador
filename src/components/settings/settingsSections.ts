export interface SettingsSectionItem {
  id: string;
  title: string;
}

export function getSettingsSections(lang: string, isDesktop: boolean): SettingsSectionItem[] {
  return [
    { id: 'groove', title: lang === 'pt' ? 'Balanço, Kit & Metrônomo' : 'Balanço, Kit & Métronome' },
    { id: 'gabarits', title: lang === 'pt' ? '📜 Meus Modelos de Batuque' : '📜 Mes Gabarits de Batuque' },
    ...(isDesktop ? [{ id: 'desktopLayouts', title: lang === 'pt' ? '🖥️ Espaços de Trabalho' : '🖥️ Espaces de Travail' }] : []),
    { id: 'midi', title: lang === 'pt' ? '🎹 Controladores MIDI' : '🎹 Contrôleurs MIDI' },
    { id: 'sinais', title: lang === 'pt' ? '📢 Sinais do Mestre' : '📢 Signaux du Maître' },
    { id: 'prensa', title: lang === 'pt' ? '🖨️ A Prensa (Partitura)' : '🖨️ La Presse (Partition)' },
    { id: 'performance', title: lang === 'pt' ? '⚡ Desempenho & Modo Eco' : '⚡ Performances & Mode Éco' },
    { id: 'audio', title: lang === 'pt' ? '🎧 Áudio' : '🎧 Audio' },
    { id: 'ajuda', title: lang === 'pt' ? '📖 Ajuda & Atalhos' : '📖 Aide & Raccourcis' },
  ];
}
