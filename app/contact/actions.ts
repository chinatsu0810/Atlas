
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

import { db } from '@/lib/db/drizzle';
import {
  contacts,
  contactStatusHistory,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';

const resend = new Resend(process.env.RESEND_API_KEY);

export type ContactState = {
  success?: boolean;
  message?: string;
};

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const category = String(formData.get('category') || '').trim();
  const message = String(formData.get('message') || '').trim();

  if (!email || !category || !message) {
    return {
      success: false,
      message: '必須項目を入力してください。',
    };
  }

  try {
    const user = await getUser();

    await db.insert(contacts).values({
      userId: user?.id ?? null,
      name: name || null,
      email,
      category,
      message,
    });

    await resend.emails.send({
      from: 'Atlas <contact@atlas-community.jp>',
      to: ['contact@atlas-community.jp'],
      replyTo: email,
      subject: `【Atlasお問い合わせ】${category}`,
      text: [
        'Atlasにお問い合わせがありました。',
        '',
        `お名前：${name || '未入力'}`,
        `メールアドレス：${email}`,
        `お問い合わせ種別：${category}`,
        '',
        'お問い合わせ内容：',
        message,
      ].join('\n'),
    });

    return {
      success: true,
      message: 'お問い合わせを送信しました。',
    };
  } catch (error) {
    console.error('Failed to submit contact:', error);

    return {
      success: false,
      message:
        'お問い合わせの送信に失敗しました。時間をおいてもう一度お試しください。',
    };
  }
}

export async function updateContactStatus(
  contactId: number,
  status: 'unread' | 'in_progress' | 'resolved'
): Promise<void> {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    throw new Error('Unauthorized');
  }

  const [contact] = await db
    .select({
      status: contacts.status,
    })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) {
    throw new Error('Contact not found');
  }

  // 同じステータスなら何もしない
  if (contact.status === status) {
    return;
  }

  // 問い合わせ本体のステータスを更新
  await db
    .update(contacts)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));

  await db.insert(contactStatusHistory).values({
    contactId,
    oldStatus: contact.status,
    newStatus: status,
    changedBy: user.id,
  });

  revalidatePath('/account/contacts');
}