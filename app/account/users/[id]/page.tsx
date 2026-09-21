import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

import {
  getDeletionRecords,
  getUserForAdmin,
} from '@/lib/account/admin-users';
import { isAdmin } from '@/lib/auth/permissions';
import { getUser } from '@/lib/db/queries';
import { AccessDenied } from '../access-denied';
import { DeleteUserForm } from './delete-user-form';

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

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getUser();

  if (!admin || !(await isAdmin(admin.id))) {
    return <AccessDenied />;
  }

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const userId = Number(id);
  const target = await getUserForAdmin(userId);

  if (!target) {
    notFound();
  }

  const deletions = await getDeletionRecords(userId);
  const isDeleted = target.deletedAt !== null;
  const isOwner = target.role === 'owner';
  const isSelf = target.id === admin.id;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/account/users"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        ユーザー一覧へ戻る
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">
        {isDeleted
          ? `削除済みのユーザー #${target.id}`
          : target.name || '（ニックネーム未設定）'}
      </h1>

      {/* Info */}
      {!isDeleted && (
        <dl className="mt-5 grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 rounded-xl border bg-white p-4 text-sm">
          <dt className="text-muted-foreground">ID</dt>
          <dd>#{target.id}</dd>

          <dt className="text-muted-foreground">メールアドレス</dt>
          <dd className="break-all">{target.email}</dd>

          <dt className="text-muted-foreground">ロール</dt>
          <dd>{isOwner ? '運営' : '会員'}</dd>

          <dt className="text-muted-foreground">登録日</dt>
          <dd>{formatDate(target.createdAt)}</dd>

          <dt className="text-muted-foreground">公開中の投稿</dt>
          <dd>
            質問 {target.questionCount}・回答 {target.answerCount}・経験談{' '}
            {target.experienceCount}
          </dd>
        </dl>
      )}

      {/* Deletion records */}
      {deletions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold">削除の記録</h2>

          <div className="mt-3 space-y-2">
            {deletions.map((deletion) => (
              <div
                key={deletion.id}
                className="rounded-xl border bg-white p-4 text-sm"
              >
                <p>
                  {actorLabel[deletion.actorType] ?? deletion.actorType}・
                  {modeLabel[deletion.mode] ?? deletion.mode}
                  {deletion.emailHash && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      再登録を拒否
                    </span>
                  )}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(deletion.requestedAt)} に削除・
                  {deletion.purgedAt
                    ? `${formatDate(deletion.purgedAt)} に完全に削除済み`
                    : `${formatDate(deletion.purgeAfter)} に完全に削除予定`}
                </p>

                {deletion.reason && (
                  <p className="mt-2 whitespace-pre-wrap text-gray-700">
                    理由：{deletion.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Delete */}
      {isDeleted ? (
        <p className="mt-8 rounded-xl border bg-white p-4 text-sm text-muted-foreground">
          このユーザーは削除済みです。名前・メールアドレスは消去されています。
        </p>
      ) : isOwner || isSelf ? (
        <p className="mt-8 rounded-xl border bg-white p-4 text-sm text-muted-foreground">
          {isSelf
            ? 'ご自身のアカウントは、ここからは削除できません。マイページの「ログイン情報」から削除してください。'
            : '運営アカウントは削除できません。先にロールを変更してください。'}
        </p>
      ) : (
        <section className="mt-8 rounded-xl border border-red-200 bg-white p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-red-600">
            <AlertTriangle className="h-5 w-5" />
            このユーザーを削除
          </h2>

          <DeleteUserForm userId={target.id} />
        </section>
      )}
    </main>
  );
}
