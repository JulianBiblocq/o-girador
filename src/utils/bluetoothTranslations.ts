/**
 * Traductions bilingues FR / PT-BR pour la synchronisation Bluetooth (< 100 lignes).
 */

export interface BluetoothTexts {
  onboardingTitle: string;
  onboardingDesc: string;
  optSpeaker: string;
  optSpeakerDesc: string;
  optBtSpeaker: string;
  optBtSpeakerDesc: string;
  optBtHeadphones: string;
  optBtHeadphonesDesc: string;
  syncedInstantly: string;
  btnPlayNow: string;
  btnPing3Beeps: string;
  btnFineTuneVisual: string;
  toastListeningPrefix: string;
  toastChangeBtn: string;
  badgeTooltip: string;
  pingTitle: string;
  pingDesc: string;
  pingStarting: string;
  pingBeepCount: (n: number) => string;
  pingMeasuring: string;
  pingSuccess: (ms: number) => string;
  pingFailed: string;
  pingRetry: string;
  visualTitle: string;
  visualDesc: string;
  visualSliderLabel: string;
  btnSaveProfile: string;
  btnCancel: string;
  profileNamePrompt: string;
  defaultProfileSpeaker: string;
  defaultProfileBtSpeaker: string;
  defaultProfileBtHeadphones: string;
  newDevice: string;
  renameDevice: string;
  quickAdjustTitle: string;
}

export const btTranslations: Record<'fr' | 'pt', BluetoothTexts> = {
  fr: {
    onboardingTitle: 'Avec quoi écoutez-vous la Roda aujourd\'hui ?',
    onboardingDesc: 'Sans fil (Bluetooth), le son met un court instant à voyager jusqu\'à votre enceinte ou votre casque. Choisissez votre écoute pour que les baguettes frappent à l\'écran pile en même temps que le son !',
    optSpeaker: 'Téléphone ou Câble',
    optSpeakerDesc: 'Haut-parleur de l\'appareil ou prise casque (0 ms).',
    optBtSpeaker: 'Enceinte Bluetooth',
    optBtSpeakerDesc: 'Bluetooth extérieur ou d\'ambiance (~240 ms).',
    optBtHeadphones: 'Casque Bluetooth',
    optBtHeadphonesDesc: 'Écouteurs ou casque Bluetooth (~180 ms).',
    syncedInstantly: 'C\'est déjà calé !',
    btnPlayNow: 'Jouer tout de suite',
    btnPing3Beeps: 'Caler par 3 bips (2 s)',
    btnFineTuneVisual: 'Affiner avec Bip & Flash',
    toastListeningPrefix: 'Écoute active',
    toastChangeBtn: 'Ajuster',
    badgeTooltip: 'Calage image / son Bluetooth',
    pingTitle: 'Calage automatique par 3 bips',
    pingDesc: 'Approchez votre téléphone de l\'enceinte. Trois bips brefs vont retentir pour mesurer le délai exact.',
    pingStarting: 'Préparation du micro...',
    pingBeepCount: (n) => `Bip ${n} sur 3...`,
    pingMeasuring: 'Calcul du décalage...',
    pingSuccess: (ms) => `Parfait ! Son et image synchronisés à ${ms} ms.`,
    pingFailed: 'Écoute non captée. Vérifiez le volume ou réessayez.',
    pingRetry: 'Réessayer',
    visualTitle: 'Calage visuel Bip & Flash',
    visualDesc: 'Ajustez le curseur jusqu\'à ce que le flash blanc et le bip sonore frappent ensemble.',
    visualSliderLabel: 'Décalage visuel',
    btnSaveProfile: 'Enregistrer ce réglage',
    btnCancel: 'Fermer',
    profileNamePrompt: 'Nom de votre appareil (ex: JBL maison)',
    defaultProfileSpeaker: 'Téléphone',
    defaultProfileBtSpeaker: 'Enceinte Bluetooth',
    defaultProfileBtHeadphones: 'Casque Bluetooth',
    newDevice: 'Nouvel appareil',
    renameDevice: 'Nom de l\'appareil',
    quickAdjustTitle: 'Calage fin de l\'écoute',
  },
  pt: {
    onboardingTitle: 'Onde você está ouvindo a Roda hoje?',
    onboardingDesc: 'Sem fio (Bluetooth), o som leva um instante para chegar à caixa ou fone. Escolha seu aparelho para que as baquetas toquem na tela junto com o som!',
    optSpeaker: 'Celular ou Cabo',
    optSpeakerDesc: 'Alto-falante do aparelho ou cabo P2/USB (0 ms).',
    optBtSpeaker: 'Caixa Bluetooth',
    optBtSpeakerDesc: 'Caixa Bluetooth portátil ou de estúdio (~240 ms).',
    optBtHeadphones: 'Fone Bluetooth',
    optBtHeadphonesDesc: 'Fones de ouvido Bluetooth (~180 ms).',
    syncedInstantly: 'Já está sincronizado!',
    btnPlayNow: 'Tocar agora',
    btnPing3Beeps: 'Ajustar com 3 bips (2 s)',
    btnFineTuneVisual: 'Ajustar com Bip & Flash',
    toastListeningPrefix: 'Escuta ativa',
    toastChangeBtn: 'Ajustar',
    badgeTooltip: 'Sincronização de som e imagem Bluetooth',
    pingTitle: 'Ajuste automático com 3 bips',
    pingDesc: 'Aproxime o aparelho da caixa. Três bips rápidos vão soar para medir o atraso exato.',
    pingStarting: 'Iniciando microfone...',
    pingBeepCount: (n) => `Bip ${n} de 3...`,
    pingMeasuring: 'Calculando atraso...',
    pingSuccess: (ms) => `Perfeito! Som e tela sincronizados em ${ms} ms.`,
    pingFailed: 'Som não detectado. Aumente o volume ou tente novamente.',
    pingRetry: 'Tentar de novo',
    visualTitle: 'Ajuste visual Bip & Flash',
    visualDesc: 'Deslize o controle até que a luz branca pisque exatamente junto com o som do bip.',
    visualSliderLabel: 'Atraso visual',
    btnSaveProfile: 'Salvar este ajuste',
    btnCancel: 'Fechar',
    profileNamePrompt: 'Nome do seu aparelho (ex: JBL casa)',
    defaultProfileSpeaker: 'Celular',
    defaultProfileBtSpeaker: 'Caixa Bluetooth',
    defaultProfileBtHeadphones: 'Fone Bluetooth',
    newDevice: 'Novo aparelho',
    renameDevice: 'Nome do aparelho',
    quickAdjustTitle: 'Ajuste fino da escuta',
  },
};
