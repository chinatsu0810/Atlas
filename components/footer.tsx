import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            © 2026 Atlas
          </p>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
            <Link
              href="/about"
              className="hover:text-gray-900"
            >
              運営より
            </Link>

            <Link
              href="/contact"
              className="hover:text-gray-900"
            >
              お問い合わせ
            </Link>

            <Link
              href="/terms"
              className="hover:text-gray-900"
            >
              利用規約
            </Link>

            <Link
              href="/privacy"
              className="hover:text-gray-900"
            >
              プライバシーポリシー
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}