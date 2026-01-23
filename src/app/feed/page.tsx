import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts } from "@/actions/feed";
import { FeedPost } from "@/components/feed-post";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function FeedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const posts = await getFeedPosts(30);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Activity Feed
          </h1>
          <p className="text-slate-400">
            See what everyone's been up to
          </p>
        </div>

        {/* Feed */}
        {posts.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
            <p className="text-slate-400 mb-6">
              Be the first to complete a daily check-in and show up here!
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              Browse Challenges
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <FeedPost
                key={post.id}
                id={post.id}
                user={post.user}
                challenge={post.challenge}
                checkinDate={post.checkinDate}
                note={post.note}
                imageUrl={post.imageUrl}
                createdAt={post.createdAt}
                items={post.items}
                isOwnPost={post.isOwnPost}
                initialReactions={post.reactions}
                initialCommentCount={post.commentCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

