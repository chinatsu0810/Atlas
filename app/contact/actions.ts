'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  contacts,
  contactStatusHistory,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';



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

