import { ExternalLink, Layers, Lightbulb, Scale } from 'lucide-react';
import {
  SOURCE_KINDS,
  SOURCE_KIND_LABELS,
  type GuideContent,
  type GuideItem,
} from '@/lib/ai/guides/types';

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// 国・地域別まとめの表示。テーマのページ上部と、運営画面のプレビューで使う。
//   ① まず知っておきたいこと ② 比べるカード ③ テーマ別の情報 ④ 出典
// どの項目にも出典の番号を付け、下の出典一覧（発信元の種類つき）とつなぐ
export function GuideSummary({
  content,
  publishedAt,
}: {
  content: GuideContent;
  publishedAt: Date | null;
}) {
  // 出典の番号は、一覧に並べた順（種類ごとにまとめた順。1から）
  const orderedSources = SOURCE_KINDS.flatMap((kind) => content.sources.filter((source) => source.kind === kind));
  const numberOf = (sourceId: number) => orderedSources.findIndex((source) => source.id === sourceId) + 1;

  const Cite = ({ ids }: { ids: number[] }) => (
    <>
      {ids.map((id) => {
        const number = numberOf(id);
        return number > 0 ? (
          <a
            key={id}
            href={`#guide-source-${number}`}
            className="ml-0.5 align-super text-[10px] font-semibold text-[#1478B8] hover:underline"
          >
            [{number}]
          </a>
        ) : null;
      })}
    </>
  );

  const ItemText = ({ item }: { item: GuideItem }) => (
    <>
      {item.text}
      <Cite ids={item.sourceIds} />
    </>
  );

  const comparison = content.comparison;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B8498]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F8] px-2 py-0.5 font-semibold text-[#53616B]">
            <Layers className="h-3 w-3" />
            Atlasのまとめ
          </span>
          {publishedAt && <span>確認日 {new Date(publishedAt).toLocaleDateString('ja-JP')}</span>}
        </div>
        {content.lead && <p className="mt-2 text-sm leading-7 text-[#406783]">{content.lead}</p>}
      </div>

      {content.highlights.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#123B5D] md:text-lg">
            <Lightbulb className="h-5 w-5 text-[#1478B8]" />
            まず知っておきたいこと
          </h2>
          <ul className="space-y-2">
            {content.highlights.map((item, index) => (
              <li
                key={index}
                className="rounded-xl border border-[#E8EEF2] bg-white px-4 py-3 text-sm leading-7 text-[#29465C]"
              >
                <ItemText item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparison && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#123B5D] md:text-lg">
            <Scale className="h-5 w-5 text-[#1478B8]" />
            {comparison.title}
          </h2>
          <p className="mb-3 mt-1 text-xs text-[#6B8498]">同じ項目で並べています。並び順はおすすめの順番ではありません。</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {comparison.options.map((option) => {
              const link = option.linkSourceId
                ? content.sources.find((source) => source.id === option.linkSourceId)
                : undefined;
              return (
                <article
                  key={option.name}
                  className="flex flex-col rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm"
                >
                  <h3 className="text-base font-bold text-[#174C73]">{option.name}</h3>
                  {option.summary.text && (
                    <p className="mt-1 text-xs leading-5 text-[#648198]">
                      <ItemText item={option.summary} />
                    </p>
                  )}

                  <dl className="mt-4 flex-1 divide-y divide-[#EEF3F6] rounded-xl bg-[#F8FBFD] px-3 text-xs">
                    {comparison.attributes.map((attribute, index) => {
                      const cell = option.cells[index];
                      return (
                        <div key={attribute} className="grid grid-cols-[88px_1fr] gap-2 py-2">
                          <dt className="text-[#7F95A6]">{attribute}</dt>
                          <dd className={cell?.text ? 'text-[#29465C]' : 'text-[#A3B1BB]'}>
                            {cell?.text ? <ItemText item={cell} /> : '—'}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>

                  {link && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 self-start rounded-full border border-[#9EC6DF] px-3 py-1.5 text-xs font-semibold text-[#1478B8] transition hover:bg-[#F1F8FC]"
                    >
                      公式サイト
                      <span className="font-normal text-[#7F95A6]">{hostOf(link.url)}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#7F95A6]">「—」の項目は、各公式サイトで確認してください。</p>
        </section>
      )}

      {content.topics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {content.topics.map((topic) => (
            <section key={topic.heading} className="rounded-2xl border border-[#E1EBF1] bg-white p-5">
              <h2 className="text-sm font-bold text-[#174C73] md:text-base">{topic.heading}</h2>
              <ul className="mt-3 space-y-2">
                {topic.items.map((item, index) => (
                  <li key={index} className="flex gap-2 text-sm leading-6 text-[#29465C]">
                    <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#8CC5E4]" aria-hidden />
                    <span>
                      <ItemText item={item} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {orderedSources.length > 0 && (
        <section className="rounded-2xl border border-[#E1EBF1] bg-white p-5">
          <h2 className="text-sm font-bold text-[#406783]">出典</h2>
          <ol className="mt-2 space-y-1.5">
            {orderedSources.map((source, index) => (
              <li key={source.id} id={`guide-source-${index + 1}`} className="flex gap-2 text-xs leading-5">
                <span className="shrink-0 text-[#7F95A6]">[{index + 1}]</span>
                <span className="shrink-0 rounded bg-[#EAF4FB] px-1.5 text-[10px] font-semibold leading-5 text-[#1478B8]">
                  {SOURCE_KIND_LABELS[source.kind]}
                </span>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-[#1478B8] hover:underline">
                  {source.title}
                  <span className="ml-1 text-[#7F95A6]">{hostOf(source.url)}</span>
                  <ExternalLink className="ml-1 inline h-3 w-3" />
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] leading-5 text-[#7F95A6]">
            公式サイトなどの情報をAtlasが整理したものです。どれを選ぶかの判断は含みません。金額や条件は変わることがあるので、最新の内容は出典で確認してください。
          </p>
        </section>
      )}
    </div>
  );
}
