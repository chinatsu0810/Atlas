import { db } from './drizzle';
import { questions, answers } from './schema';
import { eq } from 'drizzle-orm';

async function clearSeed() {
  const targets = [
    '観光で入国するとき、ビザはいつ確認しましたか？',
    '帯同配偶者のみなさん、平日は何をしていますか？',
  ];

  const targetQuestions = await db
    .select()
    .from(questions);

  for (const question of targetQuestions) {
    if (targets.includes(question.title)) {
      await db
        .delete(answers)
        .where(eq(answers.questionId, question.id));

      await db
        .delete(questions)
        .where(eq(questions.id, question.id));
    }
  }

  console.log('Sample questions deleted.');
}

clearSeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });