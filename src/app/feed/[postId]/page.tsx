import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSinglePost } from "@/actions/feed";
import { FeedPost } from "@/components/feed-post";
import { BackButton } from "@/components/back-button";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const post = await getSinglePost(postId);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold text-white">Post</h1>
            <p className="text-sm text-slate-400">
              Check-in by {post.user.username ? `@${post.user.username}` : post.user.fullName}
            </p>
          </div>
        </div>

        {/* Post */}
        <FeedPost
          id={post.id}
          user={post.user}
          challenge={post.challenge}
          checkinDate={post.checkinDate}
          note={post.note}
          imageUrl={post.imageUrl}
          mediaUrls={post.mediaUrls}
          linkUrl={post.linkUrl}
          createdAt={post.createdAt}
          items={post.items}
          isOwnPost={post.isOwnPost}
          initialReactions={post.reactions}
          initialCommentCount={post.commentCount}
        />

        {/* View more link */}
        <div className="mt-6 text-center">
          <Link
            href="/feed"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            View all activity →
          </Link>
        </div>
      </div>
    </div>
  );
}
