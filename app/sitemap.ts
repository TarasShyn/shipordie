import { MetadataRoute } from 'next';
import config from '@/config';
import { NON_INDEXABLE_SEGMENTS } from '@/lib/seo-rules';

// The whole app is two routes: the landing/ship ('') and the embeddable view.
const PUBLIC_ROUTES = ['', 'embed'] as const;

const sitemap = (): MetadataRoute.Sitemap => {
  const baseUrl = process.env.NODE_ENV === 'development' ? `http://${config.domainName}` : `https://${config.domainName}`;

  return PUBLIC_ROUTES.filter((route) => route === '' || !NON_INDEXABLE_SEGMENTS.has(route)).map((route) => ({
    url: `${baseUrl}${route ? `/${route}` : ''}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.5,
  }));
};

export default sitemap;
