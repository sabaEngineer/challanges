import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { BadgeShowcase } from "@/components/badge-display";
import { getUserPoints, getUserRank } from "@/actions/leaderboard";
import { getRankTitle, formatPoints, POINTS_LABEL } from "@/lib/points";

async function getUserStats(userId: string) {
  const now = new Date();
  
  const [challengesCreated, challengesJoined, totalCheckins, challengesCompleted] = await Promise.all([
    db.challenge.count({ where: { createdBy: userId } }),
    db.challengeMember.count({ where: { userId, status: "active" } }),
    db.dailyCheckin.count({ where: { userId, isDone: true } }),
    // Count challenges that have ended where user was an active member
    db.challengeMember.count({
      where: {
        userId,
        status: "active",
        challenge: {
          endDate: { lt: now },
        },
      },
    }),
  ]);

  const bestStreak = await db.challengeMember.findFirst({
    where: { userId },
    orderBy: { bestStreak: "desc" },
    select: { bestStreak: true },
  });

  return {
    challengesCreated,
    challengesJoined,
    totalCheckins,
    bestStreak: bestStreak?.bestStreak || 0,
    challengesCompleted,
  };
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [stats, points, rank] = await Promise.all([
    getUserStats(user.id),
    getUserPoints(user.id),
    getUserRank(user.id),
  ]);

  const rankTitle = getRankTitle(points.totalPoints);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
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
              </div>
              {user.username && (
                <p className="text-amber-400 font-medium mb-1">@{user.username}</p>
              )}
              <p className="text-slate-400 text-sm">{user.email}</p>
              <p className="text-slate-500 text-xs mt-2">
                Member since {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
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
        </div>

        {/* Badges Section */}
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">🏅 Badges & Achievements</h2>
          <BadgeShowcase completedChallenges={stats.challengesCompleted} />
        </Card>

        {/* Account Section */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <p className="text-sm font-medium text-white">Email</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                Verified
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <p className="text-sm font-medium text-white">Sign-in Method</p>
                <p className="text-sm text-slate-400">Google OAuth</p>
              </div>
              <span className="text-lg">🔐</span>
            </div>

            <div className="pt-4">
              <form action={logout}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                >
                  <span className="mr-2">🚪</span>
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-6 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-slate-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            disabled
          >
            Delete Account (Coming Soon)
          </Button>
        </Card>
      </div>
    </div>
  );
}

