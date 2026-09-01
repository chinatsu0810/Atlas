'use client';

import { useState } from 'react';

type Tag = {
id: number;
name: string;
slug: string;
};

type TagSelectorProps = {
tags: Tag[];
};

export default function TagSelector({ tags }: TagSelectorProps) {
const [selectedTags, setSelectedTags] = useState<number[]>([]);

const toggleTag = (tagId: number) => {
setSelectedTags((current) =>
current.includes(tagId)
? current.filter((id) => id !== tagId)
: [...current, tagId]
);
};

return ( <div className="flex flex-wrap gap-2">
{tags.map((tag) => {
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


);
}

