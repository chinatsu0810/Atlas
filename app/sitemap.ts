import type { MetadataRoute } from 'next';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { experiences, gatherEvents, giveaways, questions } from '@/lib/db/schema';
import { SITE_URL } from '@/lib/constants/site';
import { PLACES, THEMES, countryNamesOf, regionsOf } from '@/lib/places/data';
import { countByTheme, inRegion, loadPlaceData } from '@/lib/places/queries';

export const dynamic = 'force-dynamic';

// 載せるのは、各ページの canonical と同じURLだけ。
// リダイレクトするURL・noindex のページ・ログインが要る画面は載せない
const STATIC_PATHS = [
  '/',
  '/questions',
  '/experiences',
  '/search',
  '/places',
  '/giveaways',
  '/giveaways/guide',
  '/gather',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

function url(path: string) {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
}

// 国・地域・テーマのページ。
// 地域を分けていない国の /places/国 は /places/国/all へリダイレクトするので載せない。
// 国は、投稿（経験談・質問・譲る・イベント）が1件以上ある国だけ。
// テーマのページは、投稿が1件以上あるものだけ（空のページは中身が薄いため）
async function postedCountries(): Promise<Set<string>> {
  const rows = await Promise.all([
    db.selectDistinct({ country: experiences.country }).from(experiences).where(isNull(experiences.deletedAt)),
    db.selectDistinct({ country: questions.country }).from(questions).where(isNull(questions.deletedAt)),
    db.selectDistinct({ country: giveaways.country }).from(giveaways).where(isNull(giveaways.deletedAt)),
    db
      .selectDistinct({ country: gatherEvents.country })
      .from(gatherEvents)
      .where(and(isNotNull(gatherEvents.publishedAt), isNull(gatherEvents.deletedAt))),
  ]);
  return new Set(rows.flat().map((row) => row.country));
}

async function placeEntries(): Promise<MetadataRoute.Sitemap> {
  const posted = await postedCountries();
  const places = PLACES.filter((place) => countryNamesOf(place).some((name) => posted.has(name)));

  const perPlace = await Promise.all(
    places.map(async (place) => {
      const data = await loadPlaceData(place);
      const paths: string[] = [];

      if (place.regions.length > 0) paths.push(`/places/${place.slug}`);

      for (const region of regionsOf(place)) {
        const base = `/places/${place.slug}/${region.slug}`;
        paths.push(base);

        const counts = countByTheme(inRegion(data, region).posts);
        for (const theme of THEMES) {
          if (counts[theme.key] > 0) paths.push(`${base}/${theme.key}`);
        }
      }

      return paths.map((path) => ({ url: url(path) }));
    })
  );

  return perPlace.flat();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allQuestions, allExperiences, openGiveaways, publishedEvents, places] =
    await Promise.all([
      db
        .select({ id: questions.id, updatedAt: questions.updatedAt })
        .from(questions)
        .where(isNull(questions.deletedAt)),
      db
        .select({ id: experiences.id, updatedAt: experiences.updatedAt })
        .from(experiences)
        .where(isNull(experiences.deletedAt)),
      // 受け渡しが終わった「譲る」は、探している人の役に立たないので載せない
      db
        .select({ id: giveaways.id, updatedAt: giveaways.updatedAt })
        .from(giveaways)
        .where(and(eq(giveaways.status, 'open'), isNull(giveaways.deletedAt))),
      // 下書き（公開前）のイベントはページが見えないので載せない
      db
        .select({ id: gatherEvents.id, updatedAt: gatherEvents.updatedAt })
        .from(gatherEvents)
        .where(and(isNotNull(gatherEvents.publishedAt), isNull(gatherEvents.deletedAt))),
      placeEntries(),
    ]);

  return [
    ...STATIC_PATHS.map((path) => ({ url: url(path) })),
    ...places,
    ...allQuestions.map((question) => ({
      url: url(`/questions/${question.id}`),
      lastModified: question.updatedAt,
    })),
    ...allExperiences.map((experience) => ({
      url: url(`/experiences/${experience.id}`),
      lastModified: experience.updatedAt,
    })),
    ...openGiveaways.map((giveaway) => ({
      url: url(`/giveaways/${giveaway.id}`),
      lastModified: giveaway.updatedAt,
    })),
    ...publishedEvents.map((event) => ({
      url: url(`/gather/${event.id}`),
      lastModified: event.updatedAt,
    })),
  ];
}
