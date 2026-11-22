import type { SubscriptionModalReason, VisitorModalReason } from './userAccessPolicy';

export interface VisitorModalCopy {
  title: string;
  contextBanner?: string;
  intro: string;
  benefits: [string, string, string];
  cta: string;
}

export interface SubscriptionModalCopy {
  title: string;
  primaryText: string;
  secondaryText: string;
  ctaLabel: string;
  mailSubject: string;
  footerHint: string;
}

export function getVisitorModalCopy(lang: 'fr' | 'pt', reason: VisitorModalReason = 'default'): VisitorModalCopy {
  const isFr = lang === 'fr';
  const contextBanner =
    reason === 'community_catalog'
      ? (isFr
          ? 'Ce morceau fait partie du répertoire partagé par la communauté O Girador. Il se débloque via votre association ou avec un abonnement.'
          : 'Esta música faz parte do repertório compartilhado pela comunidade O Girador. Ela é liberada pela sua associação ou com uma assinatura.')
      : reason === 'save_cloud'
      ? (isFr
          ? 'Connectez-vous gratuitement pour enregistrer vos essais dans le Cloud.'
          : 'Conecte-se gratuitamente para salvar seus testes na Nuvem.')
      : reason === 'premium_feature'
      ? (isFr
          ? 'Cet outil avancé est ouvert aux membres des associations et aux abonnés.'
          : 'Esta ferramenta avançada é aberta aos membros de associações e assinantes.')
      : undefined;

  return {
    title: isFr ? 'Rejoindre O Girador' : 'Entrar no O Girador',
    contextBanner,
    intro: isFr ? 'Un compte gratuit vous permet de :' : 'Uma conta gratuita permite :',
    benefits: isFr
      ? [
          'Sauvegarder un premier essai sur le Cloud (jusqu’à 2 morceaux privés offerts).',
          'Référencer votre groupe ou votre Nação sur la carte mondiale (Orquestrador).',
          'Découvrir les outils reliés de l’écosystème (Organizador, Cantador, Mostrador).',
        ]
      : [
          'Salvar um primeiro teste na Nuvem (até 2 músicas privadas oferecidas).',
          'Cadastrar seu grupo ou sua Nação no mapa mundial (Orquestrador).',
          'Descobrir as ferramentas conectadas do ecossistema (Organizador, Cantador, Mostrador).',
        ],
    cta: isFr ? 'Se connecter avec Google' : 'Entrar com Google',
  };
}

