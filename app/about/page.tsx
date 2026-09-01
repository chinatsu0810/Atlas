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
              Atlasは、海外生活で「これ、どうしたらいいんだろう？」と
              思ったときに、実際にその場所で暮らした経験者に
              聞くことができる場所です。
            </p>

            <p>
              ガイドブックや検索だけでは見つけにくい、
              「実際のところどうなの？」という疑問を、
              質問と回答を通して共有していくことを目指しています。
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
              海外で暮らしていると、検索してもなかなか答えが見つからない、
              「実際のところどうなの？」という疑問がたくさんあります。
            </p>

            <p>
              Atlasは、そんな疑問を気軽に質問でき、
              経験者のリアルな声を知ることができる場所を作りたい、
              という思いから始まりました。
            </p>

            <p>
              これから少しずつ、皆さんと一緒に育てていけたらと思っています。
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
                2026年8月
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