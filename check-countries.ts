import { db } from './lib/db/drizzle';
import { questions } from './lib/db/schema';
import { sql } from 'drizzle-orm';

const run = async () => {
  const r = await db
    .select({
      country: questions.country,
      count: sql<number>`count(*)`,
    })
    .from(questions)
    .groupBy(questions.country)
    .orderBy(questions.country);

  console.log(r);

  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
