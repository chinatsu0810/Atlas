import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';

import { updateContactStatus } from '@/app/contact/actions';

import {
  db,
} from '@/lib/db/drizzle';

import {
  contacts,
  contactStatusHistory,
  users,
} from '@/lib/db/schema';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';

export default async function ContactsPage() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">
          アクセスできません
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          このページは運営のみ利用できます。
        </p>

        <Link
          href="/account"
          className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          マイページへ戻る
        </Link>
      </main>
    );
  }

  const contactList = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt));

  const historyList = await db
    .select({
      id: contactStatusHistory.id,
      contactId: contactStatusHistory.contactId,
      oldStatus: contactStatusHistory.oldStatus,
      newStatus: contactStatusHistory.newStatus,
      createdAt: contactStatusHistory.createdAt,
      changedByName: users.name,
      changedByEmail: users.email,
    })
    .from(contactStatusHistory)
  .leftJoin(
  users,
  eq(contactStatusHistory.changedBy, users.id)
)


    .orderBy(desc(contactStatusHistory.createdAt));

  const unreadCount = contactList.filter(
    (contact) => contact.status === 'unread'
  ).length;

  const categoryMap: Record<string, string> = {
    general: 'サービスについて',
    bug: '不具合の報告',
    content: '投稿内容について',
    account: 'アカウントについて',
    other: 'その他',
  };

  const statusMap = {
    unread: {
      label: '未対応',
      className: 'bg-red-100 text-red-700',
    },
    in_progress: {
      label: '対応中',
      className: 'bg-yellow-100 text-yellow-700',
    },
    resolved: {
      label: '対応済み',
      className: 'bg-green-100 text-green-700',
    },
  };

  const getStatusLabel = (value: string) =>
    statusMap[value as keyof typeof statusMap]?.label ?? value;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-8">
        <Link
          href="/account"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          マイページへ戻る
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Mail className="h-5 w-5 text-orange-500" />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              運営
            </p>

            <h1 className="text-2xl font-bold tracking-tight">
              お問い合わせ
            </h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          受け付けたお問い合わせを確認できます。
        </p>

        <div className="mt-4 inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
          未対応 {unreadCount}件
        </div>
      </div>

      {contactList.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground" />

          <p className="mt-3 text-sm text-muted-foreground">
            まだお問い合わせはありません。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contactList.map((contact) => {
            const status =
              statusMap[
                contact.status as keyof typeof statusMap
              ];

            const histories = historyList.filter(
              (history) =>
                history.contactId === contact.id
            );

            return (
              <article
                key={contact.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                {/* Header */}
                <div className="flex flex-col gap-2 border-b pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-900">
                        {contact.name || '名前未入力'}
                      </h2>

                      <span className="text-xs text-muted-foreground">
                        #{contact.id}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {contact.email}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(
                      contact.createdAt
                    ).toLocaleString('ja-JP')}
                  </div>
                </div>

                {/* Category */}
                <div className="mt-4">
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {categoryMap[contact.category] ??
                      contact.category}
                  </span>
                </div>

                {/* Message */}
                <div className="mt-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                    {contact.message}
                  </p>
                </div>

                {/* Status */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        ステータス
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          status?.className ??
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {status?.label ?? contact.status}
                      </span>
                    </div>

                    <form
                      action={async (formData) => {
                        'use server';

                        const value = String(
                          formData.get('status')
                        );

                        if (
                          value !== 'unread' &&
                          value !== 'in_progress' &&
                          value !== 'resolved'
                        ) {
                          return;
                        }

                        await updateContactStatus(
                          contact.id,
                          value
                        );
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={contact.status}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="unread">
                          未対応
                        </option>

                        <option value="in_progress">
                          対応中
                        </option>

                        <option value="resolved">
                          対応済み
                        </option>
                      </select>

                      <button
                        type="submit"
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        更新
                      </button>
                    </form>
                  </div>
                </div>

                {/* History */}
                {histories.length > 0 && (
                  <div className="mt-5 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      対応履歴
                    </p>

                    <div className="mt-3 space-y-3">
                      {histories.map((history) => (
                        <div
                          key={history.id}
                          className="rounded-lg bg-gray-50 px-4 py-3"
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-700">
                              {getStatusLabel(
                                history.oldStatus
                              )}
                              {' → '}
                              <span className="font-medium">
                                {getStatusLabel(
                                  history.newStatus
                                )}
                              </span>
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                history.createdAt
                              ).toLocaleString('ja-JP')}
                            </p>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {history.changedByName ||
                              history.changedByEmail ||
                              '運営'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}