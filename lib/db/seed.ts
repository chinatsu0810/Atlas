import { seedQuestions } from './seed-data';
import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import {
  users,
  teams,
  teamMembers,
  questions,
  answers,
} from './schema';

async function createStripeProducts() {
  console.log('Checking Stripe products...');

  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });

  // Base
  let baseProduct = products.data.find(
    (product) => product.name === 'Base'
  );

  if (!baseProduct) {
    baseProduct = await stripe.products.create({
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
  }

  // Plus
  let plusProduct = products.data.find(
    (product) => product.name === 'Plus'
  );

  if (!plusProduct) {
    plusProduct = await stripe.products.create({
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
  }

  console.log('Stripe products checked successfully.');
}

async function seed() {
  // 既存ユーザーを1人取得
  const [user] = await db
    .select()
    .from(users)
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  console.log('User found.');

  // チームを作成
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

  console.log('Creating sample questions...');

  // 質問・回答を登録
  for (const item of seedQuestions) {
    const [question] = await db
      .insert(questions)
      .values({
        title: item.title,
        content: item.content,
        country: item.country,
        authorId: user.id,
      })
      .returning();

    for (const answer of item.answers) {
      await db.insert(answers).values({
        questionId: question.id,
        content: answer,
        authorId: user.id,
      });
    }
  }

  console.log('Sample questions created.');

  // Stripe商品を確認
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