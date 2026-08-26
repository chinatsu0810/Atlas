import PostCard from "./PostCard";
import { Post } from "@/data/home";

type PostsSectionProps = {
  title: string;
  description?: string;
  posts: Post[];
};

export default function PostsSection({
  title,
  description,
  posts,
}: PostsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h2>

          {description && (
            <p className="mt-2 text-sm text-zinc-500">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}