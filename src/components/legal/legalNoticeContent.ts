export interface LegalArticle { id: string; num: string; title: string; content: string[]; }
export interface LegalNoticeBundle {
  title: string; subtitle: string; lastUpdate: string; closeBtn: string; articles: LegalArticle[];
}

export const LEGAL_NOTICE_FR: LegalNoticeBundle = {
  title: 'Cadre Légal, CGU & Confidentialité',
  subtitle: 'Écosystème O Girador · Maracatu de Baque Virado',
  lastUpdate: 'Mise à jour : 23 octobre 2026',
  closeBtn: 'Fermer',
  articles: [
    {
      id: 'editeur',
      num: 'Article 1',
      title: 'Éditeur & Hébergement Technique',
      content: [
        'L\'application O Girador (Séquenciad\'Or, Orchestrad\'Or, Organizad\'Or, Dançad\'Or) est conçue et éditée par Julian Biblocq.',
        'L\'hébergement statique, l\'authentification et la base de données temps réel sont assurés par Google Cloud et Firebase (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande).'
      ]
    },
    {
      id: 'propriete-logiciel',
      num: 'Article 2',
      title: 'Propriété Intellectuelle du Logiciel & Banque Sonore (/Mixdown/)',
      content: [
        'Le code source (licence UNLICENSED - Tous droits réservés), l\'architecture de la Roda circulaire 360°, l\'algorithme de micro-timing (Balanço), l\'identité visuelle Cordel et les 143 échantillons acoustiques originaux (/Mixdown/) sont la propriété exclusive de l\'auteur.',
        'Toute extraction automatisée (web scraping), redistribution des échantillons audio, réutilisation commerciale ou utilisation pour l\'entraînement d\'intelligences artificielles est strictement interdite.'
      ]
    },
    {
      id: 'propriete-oeuvres',
      num: 'Article 3',
      title: 'Propriété des Compositions, Toadas & Statut d\'Hébergeur',
      content: [
        'Les Mestres, compositeurs, batuqueiros et nations de Maracatu conservent 100 % de leurs droits d\'auteur sur leurs rythmes, paroles de toadas et voix enregistrées.',
        'O Girador agit comme simple hébergeur technique et carnet de notes musical facilitant l\'étude, la pédagogie et la mémoire collective au sein des groupes autorisés.'
      ]
    },
    {
      id: 'retrait-amiable',
      num: 'Article 4',
      title: 'Procédure Amiable de Paternité & Retrait (« Notice & Take Action »)',
      content: [
        'Tout auteur ou Mestre reconnaissant son œuvre peut à tout moment demander la rectification officielle de son crédit d\'auteur ou son retrait immédiat via le bouton dédié (« C\'est votre texte ? ») ou par contact direct.',
        'Le traitement de la demande de mise à jour ou de retrait s\'effectue sous 48 heures ouvrées sur simple justification.'
      ]
    },
    {
      id: 'comptes-fairuse',
      num: 'Article 5',
      title: 'Comptes, Formules & Rétention des Données (Usage Équitable)',
      content: [
        'L\'accès gratuit permet l\'écoute et l\'entraînement. Les formules payantes et la licence à vie sont assujetties à un usage équitable (Fair Use) du stockage cloud.',
        'En cas d\'interruption d\'abonnement, les données personnelles ne sont pas supprimées : les morceaux restent conservés en lecture seule pendant au moins 12 mois.'
      ]
    },
    {
      id: 'rgpd-lgpd',
      num: 'Article 6',
      title: 'Protection des Données Personnelles (RGPD & LGPD)',
      content: [
        'Seules les données indispensables à l\'authentification (nom, e-mail via Firebase Auth) et à la sauvegarde des presets sont collectées. Aucune donnée n\'est vendue à des tiers.',
        'L\'utilisateur peut exporter ses données ou demander la suppression définitive de son compte à tout moment conformément au RGPD et à la LGPD.'
      ]
    }
  ]
};

export const LEGAL_NOTICE_BR: LegalNoticeBundle = {
  title: 'Marco Legal, Termos de Uso & Privacidade',
  subtitle: 'Ecossistema O Girador · Maracatu de Baque Virado',
  lastUpdate: 'Atualizado em: 23 de outubro de 2026',
  closeBtn: 'Fechar',
  articles: [
    {
      id: 'editor',
      num: 'Artigo 1',
      title: 'Editor & Hospedagem Técnica',
      content: [
        'O aplicativo O Girador (Séquenciad\'Or, Orchestrad\'Or, Organizad\'Or, Dançad\'Or) é concebido e editado por Julian Biblocq.',
        'A hospedagem técnica, o sistema de autenticação e o banco de dados em tempo real são fornecidos pelo Google Cloud / Firebase (Google Ireland Limited).'
      ]
    },
    {
      id: 'propriedade-software',
      num: 'Artigo 2',
      title: 'Propriedade Intelectual do Software & Banco de Sons (/Mixdown/)',
      content: [
        'O código-fonte (licença UNLICENSED - Todos os direitos reservados), a Roda circular 360°, os algoritmos de micro-timing (Balanço), a arte em Xilogravura e as 143 gravações sonoras (/Mixdown/) são propriedade exclusiva do autor.',
        'São proibidos a raspagem de dados (web scraping), o download em lote, a redistribuição dos samples e o uso para treinamento de modelos de inteligência artificial.'
      ]
    },
    {
      id: 'propriedade-toadas',
      num: 'Artigo 3',
      title: 'Propriedade das Músicas, Toadas & Condição de Provedor',
      content: [
        'Os Mestres, compositores, batuqueiros e Nações conservam 100% dos direitos autorais sobre seus ritmos, toadas e gravações de voz.',
        'O Girador opera unicamente como suporte técnico e pedagógico para salvaguarda, memória coletiva e estudo entre batuqueiros autorizados.'
      ]
    },
    {
      id: 'retirada-amigavel',
      num: 'Artigo 4',
      title: 'Procedimento Amigável de Crédito & Retirada (« Notice & Take Action »)',
      content: [
        'Qualquer Mestre ou autor que reconhecer sua toada no catálogo pode requerer a menção correta de autoria ou sua retirada imediata via botão dedicado (« Esta letra é sua? ») ou por mensagem direta.',
        'O atendimento ao pedido ocorre em até 48 horas úteis.'
      ]
    },
    {
      id: 'contas-fairuse',
      num: 'Artigo 5',
      title: 'Contas, Planos & Retenção de Dados (Uso Justo)',
      content: [
        'O acesso livre possibilita audição e treino. Os planos de assinatura e a licença vitalícia requerem uso justo (Fair Use) dos servidores.',
        'Ao expirar o plano, as composições não são apagadas: ficam mantidas em modo somente leitura por no mínimo 12 meses.'
      ]
    },
    {
      id: 'privacidade-lgpd',
      num: 'Artigo 6',
      title: 'Proteção de Dados Pessoais (LGPD & RGPD)',
      content: [
        'Coletam-se somente os dados necessários à identificação (nome, e-mail via Google Auth) e ao armazenamento dos arranjos. Nenhuma informação é vendida a terceiros.',
        'O usuário pode requisitar a exclusão ou portabilidade da sua conta a qualquer instante conforme a LGPD e o RGPD.'
      ]
    }
  ]
};