export function getSubscriptionModalCopy(
  lang: 'fr' | 'pt',
  reason: SubscriptionModalReason = 'measures_limit'
): SubscriptionModalCopy {
  const isFr = lang === 'fr';
  if (reason === 'trial_expired') {
    return {
      title: isFr ? 'Période d’essai terminée' : 'Período de teste encerrado',
      primaryText: isFr
        ? 'Votre période d’essai Mestre est arrivée à son terme. Tous vos morceaux et réglages restent conservés au chaud en sécurité pendant la période de grâce.'
        : 'Seu período de teste Mestre chegou ao fim. Todas as suas músicas e ajustes permanecem guardados com segurança durante o período de carência.',
      secondaryText: isFr
        ? 'Activez votre abonnement Mestre ou Groupe pour retrouver immédiatement l’écriture Cloud et les mesures illimitées.'
        : 'Ative sua assinatura Mestre ou Grupo para recuperar imediatamente a escrita na Nuvem e os compassos ilimitados.',
      ctaLabel: isFr ? 'Activer mon abonnement Mestre' : 'Ativar minha assinatura Mestre',
      mailSubject: isFr ? 'Activation abonnement Mestre O Girador' : 'Ativação assinatura Mestre O Girador',
      footerHint: isFr
        ? 'Vos créations existantes restent accessibles en écoute.'
        : 'Suas criações existentes continuam acessíveis para escuta.',
    };
  }
  if (reason === 'free_cloud_quota') {
    return {
      title: isFr ? 'Quota Découverte Atteint (2/2)' : 'Cota de Descoberta Atingida (2/2)',
      primaryText: isFr
        ? 'Vous avez utilisé vos 2 emplacements de morceaux privés offerts sur le Cloud (la mise à jour de ces 2 morceaux reste libre).'
        : 'Você utilizou seus 2 espaços gratuitos de músicas privadas na Nuvem (a atualização dessas 2 músicas continua livre).',
      secondaryText: isFr
        ? 'Pour enregistrer davantage de morceaux et partager avec votre groupe, activez un abonnement Solo ou Groupe.'
        : 'Para salvar mais músicas e compartilhar com seu grupo, ative uma assinatura Solo ou Grupo.',
      ctaLabel: isFr ? 'Passer en Solo ou Groupe' : 'Ativar plano Solo ou Grupo',
      mailSubject: isFr ? 'Abonnement Solo ou Groupe O Girador' : 'Assinatura Solo ou Grupo O Girador',
      footerHint: isFr ? 'Écrivez-nous pour activer votre formule.' : 'Escreva-nos para ativar seu plano.',
    };
  }
  if (reason === 'community_catalog') {
    return {
      title: isFr ? 'Catalogue Communautaire' : 'Catálogo Comunitário',
      primaryText: isFr
        ? 'Ce morceau fait partie du répertoire partagé par la communauté O Girador.'
        : 'Esta música faz parte do repertório compartilhado pela comunidade O Girador.',
      secondaryText: isFr
        ? 'Il se débloque avec un abonnement Solo / Mestre ou automatiquement via l’adhésion de votre association.'
        : 'Ela é liberada com uma assinatura Solo / Mestre ou automaticamente pela adesão da sua associação.',
      ctaLabel: isFr ? 'Débloquer le répertoire' : 'Liberar o repertório',
      mailSubject: isFr ? 'Accès Catalogue Communautaire O Girador' : 'Acesso Catálogo Comunitário O Girador',
      footerHint: isFr ? 'Les morceaux de la Vitrine Découverte restent en écoute libre.' : 'As músicas da Vitrine de Descoberta continuam em escuta livre.',
    };
  }
  if (reason === 'premium_feature') {
    return {
      title: isFr ? 'Outil Abonné & Association' : 'Ferramenta Assinante & Associação',
      primaryText: isFr
        ? 'L’enregistrement vocal Cloud, les défis élèves Speed Trainer, la Presse PDF des morceaux et les bibliothèques Cloud sont réservés aux abonnés et aux associations.'
        : 'A gravação vocal na Nuvem, os desafios Speed Trainer, a Prensa PDF de músicas e as bibliotecas na Nuvem são reservados aos assinantes e associações.',
      secondaryText: isFr
        ? 'Activez un abonnement Solo ou Groupe pour débloquer l’ensemble de l’atelier.'
        : 'Ative uma assinatura Solo ou Grupo para liberar todo o ateliê.',
      ctaLabel: isFr ? 'Découvrir les formules' : 'Conhecer os planos',
      mailSubject: isFr ? 'Formule Abonnement O Girador' : 'Plano de Assinatura O Girador',
      footerHint: isFr ? 'Les grilles vierges A4 et le studio local restent libres.' : 'As grades em branco A4 e o estúdio local continuam livres.',
    };
  }
  return {
    title: isFr ? 'Plafond de 30 mesures' : 'Limite de 30 compassos',
    primaryText: isFr
      ? 'La création manuelle en version découverte va jusqu’à 30 mesures (l’écoute des morceaux longs reste illimitée).'
      : 'A criação manual na versão descoberta vai até 30 compassos (a escuta de músicas longas continua ilimitada).',
    secondaryText: isFr
      ? 'Pour composer des morceaux complets sans limite de mesures, activez un abonnement Solo ou Mestre.'
      : 'Para compor músicas completas sem limite de compassos, ative uma assinatura Solo ou Mestre.',
    ctaLabel: isFr ? 'Devenir Mestre / Abonné' : 'Tornar-se Mestre / Assinante',
    mailSubject: isFr ? 'Demande abonnement Mestre O Girador' : 'Pedido assinatura Mestre O Girador',
    footerHint: isFr ? 'Contactez-nous pour activer votre espace complet.' : 'Entre em contato para ativar seu espaço completo.',
  };
}
