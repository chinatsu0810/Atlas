'use client';

import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
    >
      <ArrowLeft className="h-4 w-4" />
      戻る
    </button>
  );
}