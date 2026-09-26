'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import { and, eq, gte, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';

import {
  UNEXPECTED_ERROR_MESSAGE,
  type ActionResult,
} from '@/lib/action-result';
import { isAdmin } from '@/lib/auth/permissions';
import { countries } from '@/lib/constants/countries';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import {
  giveawayImages,
  giveawayMessages,
  giveawayReports,
  giveawayThreads,
  giveaways,
} from '@/lib/db/schema';
import type { Tx } from '@/lib/account/delete-user';
import {
  CURRENCIES,
  DAILY_POST_LIMIT,
  DEFAULT_FREE_CURRENCY,
  GIVEAWAY_CATEGORIES,
  LISTING_DAYS,
  MAX_AVAILABLE_DAYS,
  MAX_CURRENCY_LENGTH,
  MAX_IMAGES,
  OTHER_CURRENCY,
} from '@/lib/giveaways/constants';
import {
  MESSAGE_EMAIL_INTERVAL_MS,
  notifyAdminOfReport,
  notifyUser,
  notifyUsers,
} from '@/lib/giveaways/notifications';
import {
  findProhibitedWord,
  prohibitedMessage,
} from '@/lib/giveaways/prohibited-items';
import {
  canPostToThread,
  getThreadForViewer,
} from '@/lib/giveaways/queries';

// 「譲る」の操作。状態の遷移は schema.ts の giveaways のコメントを参照。
// 同時に操作されても状態が壊れないよう、状態の更新は「今の状態」を条件にした UPDATE で行う。

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2000;

function fail<T>(error: string): ActionResult<T> {
  return { ok: false, error };
}

const LOGIN_REQUIRED = 'ログインしてください。';

/**
 * 募集の期限。受け渡し可能期限があれば、その日の終わり（UTC）まで。
 * なければ base から30日。
 */
function listingExpiresAt(availableUntil: string | null, base: Date): Date {
  if (availableUntil) {
    return new Date(`${availableUntil}T23:59:59Z`);
  }
  return new Date(base.getTime() + LISTING_DAYS * DAY_MS);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ------------------------------------------------------------
// 投稿の作成・編集
// ------------------------------------------------------------

type GiveawayInput = {
  title: string;
  description: string;
  category: string;
  country: string;
  city: string;
  area: string | null;
  priceAmount: number | null;
  currency: string | null;
  availableUntil: string | null;
  imageUrls: string[];
};

// Vercel Blob にアップロードされた、この機能の画像か
function isGiveawayImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.public.blob.vercel-storage.com') &&
      url.pathname.startsWith('/giveaways/')
    );
  } catch {
    return false;
  }
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

