import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title = "Sequenciador — L'atelier circulaire du Maracatu de Baque Virado",
  description = "Écoutez la tourne à 360°, isolez votre instrument, ralentissez le tempo et composez vos baques gratuitement jusqu'à 30 mesures en ligne.",
  keywords = 'maracatu, baque virado, sequenciador, roda 360, batuque, alfaia, caixa, tarol, gonguê, agbê, mineiro, timbal, toadas, balanço, o-girador',
  url = 'https://sequenciador.o-girador.com/',
  image = 'https://sequenciador.o-girador.com/og-image.jpg',
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
