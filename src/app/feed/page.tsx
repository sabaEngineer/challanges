import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts, getNewChallengesForFeed } from "@/actions/feed";
import { getDailyBookRecommendation } from "@/actions/books";
import { FeedPost } from "@/components/feed-post";
import { NewChallengePost } from "@/components/new-challenge-post";
import { BookRecommendationPost } from "@/components/book-recommendation-post";
import { TopPerformerBanner } from "@/components/top-performer-banner";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function FeedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [feedPosts, newChallenges, dailyBook] = await Promise.all([
    getFeedPosts(30),
    getNewChallengesForFeed(10),
    getDailyBookRecommendation(),
  ]);

  // Combine and sort all feed items by date
  type FeedItem = 
    | { type: "checkin"; data: typeof feedPosts[0]; sortDate: Date }
    | { type: "new_challenge"; data: typeof newChallenges[0]; sortDate: Date };

  const feedItems: FeedItem[] = [
    ...feedPosts.map((post) => ({
      type: "checkin" as const,
      data: post,
      sortDate: new Date(post.createdAt),
    })),
    ...newChallenges.map((challenge) => ({
      type: "new_challenge" as const,
      data: challenge,
      sortDate: new Date(challenge.createdAt),
    })),
  ];

  // Sort by date descending
  feedItems.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const hasContent = feedItems.length > 0;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Activity Feed
          </h1>
          <p className="text-slate-400">
            See what everyone's been up to
          </p>
        </div>

        {/* Top Performer Banner */}
        <TopPerformerBanner />

        {/* Daily Book Recommendation - shown at the top */}
        {dailyBook && (
          <BookRecommendationPost
            id={dailyBook.id}
            title={dailyBook.title}
            author={dailyBook.author}
            description={dailyBook.description}
            coverUrl={dailyBook.coverUrl}
            ownershipType={dailyBook.ownershipType}
            language={dailyBook.language}
            genres={dailyBook.genres}
            isLent={dailyBook.isLent}
            owner={dailyBook.owner}
            isOwnBook={dailyBook.isOwnBook}
            hasPendingRequest={dailyBook.hasPendingRequest}
            commentCount={dailyBook.commentCount}
          />
        )}

        {/* Feed */}
        {!hasContent && !dailyBook ? (
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
            {feedItems.map((item) => {
              if (item.type === "checkin") {
                const post = item.data;
                return (
                  <FeedPost
                    key={post.id}
                    id={post.id}
                    user={post.user}
                    challenge={post.challenge}
                    checkinDate={post.checkinDate}
                    note={post.note}
                    imageUrl={post.imageUrl}
                    mediaUrls={post.mediaUrls}
                    createdAt={post.createdAt}
                    items={post.items}
                    isOwnPost={post.isOwnPost}
                    initialReactions={post.reactions}
                    initialCommentCount={post.commentCount}
                  />
                );
              } else {
                const challenge = item.data as typeof newChallenges[0];
                return (
                  <NewChallengePost
                    key={challenge.id}
                    id={challenge.id}
                    challengeId={challenge.challengeId}
                    title={challenge.title}
                    description={challenge.description}
                    imageUrl={challenge.imageUrl}
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
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
