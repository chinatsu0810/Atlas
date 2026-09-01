import { getContacts } from '@/lib/db/queries';

export default async function ContactAdminPage() {
  const contacts = await getContacts();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            お問い合わせ
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            受け付けたお問い合わせを確認できます。
          </p>
        </div>

        {contacts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              お問い合わせはまだありません。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {contact.name || '名前未入力'}
                    </p>

                    <p className="text-sm text-gray-500">
                      {contact.email}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {contact.category}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {contact.createdAt.toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {contact.message}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}