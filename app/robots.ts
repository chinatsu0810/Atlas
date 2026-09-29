import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants/site';

// 公開ページはすべてクロールしてよい。
// ログインが要る画面・運営用の画面・試作だけを外す。
// ログイン画面や投稿フォームは、ここで塞がずに noindex で検索結果から外す（塞ぐと noindex が読まれないため）
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account', '/dashboard', '/office', '/ai/', '/mock/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
