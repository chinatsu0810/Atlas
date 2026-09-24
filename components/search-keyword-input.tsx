// placeholder属性は画面幅で文言を変えられないため、
// 入力が空のときだけ表示する疑似プレースホルダーを重ねてスマホ用に短い文言を出す
const LONG_PLACEHOLDER = '国や知りたいことで検索（例：シンガポール 学校）';
const SHORT_PLACEHOLDER = '例：シンガポール 学校';

export function SearchKeywordInput({
  defaultValue,
  inputClassName,
  placeholderClassName,
}: {
  defaultValue?: string;
  inputClassName: string;
  placeholderClassName: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder=" "
        aria-label={LONG_PLACEHOLDER}
        className={`peer w-full ${inputClassName}`}
      />

      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden whitespace-nowrap peer-[:not(:placeholder-shown)]:hidden ${placeholderClassName}`}
      >
        <span className="truncate lg:hidden">{SHORT_PLACEHOLDER}</span>
        <span className="hidden truncate lg:inline">{LONG_PLACEHOLDER}</span>
      </span>
    </div>
  );
}
