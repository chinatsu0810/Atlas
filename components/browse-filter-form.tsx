import { ClearFiltersButton } from '@/components/clear-filters-button';

type Tag = {
  id: number;
  name: string;
  category: string;
};

type BrowseFilterFormProps = {
  action: string;
  countries: string[];
  selectedCountries: string[];
  tags: Tag[];
  selectedTagIds: number[];
};

const categoryLabels: Record<string, string> = {
  type: '経験タイプ',
  family: '家族構成',
  theme: 'テーマ',
};

const categoryOrder = ['type', 'family', 'theme'];

const chipClassName =
  'inline-block rounded-full border border-[#D8E7F0] bg-white px-3.5 py-1.5 text-xs text-[#35617E] transition peer-checked:border-[#1478B8] peer-checked:bg-[#1478B8] peer-checked:text-white md:text-sm';

export function BrowseFilterForm({
  action,
  countries,
  selectedCountries,
  tags,
  selectedTagIds,
}: BrowseFilterFormProps) {
  const groupedTags = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category] ?? category,
      items: tags.filter((tag) => tag.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <form
      action={action}
      method="get"
      className="mb-6 space-y-4 rounded-2xl border border-[#DCEAF2] bg-white p-4 shadow-sm"
    >
      <div>
        <p className="mb-2 text-xs font-semibold text-[#406783]">国</p>

        <div className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <label key={country} className="cursor-pointer">
              <input
                type="checkbox"
                name="country"
                value={country}
                defaultChecked={selectedCountries.includes(country)}
                className="peer sr-only"
              />

              <span className={chipClassName}>{country}</span>
            </label>
          ))}
        </div>
      </div>

      {groupedTags.map((group) => (
        <div key={group.category}>
          <p className="mb-2 text-xs font-semibold text-[#406783]">
            {group.label}
          </p>

          <div className="flex flex-wrap gap-2">
            {group.items.map((tag) => (
              <label key={tag.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={selectedTagIds.includes(tag.id)}
                  className="peer sr-only"
                />

                <span className={chipClassName}>{tag.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          className="rounded-lg bg-[#1478B8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D5686]"
        >
          絞り込む
        </button>

        <ClearFiltersButton className="rounded-lg border border-[#D8E7F0] px-5 py-2.5 text-sm text-[#52738B] hover:bg-[#F1F8FC]" />
      </div>
    </form>
  );
}
