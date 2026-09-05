import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const sections = [
  {
    title: 'Atlasについて',
    description: 'Atlasが目指していることや、サービスの考え方をご紹介します。',
    href: '#about',
  },
  {
    title: '運営からのメッセージ',
    description: 'Atlasを始めた理由と、運営から皆さんへのメッセージです。',
    href: '#message',
  },
  {
    title: 'お知らせ・更新情報',
    description: 'Atlasの重要なお知らせや機能追加などをご案内します。',
    href: '#news',
  },
  {
    title: 'リリース歴',
    description: 'Atlasのこれまでのアップデートをご紹介します。',
    href: '#releases',
  },
  {
    title: '運営に連絡',
    description: 'お問い合わせ、不具合の報告、削除依頼などはこちらから。',
    href: '#contact',
  },
  {
    title: '利用規約',
    description: 'Atlasをご利用いただく際のルールをご確認ください。',
    href: '#terms',
  },
  {
    title: 'プライバシーポリシー',
    description: 'お預かりする情報の取り扱いについてご説明します。',
    href: '#privacy',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Title */}
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium text-gray-500">
            About Atlas
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            運営より
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            Atlasを運営する私たちから、サービスについてのお知らせや
            大切な情報をお届けします。
          </p>
        </div>

        {/* Menu */}
        <nav className="mb-14 space-y-3">
          {sections.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="group flex items-center justify-between rounded-xl border border-gray-200 px-5 py-4 transition hover:border-gray-400 hover:bg-gray-50"
            >
              <div>
                <h2 className="font-semibold text-gray-900">
                  {section.title}
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {section.description}
                </p>
              </div>

              <ChevronRight className="ml-4 h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-700" />
            </a>
          ))}
        </nav>

        {/* Atlasについて */}
        <section id="about" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            Atlasについて
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-gray-700">
            <p>
              Atlasは、世界のさまざまな場所を知る人と、
              知りたい人をつなぐコミュニティです。
            </p>

            <p>
              旅行、出張、赴任、留学、移住、子育て。
              人によって、その場所を知りたい理由や、
              知りたいことは異なります。
            </p>

            <p>
              インターネットにはたくさんの情報があります。
              それでも、実際にその場所を訪れたり、暮らしたりした人だからこそ
              知っていることがあります。
            </p>

            <p>
              Atlasでは、そんな一人ひとりの経験や知識を持ち寄り、
              これからその場所を訪れる人や、関わる人の
              判断材料となる情報を集めていきます。
            </p>
          </div>
        </section>

        {/* 運営からのメッセージ */}
        <section id="message" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            運営からのメッセージ
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-gray-700">
            <p>
              Atlasをご覧いただき、ありがとうございます。
            </p>

            <p>
              私たちは、世界のさまざまな場所について、
              「実際のところ、どうなんだろう？」と
              誰かに聞いてみたくなることがあります。
            </p>

            <p>
              検索すればたくさんの情報が出てきても、
              自分が知りたいことにぴったり当てはまる情報は、
              なかなか見つからないこともあります。
            </p>

            <p>
              そんなときに、
              「私はこうだった」
              「私はこう感じた」
              「私の場合はこうだった」
              という、実際の経験に出会える場所があったら。
            </p>

            <p>
              そんな思いから、Atlasを始めました。
            </p>

            <p>
              同じ場所についても、人によって経験や感じ方は違います。
              だからこそ、さまざまな経験が持ち寄られることに
              意味があると考えています。
            </p>

            <p>
              Atlasには、ひとつの答えではなく、
              さまざまな経験や知識が集まっていきます。
            </p>

            <p>
              そこから何を知り、何を感じ、
              その先にどう進むかを決めるのは、私たち自身です。
            </p>

            <p>
              誰かの経験が、次の誰かにとっての道標になる。
            </p>

            <p>
              私たち運営は、誰かの代わりに進む方向を決めるのではなく、
              さまざまな経験が持ち寄られ、
              誰かの道標となっていく場所をつくっていきたいと考えています。
            </p>
          </div>
        </section>

        {/* Atlasという名前について */}
        <section className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            Atlasという名前について
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-gray-700">
            <p>
              Atlasは、「地図帳」を意味する言葉です。
            </p>

            <p>
              私たちは、Atlasを「世界を知るための地図」のような
              場所にしたいと考えています。
            </p>

            <p>
              地図は、進むべき方向を決めるものではありません。
              どんな場所があり、どんな道があるのかを知り、
              その先をどう進むかは自分で選びます。
            </p>

            <p>
              Atlasも同じです。
            </p>

            <p>
              Atlasには、さまざまな人の経験や知識が集まります。
            </p>

            <p>
              「私はこうだった」
              「私はこう感じた」
              「私の場合はこうだった」
            </p>

            <p>
              同じ場所についても、立場や状況によって見える景色は変わります。
            </p>

            <p>
              だからこそAtlasでは、ひとつの答えだけではなく、
              さまざまな経験に触れられることを大切にしています。
            </p>

            <p>
              そうして集まった一つひとつの経験が、
              誰かが次の一歩を考えるときの道標になっていきます。
            </p>

            <p>
              私たち運営は、誰かの代わりに進む方向を決めるのではなく、
              さまざまな経験が持ち寄られ、
              誰かの道標となっていく場所をつくっていきたいと考えています。
            </p>
          </div>
        </section>

        {/* お知らせ */}
        <section id="news" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            お知らせ・更新情報
          </h2>

          <div className="mt-5 rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              現在、お知らせはありません。
            </p>
          </div>
        </section>

        {/* リリース歴 */}
        <section id="releases" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            リリース歴
          </h2>

          <div className="mt-6 space-y-6">
            <div className="border-l-2 border-gray-200 pl-5">
              <p className="text-sm font-semibold text-gray-900">
                2026年9月
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                Atlasを公開しました。
              </p>
            </div>
          </div>
        </section>

        {/* お問い合わせ */}
        <section id="contact" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            運営に連絡
          </h2>

          <p className="mt-5 text-sm leading-7 text-gray-700">
            Atlasについてのお問い合わせ、不具合のご報告、
            投稿内容に関するご連絡などはこちらからお願いします。
          </p>

          <Link
            href="/contact"
            className="mt-5 inline-flex items-center rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            お問い合わせフォームへ
          </Link>
        </section>

        {/* 利用規約 */}
        <section id="terms" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            利用規約
          </h2>

          <div className="mt-5 rounded-xl bg-gray-50 p-5">
            <p className="text-sm leading-6 text-gray-600">
              Atlasをご利用いただく際の利用規約を掲載します。
            </p>
          </div>
        </section>

        {/* プライバシーポリシー */}
        <section id="privacy" className="scroll-mt-8 border-t pt-12">
          <h2 className="text-2xl font-bold text-gray-900">
            プライバシーポリシー
          </h2>

          <div className="mt-5 rounded-xl bg-gray-50 p-5">
            <p className="text-sm leading-6 text-gray-600">
              Atlasにおける個人情報等の取り扱いについて掲載します。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}