function parseGiveawayForm(
  formData: FormData
): { ok: true; data: GiveawayInput } | { ok: false; error: string } {
  const title = text(formData, 'title');
  const description = text(formData, 'description');
  const category = text(formData, 'category');
  const countryChoice = text(formData, 'country');
  const countryFreeText = text(formData, 'countryFreeText');
  const city = text(formData, 'city');
  const area = text(formData, 'area');
  const priceType = text(formData, 'priceType');
  const priceAmountText = text(formData, 'priceAmount');
  const currency = text(formData, 'currency');
  const currencyFreeText = text(formData, 'currencyFreeText');
  const availableUntil = text(formData, 'availableUntil');

  if (!title || title.length > 100) {
    return { ok: false, error: 'タイトルは1〜100文字で入力してください。' };
  }

  if (!description || description.length > 5000) {
    return { ok: false, error: '説明は1〜5000文字で入力してください。' };
  }

  if (!GIVEAWAY_CATEGORIES.some((c) => c.value === category)) {
    return { ok: false, error: 'カテゴリを選んでください。' };
  }

  if (!(countries as readonly string[]).includes(countryChoice)) {
    return { ok: false, error: '国・地域を選んでください。' };
  }

  const country =
    countryChoice === 'その他' ? countryFreeText.slice(0, 100) : countryChoice;

  if (!country) {
    return { ok: false, error: '国名・地域名を入力してください。' };
  }

  if (!city || city.length > 100) {
    return { ok: false, error: '都市を入力してください。' };
  }

  if (area.length > 100) {
    return { ok: false, error: '受け渡しエリアは100文字以内で入力してください。' };
  }

  let priceAmount: number | null = null;
  let priceCurrency: string | null = null;

  if (priceType === 'paid') {
    priceAmount = Number(priceAmountText);

    if (
      !Number.isInteger(priceAmount) ||
      priceAmount < 1 ||
      priceAmount > 100_000_000
    ) {
      return { ok: false, error: '金額は1以上の整数で入力してください。' };
    }

    if (currency === OTHER_CURRENCY) {
      if (currencyFreeText.length > MAX_CURRENCY_LENGTH) {
        return {
          ok: false,
          error: `通貨は${MAX_CURRENCY_LENGTH}文字以内で入力してください。`,
        };
      }
      priceCurrency = currencyFreeText || DEFAULT_FREE_CURRENCY;
    } else if ((CURRENCIES as readonly string[]).includes(currency)) {
      priceCurrency = currency;
    } else {
      return { ok: false, error: '通貨を選んでください。' };
    }
  } else if (priceType !== 'free') {
    return { ok: false, error: '価格（無料／有料）を選んでください。' };
  }

  if (availableUntil) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(availableUntil) ||
      Number.isNaN(new Date(`${availableUntil}T00:00:00Z`).getTime())
    ) {
      return { ok: false, error: '受け渡し可能期限の日付が正しくありません。' };
    }

    // 世界各地から投稿されるので、今日の判定は1日の余裕を持たせる
    if (availableUntil < isoDate(new Date(Date.now() - DAY_MS))) {
      return { ok: false, error: '受け渡し可能期限は、今日以降の日付にしてください。' };
    }

    if (availableUntil > isoDate(new Date(Date.now() + MAX_AVAILABLE_DAYS * DAY_MS))) {
      return { ok: false, error: '受け渡し可能期限は、1年以内の日付にしてください。' };
    }
  }

  let imageUrls: unknown;
  try {
    imageUrls = JSON.parse(text(formData, 'imageUrls') || '[]');
  } catch {
    imageUrls = null;
  }

  if (
    !Array.isArray(imageUrls) ||
    !imageUrls.every(isGiveawayImageUrl) ||
    new Set(imageUrls).size !== imageUrls.length
  ) {
    return { ok: false, error: '写真を読み込めませんでした。もう一度追加してください。' };
  }

  if (imageUrls.length < 1 || imageUrls.length > MAX_IMAGES) {
    return { ok: false, error: `写真は1〜${MAX_IMAGES}枚追加してください。` };
  }

  const prohibited = findProhibitedWord(title, description);
  if (prohibited) {
    return { ok: false, error: prohibitedMessage(prohibited) };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      category,
      country,
      city,
      area: area || null,
      priceAmount,
      currency: priceCurrency,
      availableUntil: availableUntil || null,
      imageUrls,
    },
  };
}

