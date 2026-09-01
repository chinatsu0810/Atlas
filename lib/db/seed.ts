import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800,
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200,
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: 'owner',
    })
    .returning();

  console.log('Initial user created.');

  const [team] = await db
    .insert(teams)
    .values({
      name: 'Test Team',
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });

  const defaultTags = [
  { name: '赴任準備', slug: 'preparation' },
  { name: '駐在生活', slug: 'expat-life' },
  { name: '出向・転勤', slug: 'transfer' },
  { name: '子育て', slug: 'parenting' },
  { name: '学校・教育', slug: 'education' },
  { name: '住まい', slug: 'housing' },
  { name: '仕事', slug: 'work' },
  { name: 'ビザ・手続き', slug: 'visa' },
  { name: 'お金・税金', slug: 'finance' },
  { name: '医療・保険', slug: 'medical' },
  { name: '一時帰国', slug: 'return-japan' },
  { name: '旅行', slug: 'travel' },
  { name: '現地生活', slug: 'local-life' },
  { name: '日本食・買い物', slug: 'shopping' },
  { name: 'その他', slug: 'other' },
];