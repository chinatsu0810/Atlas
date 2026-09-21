import type { Metadata } from 'next';
import Link from 'next/link';

import { BulletList, LegalSection as Section } from '@/components/legal-section';

// プライバシーポリシー。内容は、実際のデータの扱いに合わせている。
// 変更するときは、docs/account-deletion.md の「保持期間のまとめ」と食い違わないようにする。
// 公開前・変更時のチェックリストも、同じ文書の「プライバシーポリシーの公開前チェック」にある。

const ENACTED_ON = '2026年9月21日';
const UPDATED_ON = '2026年9月21日';

export const metadata: Metadata = {
  title: 'プライバシーポリシー｜Atlas',
  description:
    'Atlasがお預かりする情報の取り扱い、アカウント削除時の扱い、外部サービスへの情報の送信についてご説明します。',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        {/* Title */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-500">Privacy Policy</p>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            プライバシーポリシー
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            Atlas（以下「当サービス」）は、海外生活に関する質問・回答・経験談を共有するコミュニティです。
            当サービスをご利用いただく方（以下「ユーザー」）の情報を大切に扱うため、
            お預かりする情報の種類、使いみち、保存期間などを、次のとおり定めます。
          </p>

          <p className="mt-3 text-xs text-gray-500">
            制定日：{ENACTED_ON}　最終更新日：{UPDATED_ON}
          </p>
        </div>

        <Section number={1} title="取得する情報">
          <p>当サービスでは、次の情報を取得します。</p>

          <BulletList>
            <li>
              <span className="font-medium">アカウント情報</span>
              ：ニックネーム、メールアドレス、パスワード。
              パスワードは、元の文字列が分からない形（ハッシュ化）にして保存します。運営者も、パスワードの内容を見ることはできません。
            </li>
            <li>
              <span className="font-medium">投稿情報</span>
              ：質問・回答・経験談の内容、対象の国、タグ。投稿は、ニックネームとともに公開されます（「3. 投稿の公開について」を参照）。
            </li>
            <li>
              <span className="font-medium">お問い合わせの情報</span>
              ：お名前（任意）、メールアドレス、お問い合わせの種別、お問い合わせの内容。
            </li>
            <li>
              <span className="font-medium">操作履歴</span>
              ：新規登録、ログイン、ログアウト、パスワード変更などを行った日時と、その種類。
              現時点では、この履歴にIPアドレスは保存していません。
            </li>
            <li>
              <span className="font-medium">アクセス情報・Cookie</span>
              ：閲覧したページ、閲覧日時、お使いの端末・ブラウザの情報、おおよその地域など。
              アクセス解析サービスと、サイトを配信しているサービスが取得します（「4. 外部サービスの利用」「5. Cookieについて」を参照）。
            </li>
            <li>
              <span className="font-medium">サービスの内部管理のための情報</span>
              ：アカウントを登録すると、サービスの内部管理のために「チーム」が自動的に作られます。チームの名前には、メールアドレスが含まれます。
              チームへの招待機能をご利用になった場合は、招待先のメールアドレスも保存します。
            </li>
          </BulletList>
        </Section>

        <Section number={2} title="利用目的">
          <p>取得した情報は、次の目的のために利用します。</p>

          <BulletList>
            <li>アカウントの作成、ログイン、本人の確認</li>
            <li>質問・回答・経験談の掲載と公開など、当サービスの提供</li>
            <li>お問い合わせや、削除の依頼などへの対応</li>
            <li>パスワードの再設定など、当サービスの利用に必要なご連絡</li>
            <li>不正な利用や、サービスのルールに反する行為の防止と対応</li>
            <li>利用状況の分析と、サービスの改善</li>
            <li>法令に基づく対応</li>
          </BulletList>
        </Section>

        <Section number={3} title="投稿の公開について">
          <p>
            質問・回答・経験談は、投稿したユーザーのニックネームとともに、会員でない方を含め、誰でも閲覧できます。
            また、検索エンジンに表示されることがあります。
          </p>

          <p>
            投稿の内容には、ご自身や他の方を特定できる情報（本名、勤務先、住所、連絡先など）を書かないようご注意ください。
            投稿した内容の削除をご希望の場合は、お問い合わせフォームからご連絡ください。運営者が確認のうえ、削除します。
            アカウントを削除した場合は、「7. アカウントの削除と、情報の保存期間」のとおり、投稿も削除されます。
          </p>
        </Section>

        <Section number={4} title="外部サービスの利用">
          <p>
            当サービスは、次の外部サービスを利用しています。それぞれのサービスに、記載の情報が送信・保存されます。
          </p>

          <BulletList>
            <li>
              <span className="font-medium">Vercel</span>
              （サイトの配信）：サイトを表示する際の、IPアドレスなどのアクセス情報。
            </li>
            <li>
              <span className="font-medium">Neon</span>
              （データベース）：アカウント情報、投稿情報、お問い合わせの情報、操作履歴など、当サービスが保存する情報。
            </li>
            <li>
              <span className="font-medium">Resend</span>
              （メールの配信）：お問い合わせを運営者に通知するメールと、パスワード再設定のメールの、宛先のメールアドレスと本文。
              お問い合わせの通知メールには、お名前、メールアドレス、お問い合わせの内容が含まれます。
            </li>
            <li>
              <span className="font-medium">Google アナリティクス</span>
              （アクセス解析）：下の「外部送信される情報」を参照してください。
            </li>
          </BulletList>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="font-medium text-gray-900">
              Google アナリティクスへの情報の送信（外部送信）
            </p>

            <dl className="mt-3 space-y-2">
              <div>
                <dt className="font-medium">送信先</dt>
                <dd>Google LLC</dd>
              </div>

              <div>
                <dt className="font-medium">送信される情報</dt>
                <dd>
                  閲覧したページのURL、閲覧日時、お使いの端末・ブラウザ・OSの情報、おおよその地域、Cookieなどの識別子
                </dd>
              </div>

              <div>
                <dt className="font-medium">利用目的</dt>
                <dd>当サービスの利用状況の分析と、サービスの改善</dd>
              </div>
            </dl>

            <p className="mt-3">
              Googleによる情報の取り扱いは、
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
              >
                Googleのポリシー
              </a>
              に従います。情報の送信を止めたい場合は、
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
              >
                Google アナリティクス オプトアウト アドオン
              </a>
              を、お使いのブラウザに追加してください。
            </p>
          </div>

          <p>
            これらのサービスのサーバーは、日本国外（米国、シンガポールなど）にある場合があります。
          </p>
        </Section>

        <Section number={5} title="Cookieについて">
          <p>当サービスでは、次のCookieを使用します。</p>

          <BulletList>
            <li>
              <span className="font-medium">ログイン状態を保つためのCookie</span>
              ：ログイン中のみ使用します。最後にサイトを利用してから、約24時間で無効になります。
            </li>
            <li>
              <span className="font-medium">アクセス解析のためのCookie</span>
              ：Google アナリティクスが、利用状況を把握するために使用します。
            </li>
          </BulletList>

          <p>
            ブラウザの設定でCookieを無効にすることもできますが、その場合、ログインなど一部の機能が使えなくなることがあります。
          </p>
        </Section>

        <Section number={6} title="第三者への提供">
          <p>
            ユーザーの個人情報は、次の場合を除いて、本人の同意なく第三者に提供しません。
          </p>

          <BulletList>
            <li>法令に基づく場合</li>
            <li>人の生命、身体、財産を守るために必要で、本人の同意を得ることが難しい場合</li>
          </BulletList>

          <p>
            なお、「4. 外部サービスの利用」に記載したサービスには、当サービスを運営するために必要な範囲で、情報の取り扱いを委託しています。
          </p>
        </Section>

        <Section number={7} title="アカウントの削除と、情報の保存期間">
          <p className="font-medium text-gray-900">ご自身でアカウントを削除する場合</p>

          <p>
            マイページの「ログイン情報」から、いつでもアカウントを削除できます。削除すると、次のとおり扱います。
            なお、削除は取り消せません。
          </p>

          <BulletList>
            <li>ニックネーム、メールアドレス、パスワードなどのアカウント情報は、削除と同時に消去します。</li>
            <li>
              投稿した質問・回答・経験談は、削除と同時に非表示にし、30日後に完全に削除します。
              あなたの質問に他の方が回答している場合、その回答も、一緒に非表示になり、削除されます。
            </li>
            <li>
              お問い合わせの内容は、削除と同時に、お名前とメールアドレスを消去し、30日後に内容を完全に削除します。
            </li>
            <li>
              操作履歴は、削除と同時に、あなたのアカウントとの結び付きを外します。日時と操作の種類だけが、誰のものか分からない状態で残ります。
            </li>
            <li>
              削除後30日間は、誤操作への対応や問い合わせへの対応のため、非表示の状態でデータを保持します。この間も、アカウントや投稿を元に戻すことはできません。
            </li>
          </BulletList>

          <p className="font-medium text-gray-900">運営者がアカウントを削除する場合</p>

          <p>
            サービスのルールに違反する行為があった場合など、運営上必要と判断したときは、運営者がアカウントを削除することがあります。
            この場合も、アカウント情報は削除と同時に消去します。投稿は、上記と同じく30日後に完全に削除するか、内容を踏まえて、「退会したユーザー」の名義で残すことがあります。
          </p>

          <p>
            削除したアカウントの再登録を防ぐため、メールアドレスから作成した識別子（元のメールアドレスには戻せません）を保持することがあります。
          </p>

          <p className="font-medium text-gray-900">その他の保存期間</p>

          <BulletList>
            <li>
              お問い合わせの内容：対応が完了してから1年後に削除します。対応が完了していないものは、最後に更新してから2年後に削除します。
            </li>
            <li>
              お問い合わせのメール：運営者が受信したお問い合わせのメール（返信を含む）は、受信から1年後に、運営者が削除します。
              アカウントを削除した後も、この期間は、運営者のメールに内容が残ることがあります。
              メールの配信サービス（Resend）にも、送信の記録が、最大30日間残ります。
            </li>
            <li>
              バックアップ：障害に備えたバックアップに、削除した後も、最大30日間、データが残ることがあります。
              投稿は、削除から30日後の完全な削除のあと、さらに最大30日で、バックアップからも消えます（アカウントの削除から、最大60日）。
            </li>
          </BulletList>
        </Section>

        <Section number={8} title="安全管理について">
          <p>当サービスは、情報の漏えいや不正な利用を防ぐため、次のような対策をとっています。</p>

          <BulletList>
            <li>パスワードを、元の文字列が分からない形にして保存します。</li>
            <li>通信を暗号化（HTTPS）します。</li>
            <li>ユーザー情報を扱う管理画面は、運営者のみが利用できます。</li>
          </BulletList>
        </Section>

        <Section number={9} title="開示・訂正・削除などのご請求">
          <p>
            ユーザーご本人は、当サービスが保有するご自身の個人情報について、開示、訂正、削除、利用の停止をご請求いただけます。
          </p>

          <BulletList>
            <li>
              ニックネームとメールアドレスの変更、アカウントの削除は、マイページからご自身で行えます。
            </li>
            <li>
              投稿の削除、および上記以外のご請求は、お問い合わせフォームからご連絡ください（アカウントに関するご請求は、種別を「アカウントについて」としてください）。
              ご本人であることを確認したうえで、遅滞なく対応します。
            </li>
          </BulletList>
        </Section>

        <Section number={10} title="運営者について">
          <p>
            当サービスは、Atlas運営が運営しています。運営者の氏名（名称）と住所は、このページには掲載していません。
          </p>
          <p>
            「9. 開示・訂正・削除などのご請求」に基づく、個人情報の開示のご請求があった場合、または、法令に基づく開示のご請求があった場合に、ご請求の内容とご本人であることを確認したうえで、遅滞なくお知らせします。
            サービスについてのご質問など、通常のお問い合わせには、お答えしません。
          </p>
        </Section>

        <Section number={11} title="本ポリシーの変更">
          <p>
            法令の変更や、当サービスの内容の変更に応じて、本ポリシーを変更することがあります。
            変更した場合は、このページに掲載し、最終更新日を改めます。
          </p>
        </Section>

        <Section number={12} title="お問い合わせ窓口">
          <p>本ポリシーや、個人情報の取り扱いについてのお問い合わせは、下記からお願いします。</p>

          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            お問い合わせフォームへ
          </Link>
        </Section>
      </div>
    </main>
  );
}
