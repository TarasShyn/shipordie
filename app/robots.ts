import { MetadataRoute } from 'next';
import config from '@/config';
import { NON_INDEXABLE_PATHS } from '@/lib/seo-rules';

const robots = (): MetadataRoute.Robots => {
  const baseUrl = process.env.NODE_ENV === 'development' ? `http://${config.domainName}` : `https://${config.domainName}`;

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', ...NON_INDEXABLE_PATHS] },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
};

export default robots;
