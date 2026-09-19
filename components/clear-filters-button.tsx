'use client';

type ClearFiltersButtonProps = {
  className?: string;
};

export function ClearFiltersButton({ className }: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        const form = event.currentTarget.closest('form');

        if (!form) return;

        form
          .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
          .forEach((checkbox) => {
            checkbox.checked = false;
          });
      }}
    >
      一括クリア
    </button>
  );
}