export async function createGiveaway(
  formData: FormData
): Promise<ActionResult<{ id: number }>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  const parsed = parseGiveawayForm(formData);
  if (!parsed.ok) return fail(parsed.error);

  const input = parsed.data;

  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(giveaways)
      .where(
        and(
          eq(giveaways.authorId, user.id),
          gte(giveaways.createdAt, new Date(Date.now() - DAY_MS))
        )
      );

    if (count >= DAILY_POST_LIMIT) {
      return fail(
        `投稿は1日${DAILY_POST_LIMIT}件までです。時間をおいてから投稿してください。`
      );
    }

    const id = await db.transaction(async (tx) => {
      const [giveaway] = await tx
        .insert(giveaways)
        .values({
          authorId: user.id,
          title: input.title,
          description: input.description,
          category: input.category,
          country: input.country,
          city: input.city,
          area: input.area,
          priceAmount: input.priceAmount,
          currency: input.currency,
          availableUntil: input.availableUntil,
          expiresAt: listingExpiresAt(input.availableUntil, new Date()),
        })
        .returning({ id: giveaways.id });

      await tx.insert(giveawayImages).values(
        input.imageUrls.map((url, position) => ({
          giveawayId: giveaway.id,
          url,
          position,
        }))
      );

      return giveaway.id;
    });

    revalidatePath('/giveaways');
    return { ok: true, data: { id } };
  } catch (error) {
    console.error('Failed to create giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

export async function updateGiveaway(
  giveawayId: number,
  formData: FormData
): Promise<ActionResult<{ id: number }>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  const parsed = parseGiveawayForm(formData);
  if (!parsed.ok) return fail(parsed.error);

  const input = parsed.data;

  try {
    const removedUrls = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          availableUntil: giveaways.availableUntil,
          expiresAt: giveaways.expiresAt,
        })
        .from(giveaways)
        .where(eq(giveaways.id, giveawayId))
        .limit(1);

      if (!current) return null;

      // 受け渡し可能期限を書いたら、その日まで。
      // 消した場合は今日から30日。もともと書いていなかった場合は、今の期限のまま
      const expiresAt = input.availableUntil
        ? listingExpiresAt(input.availableUntil, new Date())
        : current.availableUntil
          ? listingExpiresAt(null, new Date())
          : current.expiresAt;

      const [updated] = await tx
        .update(giveaways)
        .set({
          expiresAt,
          title: input.title,
          description: input.description,
          category: input.category,
          country: input.country,
          city: input.city,
          area: input.area,
          priceAmount: input.priceAmount,
          currency: input.currency,
          availableUntil: input.availableUntil,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(giveaways.id, giveawayId),
            eq(giveaways.authorId, user.id),
            eq(giveaways.status, 'open'),
            isNull(giveaways.deletedAt)
          )
        )
        .returning({ id: giveaways.id });

      if (!updated) return null;

      const currentImages = await tx
        .select({ url: giveawayImages.url })
        .from(giveawayImages)
        .where(eq(giveawayImages.giveawayId, giveawayId));

      await tx
        .delete(giveawayImages)
        .where(eq(giveawayImages.giveawayId, giveawayId));

      await tx.insert(giveawayImages).values(
        input.imageUrls.map((url, position) => ({ giveawayId, url, position }))
      );

      return currentImages
        .map((row) => row.url)
        .filter((url) => !input.imageUrls.includes(url));
    });

    if (removedUrls === null) {
      return fail('編集できるのは、募集中の自分の投稿だけです。');
    }

    if (removedUrls.length > 0) {
      after(() =>
        del(removedUrls).catch((error) =>
          console.error('Failed to delete giveaway images:', error)
        )
      );
    }

    revalidatePath('/giveaways');
    revalidatePath(`/giveaways/${giveawayId}`);
    return { ok: true, data: { id: giveawayId } };
  } catch (error) {
    console.error('Failed to update giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

// ------------------------------------------------------------
// メッセージ
// ------------------------------------------------------------

function validateMessage(body: string): string | null {
  if (!body.trim()) return 'メッセージを入力してください。';
  if (body.length > MAX_MESSAGE_LENGTH) {
    return `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください。`;
  }
  return null;
}

async function addSystemMessage(
  tx: Tx,
  threadIds: number[],
  actorId: number | null,
  body: string
) {
  if (threadIds.length === 0) return;

  const now = new Date();

  await tx.insert(giveawayMessages).values(
    threadIds.map((threadId) => ({
      threadId,
      senderId: actorId,
      kind: 'system',
      body,
      createdAt: now,
    }))
  );

  await tx
    .update(giveawayThreads)
    .set({ lastMessageAt: now })
    .where(inArray(giveawayThreads.id, threadIds));
}

/**
 * 新着メッセージのメールを、15分に1通までに抑えて送る。
 * 送ってよいか（前回から15分たったか）の判定と記録を、1つの UPDATE で行う。
 */
async function notifyNewMessageThrottled(params: {
  threadId: number;
  recipientRole: 'owner' | 'applicant';
  recipientId: number;
  giveawayTitle: string;
}) {
  const column =
    params.recipientRole === 'owner'
      ? giveawayThreads.ownerNotifiedAt
      : giveawayThreads.applicantNotifiedAt;

  const now = new Date();
  const threshold = new Date(now.getTime() - MESSAGE_EMAIL_INTERVAL_MS);

  const [claimed] = await db
    .update(giveawayThreads)
    .set(
      params.recipientRole === 'owner'
        ? { ownerNotifiedAt: now }
        : { applicantNotifiedAt: now }
    )
    .where(
      and(
        eq(giveawayThreads.id, params.threadId),
        or(isNull(column), lt(column, threshold))
      )
    )
    .returning({ id: giveawayThreads.id });

  if (!claimed) return;

  await notifyUser(params.recipientId, {
    subject: `「${params.giveawayTitle}」に新着メッセージがあります`,
    lead: `Atlasの「譲る」で、「${params.giveawayTitle}」に新着メッセージがあります。`,
    path: `/giveaways/threads/${params.threadId}`,
  });
}

/**
 * 希望者が投稿者にコメントを送る。はじめてのコメントなら、1対1のスレッドを作る。
 */
export async function applyToGiveaway(
  giveawayId: number,
  body: string
): Promise<ActionResult<{ threadId: number }>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  const invalid = validateMessage(body);
  if (invalid) return fail(invalid);

  try {
    const [giveaway] = await db
      .select()
      .from(giveaways)
      .where(and(eq(giveaways.id, giveawayId), isNull(giveaways.deletedAt)))
      .limit(1);

    if (!giveaway) return fail('投稿が見つかりません。');

    if (giveaway.authorId === user.id) {
      return fail('自分の投稿にはコメントできません。');
    }

    if (giveaway.status !== 'open') {
      return fail('この投稿は、現在コメントを受け付けていません。');
    }

    const { threadId, isNew } = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(giveawayThreads)
        .values({ giveawayId, applicantId: user.id })
        .onConflictDoNothing()
        .returning({ id: giveawayThreads.id });

      const thread =
        created ??
        (
          await tx
            .select({ id: giveawayThreads.id })
            .from(giveawayThreads)
            .where(
              and(
                eq(giveawayThreads.giveawayId, giveawayId),
                eq(giveawayThreads.applicantId, user.id)
              )
            )
            .limit(1)
        )[0];

      const now = new Date();

      await tx.insert(giveawayMessages).values({
        threadId: thread.id,
        senderId: user.id,
        body: body.trim(),
        createdAt: now,
      });

      await tx
        .update(giveawayThreads)
        .set({ lastMessageAt: now, applicantLastReadAt: now })
        .where(eq(giveawayThreads.id, thread.id));

      return { threadId: thread.id, isNew: Boolean(created) };
    });

    after(async () => {
      if (isNew) {
        await db
          .update(giveawayThreads)
          .set({ ownerNotifiedAt: new Date() })
          .where(eq(giveawayThreads.id, threadId));

        await notifyUser(giveaway.authorId, {
          subject: `「${giveaway.title}」に新しいコメントが届きました`,
          lead: `Atlasの「譲る」で、あなたの投稿「${giveaway.title}」に新しいコメントが届きました。`,
          path: `/giveaways/threads/${threadId}`,
        });
      } else {
        await notifyNewMessageThrottled({
          threadId,
          recipientRole: 'owner',
          recipientId: giveaway.authorId,
          giveawayTitle: giveaway.title,
        });
      }
    });

    revalidatePath(`/giveaways/${giveawayId}`);
    return { ok: true, data: { threadId } };
  } catch (error) {
    console.error('Failed to apply to giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

export async function postMessage(
  threadId: number,
  body: string
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  const invalid = validateMessage(body);
  if (invalid) return fail(invalid);

  try {
    const context = await getThreadForViewer(threadId, user.id);
    if (!context) return fail('このやりとりは表示できません。');

    const { thread, giveaway, role } = context;

    if (!canPostToThread(thread, giveaway)) {
      return fail('このやりとりには、現在メッセージを送れません。');
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(giveawayMessages).values({
        threadId,
        senderId: user.id,
        body: body.trim(),
        createdAt: now,
      });

      await tx
        .update(giveawayThreads)
        .set(
          role === 'owner'
            ? { lastMessageAt: now, ownerLastReadAt: now }
            : { lastMessageAt: now, applicantLastReadAt: now }
        )
        .where(eq(giveawayThreads.id, threadId));
    });

    after(() =>
      notifyNewMessageThrottled({
        threadId,
        recipientRole: role === 'owner' ? 'applicant' : 'owner',
        recipientId: role === 'owner' ? thread.applicantId : giveaway.authorId,
        giveawayTitle: giveaway.title,
      })
    );

    revalidatePath(`/giveaways/threads/${threadId}`);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to post giveaway message:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

// ------------------------------------------------------------
// 状態の変更
// ------------------------------------------------------------

async function threadIdsOf(tx: Tx, giveawayId: number) {
  return tx
    .select({ id: giveawayThreads.id, applicantId: giveawayThreads.applicantId })
    .from(giveawayThreads)
    .where(eq(giveawayThreads.giveawayId, giveawayId));
}

function revalidateGiveaway(giveawayId: number) {
  revalidatePath('/giveaways');
  revalidatePath(`/giveaways/${giveawayId}`);
  revalidatePath('/giveaways/threads/[threadId]', 'page');
}

/** 投稿者が、希望者を受け渡し予定者に決める（募集中 → 予定者決定） */
export async function reserveApplicant(
  threadId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  try {
    const context = await getThreadForViewer(threadId, user.id);
    if (!context || context.role !== 'owner') {
      return fail('この操作はできません。');
    }

    const { thread, giveaway } = context;

    const others = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(giveaways)
        .set({
          status: 'reserved',
          recipientId: thread.applicantId,
          updatedAt: new Date(),
        })
        .where(and(eq(giveaways.id, giveaway.id), eq(giveaways.status, 'open')))
        .returning({ id: giveaways.id });

      if (!updated) return null;

      const threads = await threadIdsOf(tx, giveaway.id);
      const otherThreads = threads.filter((t) => t.id !== threadId);

      await addSystemMessage(
        tx,
        [threadId],
        user.id,
        '受け渡し予定者に決まりました。このページで、受け渡しの日時と場所を相談しましょう。'
      );

      await addSystemMessage(
        tx,
        otherThreads.map((t) => t.id),
        user.id,
        '受け渡し予定者が決まったため、募集を締め切りました。'
      );

      return otherThreads.map((t) => t.applicantId);
    });

    if (others === null) {
      return fail('予定者を決められるのは、募集中の投稿だけです。');
    }

    after(async () => {
      await notifyUser(thread.applicantId, {
        subject: `「${giveaway.title}」の受け渡し予定者に選ばれました`,
        lead: `Atlasの「譲る」で、「${giveaway.title}」の受け渡し予定者に選ばれました。取引ページで、受け渡しの日時と場所を相談しましょう。`,
        path: `/giveaways/threads/${threadId}`,
      });

      await notifyUsers(others, {
        subject: `「${giveaway.title}」の受け渡し予定者が決まりました`,
        lead: `Atlasの「譲る」で、コメントした「${giveaway.title}」は、受け渡し予定者が決まったため募集を締め切りました。`,
        path: `/giveaways/${giveaway.id}`,
      });
    });

    revalidateGiveaway(giveaway.id);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to reserve giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 投稿者（キャンセル）または予定者（辞退）が、予定を取り消す（予定者決定 → 募集中） */
export async function cancelReservation(
  giveawayId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  try {
    const result = await db.transaction(async (tx) => {
      const [giveaway] = await tx
        .select()
        .from(giveaways)
        .where(
          and(
            eq(giveaways.id, giveawayId),
            eq(giveaways.status, 'reserved'),
            isNull(giveaways.deletedAt),
            or(
              eq(giveaways.authorId, user.id),
              eq(giveaways.recipientId, user.id)
            )
          )
        )
        .for('update')
        .limit(1);

      if (!giveaway || giveaway.recipientId === null) return null;

      await tx
        .update(giveaways)
        .set({ status: 'open', recipientId: null, updatedAt: new Date() })
        .where(eq(giveaways.id, giveawayId));

      const threads = await threadIdsOf(tx, giveawayId);
      const recipientThread = threads.find(
        (t) => t.applicantId === giveaway.recipientId
      );
      const otherThreads = threads.filter((t) => t !== recipientThread);
      const byOwner = giveaway.authorId === user.id;

      if (recipientThread) {
        await addSystemMessage(
          tx,
          [recipientThread.id],
          user.id,
          byOwner
            ? '投稿者が、受け渡しの予定をキャンセルしました。投稿は募集中に戻りました。'
            : '予定者が、受け渡しを辞退しました。投稿は募集中に戻りました。'
        );
      }

      await addSystemMessage(
        tx,
        otherThreads.map((t) => t.id),
        user.id,
        '募集が再開されました。'
      );

      return {
        giveaway,
        byOwner,
        recipientThreadId: recipientThread?.id ?? null,
        otherApplicantIds: otherThreads.map((t) => t.applicantId),
      };
    });

    if (!result) return fail('この操作はできません。');

    const { giveaway, byOwner, recipientThreadId, otherApplicantIds } = result;

    after(async () => {
      await notifyUser(byOwner ? giveaway.recipientId! : giveaway.authorId, {
        subject: `「${giveaway.title}」の受け渡しの予定がキャンセルされました`,
        lead: byOwner
          ? `Atlasの「譲る」で、「${giveaway.title}」の受け渡しの予定が、投稿者によってキャンセルされました。`
          : `Atlasの「譲る」で、「${giveaway.title}」の予定者が受け渡しを辞退しました。投稿は募集中に戻りました。`,
        path: recipientThreadId
          ? `/giveaways/threads/${recipientThreadId}`
          : `/giveaways/${giveaway.id}`,
      });

      await notifyUsers(otherApplicantIds, {
        subject: `「${giveaway.title}」の募集が再開されました`,
        lead: `Atlasの「譲る」で、コメントした「${giveaway.title}」の募集が再開されました。`,
        path: `/giveaways/${giveaway.id}`,
      });
    });

    revalidateGiveaway(giveawayId);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to cancel giveaway reservation:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 投稿者が「受け渡した」と報告する（予定者決定 → 受け渡し済み） */
export async function markHandedOver(
  giveawayId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  try {
    const result = await db.transaction(async (tx) => {
      const [giveaway] = await tx
        .update(giveaways)
        .set({
          status: 'handed_over',
          handedOverAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(giveaways.id, giveawayId),
            eq(giveaways.authorId, user.id),
            eq(giveaways.status, 'reserved'),
            isNull(giveaways.deletedAt)
          )
        )
        .returning();

      if (!giveaway) return null;

      const [thread] = await tx
        .select({ id: giveawayThreads.id })
        .from(giveawayThreads)
        .where(
          and(
            eq(giveawayThreads.giveawayId, giveawayId),
            eq(giveawayThreads.applicantId, giveaway.recipientId!)
          )
        )
        .limit(1);

      if (thread) {
        await addSystemMessage(
          tx,
          [thread.id],
          user.id,
          '投稿者が「受け渡した」と報告しました。受け取った方は「受け取りを確認」を押してください。7日たつと自動で完了になります。'
        );
      }

      return { giveaway, threadId: thread?.id ?? null };
    });

    if (!result) return fail('この操作はできません。');

    const { giveaway, threadId } = result;

    after(() =>
      notifyUser(giveaway.recipientId!, {
        subject: `「${giveaway.title}」の受け取りの確認をお願いします`,
        lead: `Atlasの「譲る」で、投稿者が「${giveaway.title}」を受け渡したと報告しました。受け取ったら「受け取りを確認」を押してください（7日たつと自動で完了になります）。`,
        path: threadId
          ? `/giveaways/threads/${threadId}`
          : `/giveaways/${giveaway.id}`,
      })
    );

    revalidateGiveaway(giveawayId);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to mark giveaway as handed over:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 予定者が受け取りを確認する（受け渡し済み → 完了） */
export async function confirmReceived(
  giveawayId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();

      const [giveaway] = await tx
        .update(giveaways)
        .set({ status: 'completed', closedAt: now, updatedAt: now })
        .where(
          and(
            eq(giveaways.id, giveawayId),
            eq(giveaways.recipientId, user.id),
            eq(giveaways.status, 'handed_over'),
            isNull(giveaways.deletedAt)
          )
        )
        .returning();

      if (!giveaway) return null;

      const [thread] = await tx
        .select({ id: giveawayThreads.id })
        .from(giveawayThreads)
        .where(
          and(
            eq(giveawayThreads.giveawayId, giveawayId),
            eq(giveawayThreads.applicantId, user.id)
          )
        )
        .limit(1);

      if (thread) {
        await addSystemMessage(
          tx,
          [thread.id],
          user.id,
          '受け取りが確認され、取引が完了しました。ありがとうございました。'
        );
      }

      return { giveaway, threadId: thread?.id ?? null };
    });

    if (!result) return fail('この操作はできません。');

    const { giveaway, threadId } = result;

    after(() =>
      notifyUser(giveaway.authorId, {
        subject: `「${giveaway.title}」の取引が完了しました`,
        lead: `Atlasの「譲る」で、「${giveaway.title}」の受け取りが確認され、取引が完了しました。`,
        path: threadId
          ? `/giveaways/threads/${threadId}`
          : `/giveaways/${giveaway.id}`,
      })
    );

    revalidateGiveaway(giveawayId);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to confirm giveaway receipt:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 投稿者が投稿を取り下げる（募集中・予定者決定 → 取り下げ） */
export async function withdrawGiveaway(
  giveawayId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();

      const [giveaway] = await tx
        .update(giveaways)
        .set({ status: 'withdrawn', closedAt: now, updatedAt: now })
        .where(
          and(
            eq(giveaways.id, giveawayId),
            eq(giveaways.authorId, user.id),
            inArray(giveaways.status, ['open', 'reserved']),
            isNull(giveaways.deletedAt)
          )
        )
        .returning();

      if (!giveaway) return null;

      const threads = await threadIdsOf(tx, giveawayId);

      await addSystemMessage(
        tx,
        threads.map((t) => t.id),
        user.id,
        '投稿者が、この投稿を取り下げました。'
      );

      return { giveaway, applicantIds: threads.map((t) => t.applicantId) };
    });

    if (!result) return fail('取り下げできるのは、募集中・予定者決定の投稿だけです。');

    const { giveaway, applicantIds } = result;

    after(() =>
      notifyUsers(applicantIds, {
        subject: `「${giveaway.title}」が取り下げられました`,
        lead: `Atlasの「譲る」で、コメントした「${giveaway.title}」が、投稿者によって取り下げられました。`,
        path: `/giveaways/${giveaway.id}`,
      })
    );

    revalidateGiveaway(giveawayId);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to withdraw giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 期限切れの投稿を、もう一度募集中にする */
export async function relistGiveaway(
  giveawayId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  try {
    const now = new Date();

    const [updated] = await db
      .update(giveaways)
      .set({
        status: 'open',
        recipientId: null,
        closedAt: null,
        // 過ぎた受け渡し可能期限は消して、今日から30日募集する
        availableUntil: null,
        expiresAt: listingExpiresAt(null, now),
        updatedAt: now,
      })
      .where(
        and(
          eq(giveaways.id, giveawayId),
          eq(giveaways.authorId, user.id),
          eq(giveaways.status, 'expired'),
          isNull(giveaways.deletedAt)
        )
      )
      .returning({ id: giveaways.id });

    if (!updated) return fail('再掲載できるのは、期限切れの投稿だけです。');

    revalidateGiveaway(giveawayId);
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to relist giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

// ------------------------------------------------------------
// 通報・運営
// ------------------------------------------------------------

export async function reportGiveaway(
  giveawayId: number,
  reason: string,
  messageId: number | null = null
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user) return fail(LOGIN_REQUIRED);

  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 1000) {
    return fail('通報の理由を1〜1000文字で入力してください。');
  }

  try {
    const [giveaway] = await db
      .select({ id: giveaways.id, title: giveaways.title })
      .from(giveaways)
      .where(and(eq(giveaways.id, giveawayId), isNull(giveaways.deletedAt)))
      .limit(1);

    if (!giveaway) return fail('投稿が見つかりません。');

    // メッセージの通報は、そのやりとりの当事者だけができる
    if (messageId !== null) {
      const [message] = await db
        .select({ threadId: giveawayMessages.threadId })
        .from(giveawayMessages)
        .innerJoin(
          giveawayThreads,
          eq(giveawayMessages.threadId, giveawayThreads.id)
        )
        .where(
          and(
            eq(giveawayMessages.id, messageId),
            eq(giveawayThreads.giveawayId, giveawayId),
            ne(giveawayMessages.kind, 'system')
          )
        )
        .limit(1);

      const context = message
        ? await getThreadForViewer(message.threadId, user.id)
        : null;

      if (!context) return fail('このメッセージは通報できません。');
    }

    const [report] = await db
      .insert(giveawayReports)
      .values({
        giveawayId,
        messageId,
        reporterId: user.id,
        reason: trimmed,
      })
      .returning({ id: giveawayReports.id });

    after(() =>
      notifyAdminOfReport({
        reportId: report.id,
        giveawayId,
        giveawayTitle: giveaway.title,
        reporterId: user.id,
        messageId,
        reason: trimmed,
      })
    );

    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to report giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 運営が投稿を非表示にする */
export async function hideGiveaway(
  giveawayId: number
): Promise<ActionResult<null>> {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return fail('この操作を実行する権限がありません。');
  }

  try {
    const [hidden] = await db
      .update(giveaways)
      .set({ deletedAt: new Date() })
      .where(and(eq(giveaways.id, giveawayId), isNull(giveaways.deletedAt)))
      .returning({ title: giveaways.title, authorId: giveaways.authorId });

    if (!hidden) return fail('この投稿は、すでに非表示です。');

    const applicantIds = (
      await db
        .select({ applicantId: giveawayThreads.applicantId })
        .from(giveawayThreads)
        .where(eq(giveawayThreads.giveawayId, giveawayId))
    ).map((row) => row.applicantId);

    // 理由は書かない。取引ページも開けなくなるので、当事者に知らせる
    after(async () => {
      await notifyUser(hidden.authorId, {
        subject: `「${hidden.title}」を非表示にしました`,
        lead: `Atlasの「譲る」で、あなたの投稿「${hidden.title}」は、利用規約に基づき運営が非表示にしました。この投稿のやりとりも表示されなくなります。`,
        path: '/terms',
      });

      await notifyUsers(applicantIds, {
        subject: `「${hidden.title}」は表示されなくなりました`,
        lead: `Atlasの「譲る」で、コメントした「${hidden.title}」は、利用規約に基づき運営が非表示にしました。この投稿のやりとりも表示されなくなります。`,
        path: '/giveaways',
      });
    });

    revalidateGiveaway(giveawayId);
    revalidateReports();
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to hide giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

async function requireAdmin() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return user;
}

function revalidateReports() {
  revalidatePath('/account/giveaway-reports');
  revalidatePath('/account/giveaway-reports/[id]', 'page');
}

/** 運営が非表示を取り消す（誤って非表示にした場合）。当事者への通知はしない */
export async function restoreGiveaway(
  giveawayId: number
): Promise<ActionResult<null>> {
  if (!(await requireAdmin())) {
    return fail('この操作を実行する権限がありません。');
  }

  try {
    await db
      .update(giveaways)
      .set({ deletedAt: null })
      .where(eq(giveaways.id, giveawayId));

    revalidateGiveaway(giveawayId);
    revalidateReports();
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to restore giveaway:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/**
 * 運営がメッセージを削除する。利用者には「運営が削除しました」と表示する。
 * 本文は、運営の確認用に残す（スレッドの削除時に一緒に消える）。
 */
export async function deleteGiveawayMessage(
  messageId: number
): Promise<ActionResult<null>> {
  if (!(await requireAdmin())) {
    return fail('この操作を実行する権限がありません。');
  }

  try {
    const [deleted] = await db
      .update(giveawayMessages)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(giveawayMessages.id, messageId),
          eq(giveawayMessages.kind, 'user'),
          isNull(giveawayMessages.deletedAt)
        )
      )
      .returning({ threadId: giveawayMessages.threadId });

    if (!deleted) return fail('このメッセージは削除できません。');

    revalidatePath(`/giveaways/threads/${deleted.threadId}`);
    revalidateReports();
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to delete giveaway message:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}

/** 通報を対応済みにする（resolved: false で未対応に戻す） */
export async function setGiveawayReportResolved(
  reportId: number,
  resolved: boolean
): Promise<ActionResult<null>> {
  if (!(await requireAdmin())) {
    return fail('この操作を実行する権限がありません。');
  }

  try {
    await db
      .update(giveawayReports)
      .set({ resolvedAt: resolved ? new Date() : null })
      .where(eq(giveawayReports.id, reportId));

    revalidateReports();
    revalidatePath('/account');
    return { ok: true, data: null };
  } catch (error) {
    console.error('Failed to update giveaway report:', error);
    return fail(UNEXPECTED_ERROR_MESSAGE);
  }
}
