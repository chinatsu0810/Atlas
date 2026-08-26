'use client';

type DeleteAnswerButtonProps = {
  answerId: number;
  questionId: number;
  action: (formData: FormData) => void | Promise<void>;
};

export function DeleteAnswerButton({
  answerId,
  questionId,
  action,
}: DeleteAnswerButtonProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      'この回答を削除しますか？\n削除した回答は通常の画面から表示されなくなります。'
    );

    if (!confirmed) {
      event.preventDefault();
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input
        type="hidden"
        name="answerId"
        value={answerId}
      />

      <input
        type="hidden"
        name="questionId"
        value={questionId}
      />

      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline transition"
      >
        回答を削除
      </button>
    </form>
  );
}