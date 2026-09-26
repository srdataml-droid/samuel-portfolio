import { pages, site } from '@/data/site';

export default function sitemap() {
  const lastModified = new Date();
  return pages.map(({ href }) => ({
    url: `${site.url}${href === '/' ? '' : href}`,
    lastModified,
    changeFrequency: href === '/' ? 'weekly' : 'monthly',
    priority: href === '/' ? 1 : 0.7,
  }));
}
