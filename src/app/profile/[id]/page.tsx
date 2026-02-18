import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getUserActivityHistory } from "@/actions/profile";
import { getUserBooksForProfile } from "@/actions/books";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeShowcase } from "@/components/badge-display";
import { BackButton } from "@/components/back-button";
import { ActivityCalendar } from "@/components/activity-calendar";
import { getUserPoints, getUserRank } from "@/actions/leaderboard";
import { getRankTitle, formatPoints, POINTS_LABEL } from "@/lib/points";
import { getUserTopPerformerCount } from "@/actions/top-performer";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getUserProfile(userId: string) {
  const now = new Date();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  const [challengesCreated, challengesJoined, totalCheckins, challengesCompleted, bestStreakRecord] =
    await Promise.all([
      db.challenge.count({ where: { createdBy: userId } }),
      db.challengeMember.count({ where: { userId, status: "active" } }),
      db.dailyCheckin.count({ where: { userId, isDone: true } }),
      db.challengeMember.count({
        where: {
          userId,
          status: "active",
          challenge: { endDate: { lt: now } },
        },
      }),
      db.challengeMember.findFirst({
        where: { userId },
        orderBy: { bestStreak: "desc" },
        select: { bestStreak: true },
      }),
    ]);

  // Get recent challenges the user is part of
  const recentChallenges = await db.challengeMember.findMany({
    where: { userId, status: "active" },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          imagePosition: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    take: 5,
  });

  return {
    user,
    stats: {
      challengesCreated,
      challengesJoined,
      totalCheckins,
      challengesCompleted,
      bestStreak: bestStreakRecord?.bestStreak || 0,
    },
    recentChallenges: recentChallenges.map((m) => ({
      ...m.challenge,
      currentStreak: m.currentStreak,
      bestStreak: m.bestStreak,
    })),
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [currentUser, profile, points, rank, activityHistory, books, topPerformerCount] = await Promise.all([
    getCurrentUser(),
    getUserProfile(id),
    getUserPoints(id),
    getUserRank(id),
    getUserActivityHistory(id),
    getUserBooksForProfile(id),
    getUserTopPerformerCount(id),
  ]);

  if (!profile) {
    notFound();
  }

  // If viewing own profile, could redirect to /profile
  const isOwnProfile = currentUser?.id === id;

  const { user, stats, recentChallenges } = profile;
  // Calculate "today" with timezone offset (UTC+4 for Georgia)
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const todayLocal = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate()));
  const rankTitle = getRankTitle(points.totalPoints);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <BackButton fallbackHref="/leaderboard" label="Back" />
        
        {/* Profile Header */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || "User"}
                className="w-24 h-24 rounded-full ring-4 ring-amber-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl font-bold">
                {(user.fullName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">
                  {user.fullName || "Anonymous User"}
                </h1>
                <span className={`text-sm ${rankTitle.color}`}>
                  {rankTitle.icon} {rankTitle.title}
                </span>
                {isOwnProfile && (
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                    You
                  </span>
                )}
              </div>
              {user.username && (
                <p className="text-amber-400 font-medium mb-1">@{user.username}</p>
              )}
              <p className="text-slate-500 text-sm">
                Member since{" "}
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {currentUser && !isOwnProfile && (
                <div className="mt-3">
                  <Link
                    href={`/messages/new?userId=${user.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Points & Rank Card */}
        <Card className="mb-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{POINTS_LABEL} 🍏</p>
              <p className="text-3xl font-bold text-amber-400">{formatPoints(points.totalPoints)} 🍏</p>
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>Check-ins: {points.checkinPoints} 🍏</span>
                <span>Challenges: {points.challengePoints} 🍏</span>
              </div>
            </div>
            {rank && (
              <Link href="/leaderboard" className="text-right hover:opacity-80 transition-opacity">
                <p className="text-sm text-slate-400">Global Rank</p>
                <p className="text-3xl font-bold text-white">#{rank.rank}</p>
                <p className="text-xs text-slate-500">of {rank.totalUsers} players</p>
              </Link>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-amber-400">{stats.challengesCreated}</div>
            <div className="text-xs text-slate-400">Created</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.challengesJoined}</div>
            <div className="text-xs text-slate-400">Joined</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-green-400">{stats.challengesCompleted}</div>
            <div className="text-xs text-slate-400">Completed</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-blue-400">{stats.totalCheckins}</div>
            <div className="text-xs text-slate-400">Check-ins</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-violet-400">{stats.bestStreak}</div>
            <div className="text-xs text-slate-400">Best Streak</div>
          </Card>
          <Card className="text-center py-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
            <div className="relative">
              <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
                🏆 {topPerformerCount}
              </div>
              <div className="text-xs text-slate-400">Top Performer</div>
            </div>
          </Card>
        </div>

        {/* Badges Section */}
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">🏅 Badges & Achievements</h2>
          <BadgeShowcase completedChallenges={stats.challengesCompleted} />
        </Card>

        {/* Activity Calendar */}
        <div className="mb-8">
          <ActivityCalendar activities={activityHistory} />
        </div>

        {/* Books Section */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📚</span> Books
            </h2>
            <Link href={`/books/user/${id}`}>
              <Button variant="outline" size="sm">
                Share Books Publicly
              </Button>
            </Link>
          </div>
          {books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {books.map((book) => (
                <Link key={book.id} href={`/books/${book.id}`}>
                  <div className="group flex flex-col items-center p-3 rounded-xl hover:bg-slate-800/50 transition-colors">
                    <div className="w-16 h-22 rounded-lg overflow-hidden bg-slate-800 mb-2 group-hover:ring-2 ring-amber-500/50 transition-all">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          📖
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white text-center truncate w-full">{book.title}</p>
                    <p className="text-xs text-slate-500 truncate w-full text-center">{book.author}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-4">No books shared yet</p>
          )}
        </Card>

        {/* Recent Challenges */}
        {recentChallenges.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Challenges</h2>
            <div className="space-y-3">
              {recentChallenges.map((challenge) => {
                const start = new Date(challenge.startDate);
                const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
                const end = new Date(challenge.endDate);
                const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
                const isActive = todayLocal >= startDay && todayLocal <= endDay;
                const isEnded = todayLocal > endDay;

                return (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    {challenge.imageUrl ? (
                      <img
                        src={challenge.imageUrl}
                        alt={challenge.title}
                        className="w-12 h-12 rounded-lg object-cover"
                        style={{ objectPosition: challenge.imagePosition || "50% 50%" }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{challenge.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isEnded
                              ? "bg-slate-500/20 text-slate-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {isActive ? "Active" : isEnded ? "Ended" : "Upcoming"}
                        </span>
                        {challenge.currentStreak > 0 && (
                          <span className="text-amber-400">
                            🔥 {challenge.currentStreak} day streak
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {/* Back link for own profile */}
        {isOwnProfile && (
          <div className="mt-6 text-center">
            <Link
              href="/profile"
              className="text-amber-400 hover:text-amber-300 text-sm"
            >
              ← Go to Account Settings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

