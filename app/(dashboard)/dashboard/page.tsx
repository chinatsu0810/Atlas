export default function DashboardPage() {
  return (
    <section className="flex-1 p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-2">🌏 Atlas</h1>

      <p className="text-gray-600 mb-8">
        海外在住・海外赴任・海外移住予定の日本人がつながる掲示板へようこそ。
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">📝 新しい投稿</h2>
          <p className="text-gray-600">
            現地情報や質問を投稿しましょう。
          </p>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">🌍 カテゴリー</h2>
          <ul className="space-y-1 text-gray-600">
            <li>・海外生活</li>
            <li>・渡航準備</li>
            <li>・仕事</li>
            <li>・子育て</li>
            <li>・雑談</li>
          </ul>
        </div>

        <div className="rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">📢 お知らせ</h2>
          <p className="text-gray-600">
            Atlas開発中です。
            <br />
            これから投稿機能やコメント機能を追加していきます。
          </p>
        </div>

      </div>
    </section>
  );
}
