import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { getUserActivityHistory } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { BadgeShowcase } from "@/components/badge-display";
import { BackButton } from "@/components/back-button";
import { ProfileHeader } from "./profile-header";
import { ActivityCalendar } from "@/components/activity-calendar";
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

  const [stats, points, rank, activityHistory] = await Promise.all([
    getUserStats(user.id),
    getUserPoints(user.id),
    getUserRank(user.id),
    getUserActivityHistory(user.id),
  ]);

  const rankTitle = getRankTitle(points.totalPoints);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <BackButton fallbackHref="/feed" label="Back" />
        
        {/* Profile Header */}
        <ProfileHeader
          user={{
            avatarUrl: user.avatarUrl,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
          }}
          rankTitle={rankTitle}
        />

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

        {/* Activity Calendar */}
        <div className="mb-8">
          <ActivityCalendar activities={activityHistory} />
        </div>

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

