import Link from "next/link";
import { getLeaderboard, getUserRank } from "@/actions/leaderboard";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { getRankTitle, formatPoints, POINTS, POINTS_LABEL } from "@/lib/points";
import { getEarnedBadges } from "@/lib/badges";

// Force dynamic rendering to show real-time data
export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const [user, leaderboard] = await Promise.all([
    getCurrentUser(),
    getLeaderboard(50),
  ]);

  const userRank = user ? await getUserRank(user.id) : null;

  // Debug: get raw count from DB
  const { db } = await import("@/lib/db");
  const debugData = await db.dailyCheckin.findMany({
    where: { isDone: true },
    select: { userId: true, id: true },
  });
  const allUsers = await db.user.count();

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <BackButton fallbackHref="/feed" label="Back" />
        
        {/* DEBUG INFO - REMOVE LATER */}
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-xs text-red-300">
          <p>DEBUG: Total users in DB: {allUsers}</p>
          <p>DEBUG: Checkins with isDone=true: {debugData.length}</p>
          <p>DEBUG: Unique users with done checkins: {new Set(debugData.map(d => d.userId)).size}</p>
          <p>DEBUG: Leaderboard entries returned: {leaderboard.length}</p>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            🏆 Global Leaderboard
          </h1>
          <p className="text-slate-400">
            Top challengers ranked by {POINTS_LABEL}
          </p>
        </div>

        {/* Current User's Rank */}
        {user && userRank && (
          <Card className="mb-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl font-bold">
                  #{userRank.rank}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Your Rank</p>
                <p className="text-2xl font-bold text-white">
                  {formatPoints(userRank.totalPoints)} 🍏
                </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  Top {Math.round((userRank.rank / userRank.totalUsers) * 100)}%
                </p>
                <p className="text-amber-400">
                  {getRankTitle(userRank.totalPoints).icon} {getRankTitle(userRank.totalPoints).title}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Points Info */}
        <Card className="mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">How to earn {POINTS_LABEL} 🍏</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Daily check-in: <span className="text-amber-400">{POINTS.DAILY_CHECKIN} 🍏</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Complete challenge: <span className="text-amber-400">{POINTS.CHALLENGE_COMPLETE_BASE}+ 🍏</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Per challenge day: <span className="text-amber-400">+{POINTS.CHALLENGE_PER_DAY} 🍏</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Longer challenges = more {POINTS_LABEL}!</span>
            </div>
          </div>
        </Card>

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold text-white mb-2">No rankings yet</h3>
            <p className="text-slate-400 mb-6">
              Be the first to earn points by completing challenges!
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              Browse Challenges
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* 2nd Place */}
                <div className="order-1">
                  <LeaderboardPodium user={leaderboard[1]} place={2} />
                </div>
                {/* 1st Place */}
                <div className="order-2 -mt-4">
                  <LeaderboardPodium user={leaderboard[0]} place={1} />
                </div>
                {/* 3rd Place */}
                <div className="order-3">
                  <LeaderboardPodium user={leaderboard[2]} place={3} />
                </div>
              </div>
            )}

            {/* Rest of the leaderboard */}
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-slate-800">
                {leaderboard.slice(3).map((entry) => (
                  <LeaderboardRow
                    key={entry.id}
                    user={entry}
                    isCurrentUser={user?.id === entry.id}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardPodium({ user, place }: { user: any; place: number }) {
  const colors = {
    1: { bg: "from-amber-500 to-yellow-500", border: "border-amber-500/50", medal: "🥇" },
    2: { bg: "from-slate-400 to-slate-300", border: "border-slate-400/50", medal: "🥈" },
    3: { bg: "from-amber-700 to-amber-600", border: "border-amber-700/50", medal: "🥉" },
  }[place]!;

  const earnedBadges = getEarnedBadges(user.completedChallenges);
  const highestBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;

  return (
    <Link href={`/profile/${user.id}`}>
      <Card className={`text-center p-4 border ${colors.border} hover:bg-slate-800/50 transition-colors`}>
        <div className="text-3xl mb-2">{colors.medal}</div>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName || "User"}
            className={`w-16 h-16 mx-auto rounded-full ring-4 ring-offset-2 ring-offset-slate-900 bg-gradient-to-br ${colors.bg}`}
          />
        ) : (
          <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-2xl font-bold text-white`}>
            {(user.fullName || "U").charAt(0).toUpperCase()}
          </div>
        )}
        <p className="mt-3 font-semibold text-white truncate">
          {user.fullName || user.username || "Anonymous"}
        </p>
        {highestBadge && (
          <p className="text-xs text-slate-400">
            {highestBadge.icon} {highestBadge.name}
          </p>
        )}
        <p className="text-lg font-bold text-amber-400 mt-1">
          {formatPoints(user.totalPoints)} 🍏
        </p>
        <div className="flex justify-center gap-3 mt-2 text-xs text-slate-500">
          <span>🔥 {user.bestStreak}</span>
          <span>✓ {user.totalCheckins}</span>
        </div>
      </Card>
    </Link>
  );
}

function LeaderboardRow({ user, isCurrentUser }: { user: any; isCurrentUser: boolean }) {
  const rankTitle = getRankTitle(user.totalPoints);
  const earnedBadges = getEarnedBadges(user.completedChallenges);
  const highestBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;

  return (
    <Link
      href={`/profile/${user.id}`}
      className={`flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors ${
        isCurrentUser ? "bg-amber-500/10" : ""
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center font-bold text-slate-500">
        #{user.rank}
      </div>

      {/* Avatar */}
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.fullName || "User"}
          className="w-10 h-10 rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold">
          {(user.fullName || "U").charAt(0).toUpperCase()}
        </div>
      )}

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-white truncate">
            {user.fullName || user.username || "Anonymous"}
          </p>
          {isCurrentUser && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              You
            </span>
          )}
          {highestBadge && (
            <span className="text-sm" title={highestBadge.name}>
              {highestBadge.icon}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className={rankTitle.color}>
            {rankTitle.icon} {rankTitle.title}
          </span>
          <span>🔥 {user.bestStreak} streak</span>
          <span>✓ {user.completedChallenges} challenges</span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <p className="font-bold text-amber-400">{formatPoints(user.totalPoints)} 🍏</p>
        <p className="text-xs text-slate-500">{POINTS_LABEL}</p>
      </div>
    </Link>
  );
}

