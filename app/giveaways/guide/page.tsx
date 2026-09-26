import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, ChevronRight, Gift, Search, ShieldCheck } from 'lucide-react';

import { PROHIBITED_CATEGORIES } from '@/lib/giveaways/prohibited-items';
import { GiveawayPostButton } from '@/components/giveaways/post-button';
import { GiveawayStatusBadge } from '@/components/giveaways/status-badge';

export const metadata: Metadata = {
  title: '「譲る」の使い方',
  description:
    '帰国・引越しの不用品を、海外に住む日本人同士で譲り合う「譲る」の使い方。投稿から受け渡しまでの流れを紹介します。',
  alternates: { canonical: '/giveaways/guide' },
};

// イラストは public/images/giveaways/guide/ のSVG（Canvaで編集できる形式）
const giverSteps = [
  {
    image: '/images/giveaways/guide/giver-1-post.svg',
    title: '写真を撮って投稿',
    body: '写真・説明・受け渡しエリア・価格（無料もOK）を入力します。受け渡し可能期限を書くと、その日まで募集できます。住所は書かなくて大丈夫です。',
  },
  {
    image: '/images/giveaways/guide/giver-2-mail.svg',
    title: 'コメントが届く',
    body: '欲しい人からコメントが届くと、メールでお知らせします。コメントはあなたにしか見えません。',
  },
  {
    image: '/images/giveaways/guide/giver-3-chat.svg',
    title: '予定者を決めて相談',
    body: '「受け渡し予定者に決定」を押すと、2人だけの取引ページで日時と場所を相談できます。',
  },
  {
    image: '/images/giveaways/guide/giver-4-handover.svg',
    title: '渡したら「受け渡した」',
    body: '受け渡しが済んだら「受け渡した」を押します。相手が受け取りを確認すると完了です。',
  },
];

const takerSteps = [
  {
    image: '/images/giveaways/guide/taker-1-search.svg',
    title: '欲しい物を探す',
    body: '国・都市・カテゴリで絞り込んで、近くで譲ってもらえる物を探します。',
  },
  {
    image: '/images/giveaways/guide/taker-2-comment.svg',
    title: 'コメントを送る',
    body: '「欲しい！コメントする」から、投稿者だけに届くコメントを送ります（ログインが必要です）。',
  },
  {
    image: '/images/giveaways/guide/taker-3-meet.svg',
    title: '選ばれたら相談',
    body: '予定者に選ばれるとメールが届きます。取引ページで、受け渡しの日時と場所を決めましょう。',
  },
  {
    image: '/images/giveaways/guide/taker-4-received.svg',
    title: '受け取ったら確認',
    body: '受け取ったら「受け取りを確認」を押して完了です。押し忘れても7日で自動的に完了します。',
  },
];

const statusFlow = [
  { status: 'open', note: 'コメントを受け付けています' },
  { status: 'reserved', note: '予定者と日時・場所を相談中' },
  { status: 'handed_over', note: '投稿者が「受け渡した」を押した' },
  { status: 'completed', note: '受け取りの確認、または7日経過' },
];

