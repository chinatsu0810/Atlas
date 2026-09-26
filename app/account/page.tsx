import Link from 'next/link';
import {
  UserRound,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  Gift,
  Flag,
  Mail,
  Building2,
  Users,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { signOut } from '@/app/(login)/actions';
import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getUnreadTotal } from '@/lib/giveaways/queries';
import { countOpenGiveawayReports } from '@/lib/giveaways/admin';

const menuItems = [
  {
    href: '/account/profile',
    icon: UserRound,
    title: 'プロフィール',
    description: 'ニックネームやメールアドレスを変更できます。',
  },
  {
    href: '/account/security',
    icon: LockKeyhole,
    title: 'ログイン情報',
    description: 'パスワードを変更、アカウントを削除できます。',
  },
  {
    href: '/account/questions',
    icon: MessageCircle,
    title: '自分の質問',
    description: '投稿した質問を確認できます。',
  },
  {
    href: '/account/answers',
    icon: MessagesSquare,
    title: '自分の回答',
    description: '投稿した回答を確認できます。',
  },
  {
    href: '/account/experiences',
    icon: Sparkles,
    title: '自分の経験',
    description: '投稿した経験談を確認できます。',
  },
  {
    href: '/account/giveaways',
    icon: Gift,
    title: '譲る',
    description: '自分の投稿と、コメントした投稿のやりとりを確認できます。',
  },
];

export default async function AccountPage() {
  const user = await getUser();
  const admin = user ? await isAdmin(user.id) : false;
  const giveawayUnread = user ? await getUnreadTotal(user.id) : 0;
  const openGiveawayReports = admin ? await countOpenGiveawayReports() : 0;

  return (
    <section className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">

        {/* Title */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            マイページ
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            プロフィールや投稿内容を管理できます。
          </p>
        </div>

        {/* Menu */}
        <div className="space-y-2 md:space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="block"
              >
                <Card className="cursor-pointer transition hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-5">

                    {/* Icon */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 md:h-10 md:w-10">
                      <Icon className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold md:text-base">
                        {item.title}
                      </h2>

                      <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                        {item.description}
                      </p>
                    </div>

                    {item.href === '/account/giveaways' && giveawayUnread > 0 && (
                      <span className="shrink-0 rounded-full bg-[#D14343] px-2 py-0.5 text-xs font-bold text-white">
                        未読 {giveawayUnread}
                      </span>
                    )}

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground md:h-5 md:w-5" />

                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Admin Menu */}
        {admin && (
          <div className="mt-8 border-t pt-6">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              運営
            </p>

            <div className="space-y-2 md:space-y-3">
              <Link
                href="/account/contacts"
                className="block"
              >
                <Card className="cursor-pointer transition hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-5">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 md:h-10 md:w-10">
                      <Mail className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold md:text-base">
                        お問い合わせ
                      </h2>

                      <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                        受け付けたお問い合わせを確認できます。
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground md:h-5 md:w-5" />

                  </CardContent>
                </Card>
              </Link>

              <Link
                href="/account/giveaway-reports"
                className="block"
              >
                <Card className="cursor-pointer transition hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-5">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 md:h-10 md:w-10">
                      <Flag className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold md:text-base">
                        「譲る」の通報
                      </h2>

                      <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                        通報された投稿・メッセージを確認し、非表示・削除できます。
                      </p>
                    </div>

                    {openGiveawayReports > 0 && (
                      <span className="shrink-0 rounded-full bg-[#D14343] px-2 py-0.5 text-xs font-bold text-white">
                        未対応 {openGiveawayReports}
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground md:h-5 md:w-5" />

                  </CardContent>
                </Card>
              </Link>

              <Link
                href="/account/users"
                className="block"
              >
                <Card className="cursor-pointer transition hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-5">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 md:h-10 md:w-10">
                      <Users className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold md:text-base">
                        ユーザー
                      </h2>

                      <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                        会員を確認し、規約に違反したユーザーを削除できます。
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground md:h-5 md:w-5" />

                  </CardContent>
                </Card>
              </Link>

              <Link
                href="/office"
                className="block"
              >
                <Card className="cursor-pointer transition hover:bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-5">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 md:h-10 md:w-10">
                      <Building2 className="h-4 w-4 text-orange-500 md:h-5 md:w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold md:text-base">
                        Atlas Office
                      </h2>

                      <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                        AI社員たちが働くバーチャルオフィス。経営判断会議やThreads運用もここから行えます。
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground md:h-5 md:w-5" />

                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="mt-8 border-t pt-6">
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-muted-foreground transition hover:text-red-500"
            >
              ログアウト
            </button>
          </form>
        </div>

      </div>
    </section>
  );
}