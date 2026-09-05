'use client';

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="
        bg-orange-500
        hover:bg-orange-600
        disabled:bg-orange-300
        disabled:cursor-not-allowed
        text-white
        rounded-lg
        px-5
        py-3
        font-medium
        transition
      "
    >
      {pending ? '回答を送信中…' : '回答する'}
    </button>
  );
}

export function AnswerForm({
  questionId,
  action,
}: {
  questionId: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="questionId"
        value={questionId}
      />

      <textarea
        name="content"
        placeholder="あなたの場合はどうだったか、ぜひ教えてください。"
        rows={7}
        className="
          w-full
          border
          rounded-xl
          p-4
          resize-y
          outline-none
          focus:ring-2
          focus:ring-orange-200
          focus:border-orange-500
        "
        required
      />

      <SubmitButton />
    </form>
  );
}