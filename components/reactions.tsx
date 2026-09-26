'use client';

import { useState } from 'react';

import {
  REACTION_TARGETS,
  REACTIONS,
  reactionApiPath,
  type ReactionSummary,
  type ReactionTarget,
  type ReactionType,
} from '@/lib/reactions/types';
import { cn } from '@/lib/utils';

type Props = {
  target: ReactionTarget;
  targetId: number;
  initialSummary: ReactionSummary;
};

export function Reactions({ target, targetId, initialSummary }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [pending, setPending] = useState<ReactionType | null>(null);

  // 未押下なら追加、押下済みなら取消
  async function toggle(reactionType: ReactionType) {
    if (pending) {
      return;
    }

    const previous = summary;
    const reacted = summary.reacted.includes(reactionType);
    const currentCount = summary.counts[reactionType] ?? 0;

    // 押した瞬間に反映し、失敗したら元に戻す
    setSummary({
      counts: {
        ...summary.counts,
        [reactionType]: Math.max(0, currentCount + (reacted ? -1 : 1)),
      },
      reacted: reacted
        ? summary.reacted.filter((type) => type !== reactionType)
        : [...summary.reacted, reactionType],
    });
    setPending(reactionType);

    try {
      const response = await fetch(reactionApiPath(target, targetId), {
        method: reacted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType }),
      });

      if (!response.ok) {
        throw new Error(`Reaction failed: ${response.status}`);
      }

      setSummary((await response.json()) as ReactionSummary);
    } catch (error) {
      console.error(error);
      setSummary(previous);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {REACTION_TARGETS[target].map((type) => {
        const { emoji, label } = REACTIONS[type];
        const reacted = summary.reacted.includes(type);
        const total = summary.counts[type] ?? 0;

        return (
          <div key={type} className="group relative">
            <button
              type="button"
              onClick={() => toggle(type)}
              aria-pressed={reacted}
              aria-label={`${label} ${total}件`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm tabular-nums transition active:scale-95',
                reacted
                  ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                  : 'bg-background text-muted-foreground hover:border-orange-300 hover:bg-orange-50/60'
              )}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {emoji}
              </span>
              <span aria-hidden="true">{total}</span>
            </button>

            {/* ツールチップ（hover できる端末のみ。Tailwind v4 の hover は @media (hover: hover) 限定） */}
            <span
              role="tooltip"
              className="
                pointer-events-none
                absolute bottom-full left-1/2 mb-2 -translate-x-1/2
                whitespace-nowrap
                rounded-md bg-foreground px-2 py-1
                text-xs text-background
                opacity-0 transition
                group-hover:opacity-100
              "
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
