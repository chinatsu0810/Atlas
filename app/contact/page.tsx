'use client';

import { Mail } from 'lucide-react';
import { useActionState } from 'react';
import { submitContact, type ContactState } from './actions';

const initialState: ContactState = {
  success: false,
  message: '',
};

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(
    submitContact,
    initialState
  );

  if (state.success) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            お問い合わせ
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            ✓
          </div>

          <h2 className="mt-5 text-lg font-semibold text-gray-900">
            お問い合わせを送信しました
          </h2>

          <p className="mt-3 text-sm leading-7 text-gray-600">
            お問い合わせありがとうございます。
            内容を確認のうえ、ご連絡が必要な場合は
            ご入力いただいたメールアドレスへ返信いたします。
          </p>

          {state.message && (
            <p className="mt-3 text-sm text-gray-500">
              {state.message}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          お問い合わせ
        </h1>

        <p className="mt-4 text-sm leading-7 text-gray-600">
          Atlasについてのお問い合わせ、不具合のご報告、
          投稿内容に関するご連絡などはこちらからお願いします。
        </p>

        <p className="mt-2 text-sm text-gray-500">
          通常3営業日以内を目安にご返信いたします。
        </p>
      </div>

      {state.message && !state.success && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm leading-6 text-red-700">
            {state.message}
          </p>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-900"
          >
            お名前
          </label>

          <input
            id="name"
            name="name"
            type="text"
            className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
            placeholder="お名前を入力してください"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-900"
          >
            メールアドレス
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
            placeholder="example@example.com"
          />

          <p className="mt-2 text-xs text-gray-500">
            返信が必要な場合はこちらのメールアドレスへご連絡します。
          </p>
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-900"
          >
            お問い合わせ種別
          </label>

          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          >
            <option value="" disabled>
              選択してください
            </option>
            <option value="general">サービスについて</option>
            <option value="bug">不具合の報告</option>
            <option value="content">投稿内容の報告</option>
            <option value="account">アカウントについて</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-900"
          >
            お問い合わせ内容
          </label>

          <textarea
            id="message"
            name="message"
            required
            rows={8}
            className="mt-2 block w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
            placeholder="お問い合わせ内容を入力してください"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {isPending ? '送信しています…' : '送信する'}
        </button>
      </form>

      <div className="mt-10 rounded-xl bg-gray-50 p-5">
        <p className="text-xs leading-6 text-gray-500">
          ※ お問い合わせいただいた内容は、Atlasの運営およびサービス改善のために利用します。
        </p>
      </div>
    </main>
  );
}