'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';

import { UNEXPECTED_ERROR_MESSAGE } from '@/lib/action-result';
import { isAdmin } from '@/lib/auth/permissions';
import { countries } from '@/lib/constants/countries';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { gatherEvents } from '@/lib/db/schema';
import { GATHER_FORMATS, isGatherTheme } from '@/lib/gather/constants';

// 「集まる」のイベントの登録・編集・公開・削除。運営だけが使う（/account/gather-events）。

export type GatherEventFormState = {
  error?: string;
};

const ADMIN_ONLY = 'この操作は運営だけができます。';

// 空欄なら NULL にする、任意の文字列
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label}は${max}文字以内で入力してください。`)
    .transform((value) => (value === '' ? null : value));
}

function optionalUrl(label: string) {
  return z
    .string()
    .trim()
    .max(500, `${label}は500文字以内で入力してください。`)
    .refine(
      (value) => value === '' || /^https?:\/\/\S+$/i.test(value),
      `${label}は http:// か https:// で始まる形で入力してください。`
    )
    .transform((value) => (value === '' ? null : value));
}

const gatherEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'イベント名を入力してください。')
    .max(100, 'イベント名は100文字以内で入力してください。'),
  description: z
    .string()
    .trim()
    .min(1, '説明を入力してください。')
    .max(2000, '説明は2000文字以内で入力してください。'),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '開催日を入力してください。'),
  startTime: optionalText(50, '開始時刻'),
  country: z
    .string()
    .refine((value) => countries.includes(value), '国を選んでください。'),
  // 国で「その他」を選んだときの国名
  countryFreeText: z.string().trim().max(100, '国名は100文字以内で入力してください。').optional(),
  region: optionalText(100, '地域'),
  // チェックボックス。チェックされたときだけ 'on' が送られる
  isOnline: z.string().optional(),
  venue: optionalText(200, '会場'),
  format: z.enum(GATHER_FORMATS, {
    errorMap: () => ({ message: '形式を選んでください。' }),
  }),
  fee: optionalText(100, '参加費'),
  audience: optionalText(200, '対象'),
  organizerName: z
    .string()
    .trim()
    .min(1, '主催者を入力してください。')
    .max(100, '主催者は100文字以内で入力してください。'),
  organizerUrl: optionalUrl('主催者のページ'),
  applyUrl: optionalUrl('申込ページ'),
  source: z.enum(['request', 'pick'], {
    errorMap: () => ({ message: '掲載のきっかけを選んでください。' }),
  }),
  // 押したボタン。下書き保存か、公開か
  intent: z.enum(['draft', 'publish']),
});

async function requireAdmin() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return user;
}

function parseId(value: FormDataEntryValue | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function revalidateGather() {
  revalidatePath('/gather', 'layout');
  revalidatePath('/account/gather-events');
}

export async function saveGatherEvent(
  _prevState: GatherEventFormState,
  formData: FormData
): Promise<GatherEventFormState> {
  const admin = await requireAdmin();
  if (!admin) return { error: ADMIN_ONLY };

  const parsed = gatherEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { intent, isOnline, countryFreeText, ...input } = parsed.data;
  const online = isOnline === 'on';

  if (input.country === 'その他') {
    if (!countryFreeText) return { error: '国名を入力してください。' };
    input.country = countryFreeText;
  }

  if (!online && !input.region) {
    return { error: '地域（都市）を入力してください。オンラインの場合は「オンライン開催」にチェックしてください。' };
  }

  const themes = formData
    .getAll('themes')
    .map(String)
    .filter(isGatherTheme);

  const values = { ...input, isOnline: online, themes };
  const id = parseId(formData.get('id'));

  try {
    if (id) {
      await db
        .update(gatherEvents)
        .set({
          ...values,
          // 公開済みなら最初の公開日時を残す
          publishedAt:
            intent === 'publish'
              ? sql`coalesce(${gatherEvents.publishedAt}, now())`
              : null,
          updatedAt: new Date(),
        })
        .where(and(eq(gatherEvents.id, id), isNull(gatherEvents.deletedAt)));
    } else {
      await db.insert(gatherEvents).values({
        ...values,
        createdBy: admin.id,
        publishedAt: intent === 'publish' ? new Date() : null,
      });
    }
  } catch (error) {
    console.error('Failed to save gather event:', error);
    return { error: UNEXPECTED_ERROR_MESSAGE };
  }

  revalidateGather();
  redirect(`/account/gather-events?saved=${intent}`);
}

// 一覧の「公開する」「下書きに戻す」ボタン
export async function setGatherEventPublished(formData: FormData) {
  if (!(await requireAdmin())) return;

  const id = parseId(formData.get('id'));
  if (!id) return;

  const publish = formData.get('publish') === 'true';

  try {
    await db
      .update(gatherEvents)
      .set({ publishedAt: publish ? new Date() : null })
      .where(and(eq(gatherEvents.id, id), isNull(gatherEvents.deletedAt)));
  } catch (error) {
    console.error('Failed to change gather event visibility:', error);
    return;
  }

  revalidateGather();
}

// 削除。行は残し、公開ページと運営画面の両方から見えなくする
export async function deleteGatherEvent(formData: FormData) {
  if (!(await requireAdmin())) return;

  const id = parseId(formData.get('id'));
  if (!id) return;

  try {
    await db
      .update(gatherEvents)
      .set({ deletedAt: new Date(), publishedAt: null })
      .where(and(eq(gatherEvents.id, id), isNull(gatherEvents.deletedAt)));
  } catch (error) {
    console.error('Failed to delete gather event:', error);
    return;
  }

  revalidateGather();
}
