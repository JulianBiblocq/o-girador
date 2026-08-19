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
  title = "O Girador Séquenceur | Boîte à rythmes et percussions brésiliennes",
  description = "Créez, écoutez et partagez vos rythmes de percussions brésiliennes (Maracatu, Samba...). Un séquenceur en ligne interactif gratuit.",
  keywords = "séquenceur, boîte à rythmes, maracatu, percussions brésiliennes, baque virado, logiciel musique",
  url = "https://sequenciador.o-girador.com",
  image = "https://sequenciador.o-girador.com/og-image.jpg" // Image générique de couverture
}) => {
  return (
    <Helmet>
      {/* Balises standards */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph (Facebook, LinkedIn, etc.) */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
