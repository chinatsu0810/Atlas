'use client';

import { useState } from 'react';

type Tag = {
  id: number;
  name: string;
  slug: string;
  category: string;
};

type TagSelectorProps = {
  tags: Tag[];
};

const categoryLabels: Record<string, string> = {
  type: '経験タイプ',
  family: '家族構成',
  theme: 'テーマ',
};

const categoryOrder = ['type', 'family', 'theme'];

export default function TagSelector({ tags }: TagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const toggleTag = (tagId: number) => {
    setSelectedTags((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
    );
  };

  const groupedTags = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category] ?? category,
      items: tags.filter((tag) => tag.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {groupedTags.map((group) => (
        <div key={group.category}>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {group.label}
          </p>

          <div className="flex flex-wrap gap-2">
            {group.items.map((tag) => {
              const selected = selectedTags.includes(tag.id);

              return (
                <label key={tag.id} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    checked={selected}
                    onChange={() => toggleTag(tag.id)}
                    className="sr-only"
                  />

                  <span
                    className={
                      selected
                        ? 'inline-block rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white'
                        : 'inline-block rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted'
                    }
                  >
                    {tag.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