function Steps({
  steps,
  accent,
}: {
  steps: typeof giverSteps;
  accent: string;
}) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.image} alt="" width={240} height={180} className="w-full" />
          <div className="p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white"
                style={{ backgroundColor: accent }}
              >
                {index + 1}
              </span>
              {step.title}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#4F6B80]">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function GiveawayGuidePage() {
  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-8 text-[#123B5D] md:px-6 md:py-12">
      <div className="mx-auto max-w-[1120px]">
        {/* はじめに */}
        <section className="rounded-3xl bg-white px-5 py-8 text-center shadow-sm md:px-10 md:py-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4FB] text-[#1478B8]">
            <Gift className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold md:text-3xl">「譲る」の使い方</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4F6B80]">
            帰国や引越しで使わなくなった物を、同じ街に住む日本人へ。
            <br className="hidden sm:block" />
            コメントは投稿者だけに届き、受け渡しの相談は2人だけのページで行います。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GiveawayPostButton label="譲る物を投稿する" />
            <Link
              href="/giveaways"
              className="inline-flex items-center gap-2 rounded-full border border-[#D8E7F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1478B8] transition hover:bg-[#F1F8FC]"
            >
              <Search className="h-4 w-4" />
              譲ってもらえる物を探す
            </Link>
          </div>
        </section>

        {/* 譲る人 */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">譲る人の流れ</h2>
          <Steps steps={giverSteps} accent="#1478B8" />
        </section>

        {/* もらう人 */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">もらう人の流れ</h2>
          <Steps steps={takerSteps} accent="#F97316" />
        </section>

        {/* ステータス */}
        <section className="mt-10 rounded-2xl border border-[#E1EBF1] bg-white p-5 md:p-6">
          <h2 className="text-lg font-bold">投稿のステータス</h2>
          <ol className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch">
            {statusFlow.map((item, index) => (
              <li key={item.status} className="flex items-center gap-2 md:flex-1">
                <div className="flex-1 rounded-xl bg-[#F8FBFD] p-3 text-center">
                  <GiveawayStatusBadge status={item.status} />
                  <p className="mt-1.5 text-xs text-[#6B8498]">{item.note}</p>
                </div>
                {index < statusFlow.length - 1 && (
                  <ChevronRight className="hidden h-5 w-5 shrink-0 text-[#A3B1BB] md:block" />
                )}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-5 text-[#6B8498]">
            予定をキャンセル・辞退すると「募集中」に戻ります。募集は、受け渡し可能期限を書いた場合はその日まで、書かない場合は30日で「期限切れ」になります。期限切れになっても、投稿者はもう一度募集できます。
          </p>
        </section>

        {/* 安全 */}
        <section className="mt-10 rounded-2xl bg-[#EAF4FB] p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-[#1478B8]" />
            安全に使うために
          </h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#35617E] md:grid-cols-2">
            <li>・受け渡しは、駅やショッピングモールなど人の多い場所で。</li>
            <li>・代金の先払いは避け、受け渡しのときに当事者同士で確認を。</li>
            <li>・住所や電話番号は、予定者が決まってから必要な範囲だけ。</li>
            <li>・メールが迷惑メールフォルダに入ることも。ときどきマイページを確認してください。</li>
            <li>・困ったときは、投稿やメッセージの「通報」から運営に知らせてください。</li>
            <li>・禁止品や、利用規約に反する投稿・メッセージは、運営が予告なく削除・非表示にすることがあります。</li>
            <li>・Atlasは場の提供のみを行い、取引の当事者にはなりません。</li>
          </ul>
        </section>

        {/* 禁止品 */}
        <section id="prohibited" className="mt-10 scroll-mt-24 rounded-2xl border border-[#F2C4C4] bg-white p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Ban className="h-5 w-5 text-[#D14343]" />
            譲れない物
          </h2>
          <p className="mt-2 text-sm text-[#4F6B80]">
            次の品目は、どの国でも「譲る」では扱えません。タイトルや説明に含まれていると投稿できません。
            このほか、お住まいの国の法律で譲渡が禁止されている物も扱えません。
          </p>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {PROHIBITED_CATEGORIES.map((category) => (
              <div key={category.label} className="rounded-xl bg-[#FFF7F7] p-3">
                <dt className="text-sm font-bold text-[#B03030]">{category.label}</dt>
                <dd className="mt-1 text-xs leading-5 text-[#6B5B5B]">
                  {category.words.slice(0, 10).join('、')}
                  {category.words.length > 10 && ' など'}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-[#8AA0B0]">
            食品は、未開封・賞味期限内のものに限ります。
          </p>
        </section>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <GiveawayPostButton label="譲る物を投稿する" />
          <Link
            href="/giveaways"
            className="inline-flex items-center gap-2 rounded-full border border-[#D8E7F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1478B8] transition hover:bg-[#F1F8FC]"
          >
            <Search className="h-4 w-4" />
            譲ってもらえる物を探す
          </Link>
        </div>
      </div>
    </main>
  );
}
