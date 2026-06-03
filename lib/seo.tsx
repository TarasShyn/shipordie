import { Metadata } from 'next';
import config from '@/config';

const baseUrl = process.env.NODE_ENV === 'development' ? `http://${config.domainName}` : `https://${config.domainName}`;
const ogImage = `${baseUrl}/og-shipordie.png`;

interface SEOInput {
  title?: string;
  description?: string;
  canonicalUrlRelative?: string;
  openGraph?: Metadata['openGraph'];
  extraTags?: Metadata;
}

export const getSEOTags = ({ title, description, canonicalUrlRelative, openGraph, extraTags }: SEOInput = {}): Metadata => {
  const resolvedTitle = title ?? config.seo.title;
  const resolvedDescription = description ?? config.seo.description;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    metadataBase: new URL(baseUrl),
    ...(canonicalUrlRelative && { alternates: { canonical: canonicalUrlRelative } }),
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: baseUrl,
      siteName: config.appName,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'website',
      ...openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      images: [ogImage],
    },
    ...extraTags,
  };
};

export const renderWebSiteSchema = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config.appName,
        url: baseUrl,
      }),
    }}
  />
);
