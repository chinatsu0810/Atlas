import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.atlas-community.jp',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/search',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/questions',
      lastModified: new Date(),
    },
  ];
}