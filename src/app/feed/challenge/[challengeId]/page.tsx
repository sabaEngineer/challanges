import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getSingleChallengePost } from "@/actions/feed";
import { NewChallengePost } from "@/components/new-challenge-post";
import { BackButton } from "@/components/back-button";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ challengeId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { challengeId } = await params;
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: {
      title: true,
      description: true,
      imageUrl: true,
      creator: { select: { fullName: true, username: true } },
    },
  });

  if (!challenge) {
    return { title: "Challenge Post | Challanges" };
  }

  const creatorName = challenge.creator.username
    ? `@${challenge.creator.username}`
    : challenge.creator.fullName || "Someone";
  const title = `${creatorName} created "${challenge.title}" | Challanges`;
  const description = challenge.description?.slice(0, 200) || `Check out this new challenge: ${challenge.title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(challenge.imageUrl && {
        images: [{ url: challenge.imageUrl, width: 1200, height: 630 }],
      }),
    },
    twitter: {
      card: challenge.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(challenge.imageUrl && { images: [challenge.imageUrl] }),
    },
  };
}

export default async function ChallengePostPage({ params }: PageProps) {
  const { challengeId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const challenge = await getSingleChallengePost(challengeId);

  if (!challenge) {
    notFound();
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold text-white">Challenge Post</h1>
            <p className="text-sm text-slate-400">
              Created by {challenge.creator.username ? `@${challenge.creator.username}` : challenge.creator.fullName}
            </p>
          </div>
        </div>

        <NewChallengePost
          id={challenge.id}
          challengeId={challenge.challengeId}
          title={challenge.title}
          description={challenge.description}
          imageUrl={challenge.imageUrl}
          imagePosition={challenge.imagePosition}
          startDate={challenge.startDate}
          endDate={challenge.endDate}
          createdAt={challenge.createdAt}
          creator={challenge.creator}
          memberCount={challenge.memberCount}
          commentCount={challenge.commentCount}
          requirements={challenge.requirements}
          isOwnChallenge={challenge.isOwnChallenge}
          initialReactions={challenge.reactions}
        />

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
