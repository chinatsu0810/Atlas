import { db, client } from './drizzle';
import { tags } from './schema';

type TagCategory = 'type' | 'family' | 'theme';

type TagSeed = {
  name: string;
  slug: string;
  category: TagCategory;
};

// 経験タイプ（経験から探す）
const typeTags: TagSeed[] = [
  { name: '駐在員', slug: 'chuzai-in', category: 'type' },
  { name: '帯同家族', slug: 'taido-kazoku', category: 'type' },
  { name: '移住者', slug: 'ijusha', category: 'type' },
  { name: '留学生', slug: 'ryugakusei', category: 'type' },
  { name: 'ワーホリ', slug: 'wahori', category: 'type' },
  { name: '現地採用', slug: 'genchi-saiyo', category: 'type' },
  { name: '起業', slug: 'kigyo', category: 'type' },
  { name: 'フリーランス', slug: 'freelance', category: 'type' },
  { name: 'ノマド', slug: 'nomad', category: 'type' },
  { name: '永住者', slug: 'eijusha', category: 'type' },
  { name: '帰国済み', slug: 'kikoku-zumi', category: 'type' },
  { name: 'その他', slug: 'other-type', category: 'type' },
];

// 家族構成（家族構成から探す）
const familyTags: TagSeed[] = [
  { name: '単身', slug: 'tanshin', category: 'family' },
  { name: '夫婦', slug: 'fufu', category: 'family' },
  { name: '未就学児あり', slug: 'mishugakuji-ari', category: 'family' },
  { name: '小学生あり', slug: 'shogakusei-ari', category: 'family' },
  { name: '中高生あり', slug: 'chukosei-ari', category: 'family' },
  { name: '妊娠中', slug: 'ninshin-chu', category: 'family' },
  { name: 'ペットあり', slug: 'pet-ari', category: 'family' },
  { name: 'その他', slug: 'other-family', category: 'family' },
];

// テーマ（質問・経験談のタグ付けで使用）
const themeTags: TagSeed[] = [
  { name: '子育て', slug: 'kosodate', category: 'theme' },
  { name: '教育', slug: 'kyoiku', category: 'theme' },
  { name: '仕事', slug: 'shigoto', category: 'theme' },
  { name: '住まい', slug: 'sumai', category: 'theme' },
  { name: 'ビザ', slug: 'visa', category: 'theme' },
  { name: '医療', slug: 'iryo', category: 'theme' },
  { name: '保険', slug: 'hoken', category: 'theme' },
  { name: 'お金', slug: 'okane', category: 'theme' },
  { name: '税金', slug: 'zeikin', category: 'theme' },
  { name: '銀行', slug: 'ginko', category: 'theme' },
  { name: '通信', slug: 'tsushin', category: 'theme' },
  { name: '交通', slug: 'kotsu', category: 'theme' },
  { name: '治安', slug: 'chian', category: 'theme' },
  { name: '買い物', slug: 'kaimono', category: 'theme' },
  { name: '日本食', slug: 'nihonshoku', category: 'theme' },
  { name: '言語', slug: 'gengo', category: 'theme' },
  { name: '友人作り', slug: 'yujin-zukuri', category: 'theme' },
  { name: '手続き', slug: 'tetsuzuki', category: 'theme' },
  { name: '帰国準備', slug: 'kikoku-junbi', category: 'theme' },
  { name: 'その他', slug: 'other-theme', category: 'theme' },
];

export const allSeedTags: TagSeed[] = [
  ...typeTags,
  ...familyTags,
  ...themeTags,
];

async function seedTags() {
  console.log(`Seeding ${allSeedTags.length} tags...`);

  for (const tag of allSeedTags) {
    await db
      .insert(tags)
      .values(tag)
      .onConflictDoUpdate({
        target: [tags.name, tags.category],
        set: {
          slug: tag.slug,
        },
      });
  }

  console.log('Tags seeded.');
}

seedTags()
  .catch((error) => {
    console.error('Failed to seed tags:', error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
