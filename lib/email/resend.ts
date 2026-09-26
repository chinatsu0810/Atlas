import { Resend } from 'resend';

let resendClient: Resend | null = null;

// メール送信（Resend）のクライアント。実際に送るときに初めて作る。
// 読み込んだだけで作ると、キーが無い環境（Vercelのプレビューなど）でビルドが失敗するため。
// キーが無ければ、呼び出した時点でエラーになる（各送信処理の try/catch で扱う）。
export function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}
