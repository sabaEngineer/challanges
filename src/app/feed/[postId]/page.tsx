import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getSinglePost, getPostMetadata } from "@/actions/feed";
import { FeedPost } from "@/components/feed-post";
import { BackButton } from "@/components/back-button";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const meta = await getPostMetadata(postId);

  if (!meta) {
    return {
      title: "Post | Challanges",
      description: "Check out this post on Challanges",
    };
  }

  const title = `${meta.userName} — ${meta.challengeTitle} | Challanges`;
  const description = meta.note
    ? meta.note.slice(0, 200)
    : `${meta.userName} checked in for ${meta.challengeTitle}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(meta.previewImage && {
        images: [{ url: meta.previewImage, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: meta.previewImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(meta.previewImage && { images: [meta.previewImage] }),
    },
  };
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
