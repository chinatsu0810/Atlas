'use client';

import { deleteGatherEvent } from '@/lib/gather/actions';

export function DeleteGatherEventButton({
  id,
  title,
}: {
  id: number;
  title: string;
}) {
  return (
    <form
      action={deleteGatherEvent}
      onSubmit={(event) => {
        if (!window.confirm(`「${title}」を削除しますか？\n公開ページからも消えます。`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
      >
        削除
      </button>
    </form>
  );
}
