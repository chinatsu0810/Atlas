import { Post } from "@/data/home";

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-500">
            <span className="mr-2 text-lg">{post.flag}</span>
            {post.country}
          </p>

          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-7 text-zinc-900 transition-colors group-hover:text-black">
            {post.title}
          </h3>
        </div>

        {post.solved && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            解決済み
          </span>
        )}
      </div>

      <div className="mt-4">
        <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700">
          {post.category}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
        <span>💬 {post.replies}回答</span>

        <span>👁 {post.views.toLocaleString()}閲覧</span>

        <span>{post.createdAt}</span>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
        <span className="text-sm text-zinc-500">
          📍 {post.city}
        </span>

        {post.hasExpertAnswer && (
          <span className="text-sm font-medium text-sky-700">
            経験者回答あり →
          </span>
        )}
      </div>
    </article>
  );
}