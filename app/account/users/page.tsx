import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronRight, Users } from 'lucide-react';

import {
  countActiveUsers,
  listActiveUsers,
  listRecentDeletions,
} from '@/lib/account/admin-users';
import { isAdmin } from '@/lib/auth/permissions';
import { getUser } from '@/lib/db/queries';
import { AccessDenied } from './access-denied';

const LIST_LIMIT = 100;

const modeLabel: Record<string, string> = {
  full: '完全削除',
  keep_content: 'コンテンツを残して削除',
};

const actorLabel: Record<string, string> = {
  self: '本人退会',
  admin: '運営削除',
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('ja-JP');
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return <AccessDenied />;
  }

  const { deleted } = await searchParams;
  const deletedId = deleted && /^\d+$/.test(deleted) ? deleted : null;

  const [userList, total, deletions] = await Promise.all([
    listActiveUsers(LIST_LIMIT),
    countActiveUsers(),
    listRecentDeletions(20),
  ]);

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
            <Users className="h-5 w-5 text-orange-500" />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">運営</p>

            <h1 className="text-2xl font-bold tracking-tight">ユーザー</h1>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          会員を確認し、規約に違反したユーザーを削除できます。
        </p>
      </div>

      {deletedId && (
        <div className="mb-6 flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>ユーザー #{deletedId} を削除しました。</p>
        </div>
      )}

      {/* Users */}
      <section>
        <h2 className="text-base font-bold">会員 {total}人</h2>

        {total > LIST_LIMIT && (
          <p className="mt-1 text-xs text-muted-foreground">
            新しい順に{LIST_LIMIT}人を表示しています。
          </p>
        )}

        <div className="mt-3 space-y-2">
          {userList.map((member) => (
            <Link
              key={member.id}
              href={`/account/users/${member.id}`}
              className="block"
            >
              <div className="flex items-center gap-3 rounded-xl border bg-white p-4 transition hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">
                      {member.name || '（ニックネーム未設定）'}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      #{member.id}
                    </span>

                    {member.role === 'owner' && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        運営
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    登録 {formatDate(member.createdAt)}・質問{' '}
                    {member.questionCount}・回答 {member.answerCount}・経験談{' '}
                    {member.experienceCount}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Deletions */}
      <section className="mt-10">
        <h2 className="text-base font-bold">削除の履歴</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          削除したユーザーの名前・メールアドレスは、削除と同時に消去されるため、記録には残りません。
        </p>

        {deletions.length === 0 ? (
          <p className="mt-3 rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            削除の履歴はまだありません。
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {deletions.map((deletion) => (
              <Link
                key={deletion.id}
                href={`/account/users/${deletion.userId}`}
                className="block"
              >
                <div className="rounded-xl border bg-white p-4 transition hover:bg-muted/50">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-bold">#{deletion.userId}</span>

                    <span>{actorLabel[deletion.actorType] ?? deletion.actorType}</span>

                    <span className="text-muted-foreground">
                      {modeLabel[deletion.mode] ?? deletion.mode}
                    </span>

                    {deletion.blocked && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        再登録を拒否
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(deletion.requestedAt)} に削除・
                    {deletion.purgedAt
                      ? `${formatDate(deletion.purgedAt)} に完全に削除済み`
                      : `${formatDate(deletion.purgeAfter)} に完全に削除予定`}
                  </p>

                  {deletion.reason && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                      理由：{deletion.reason}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
