import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyChallenges } from "@/actions/challenges";
import { getMyInvitations } from "@/actions/members";
import { getMyActiveChallengesForToday } from "@/actions/checkins";
import { getUserActivityHistory } from "@/actions/profile";
import { ChallengeCard } from "@/components/challenge-card";
import { TodaysChallenges } from "@/components/todays-challenges";
import { ActivityCalendar } from "@/components/activity-calendar";
import { TopPerformerBanner } from "@/components/top-performer-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InvitationCard } from "@/components/invitation-card";

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [myChallenges, invitations, todaysChallenges, activityHistory] = await Promise.all([
    getMyChallenges(),
    getMyInvitations(),
    getMyActiveChallengesForToday(),
    getUserActivityHistory(user.id),
  ]);
  
  // Calculate "today" with timezone offset (UTC+4 for Georgia)
  const TIMEZONE_OFFSET_HOURS = 4;
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const todayLocal = new Date(Date.UTC(adjustedNow.getUTCFullYear(), adjustedNow.getUTCMonth(), adjustedNow.getUTCDate()));
  
  const activeChallenges = myChallenges.filter((c) => {
    const start = new Date(c.startDate);
    const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const end = new Date(c.endDate);
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    return todayLocal >= startDay && todayLocal <= endDay;
  });
  const upcomingChallenges = myChallenges.filter((c) => {
    const start = new Date(c.startDate);
    const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    return todayLocal < startDay;
  });

  // Transform today's challenges for the component
  const todaysChallengesData = todaysChallenges.map((c) => ({
    id: c.id,
    title: c.title,
    imageUrl: c.imageUrl,
    requirements: c.requirements.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type as "distance" | "time" | "count" | "yes_no",
      targetValue: r.targetValue?.toString() || null,
      unit: r.unit as "reps" | "steps" | "km" | "meters" | "minutes" | "hours" | "pages" | "calories" | "liters" | "workouts" | "none",
    })),
    membership: c.membership,
    todayCheckin: c.todayCheckin ? {
      isDone: c.todayCheckin.isDone,
      items: c.todayCheckin.items.map((i) => ({
        requirementId: i.requirementId,
        value: i.value?.toString() || null,
        isDone: i.isDone,
      })),
    } : null,
  }));

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="text-amber-400">{user.username ? `@${user.username}` : user.fullName || "there"}</span>
          </h1>
          <p className="text-slate-400">Manage your challenges and track progress</p>
        </div>

        {/* Top Performer Banner */}
        <TopPerformerBanner />

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-amber-400">📩</span> Pending Invitations
              <span className="px-2 py-0.5 text-sm rounded-full bg-amber-500/20 text-amber-400">
                {invitations.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {invitations.slice(0, 4).map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                />
              ))}
            </div>
            {invitations.length > 4 && (
              <Link href="/notifications" className="block mt-3 text-sm text-amber-400 hover:text-amber-300">
                View all {invitations.length} invitations →
              </Link>
            )}
          </div>
        )}

        {/* Mobile: Today's Check-ins first */}
        <div className="lg:hidden mb-6">
          {todaysChallengesData.length > 0 ? (
            <TodaysChallenges challenges={todaysChallengesData} />
          ) : (
            <Card className="bg-gradient-to-br from-blue-500/5 to-violet-500/5 border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
                <h3 className="font-semibold text-white">Getting Started</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">1.</span>
                  Create or join a challenge
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">2.</span>
                  Check in daily to track progress
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">3.</span>
                  Build your streak and stay consistent!
                </li>
              </ul>
            </Card>
          )}
        </div>

        {/* Mobile: Calendar second */}
        <div className="lg:hidden mb-6">
          <ActivityCalendar activities={activityHistory} />
        </div>

        {/* Mobile: Streaks third */}
        <div className="lg:hidden mb-6">
          <Card>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔥</span> Your Streaks
            </h3>
            {todaysChallengesData.length > 0 ? (
              <div className="space-y-3">
                {todaysChallengesData.slice(0, 6).map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-sm text-slate-300 truncate flex-1 mr-2">
                      {challenge.title}
                    </span>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0">
                      <span className={challenge.membership.currentStreak > 0 ? "text-amber-400" : "text-slate-500"}>
                        🔥 {challenge.membership.currentStreak}
                      </span>
                      <span className="text-slate-500">
                        Best: {challenge.membership.bestStreak}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Join challenges to start building streaks!
              </p>
            )}
          </Card>
        </div>

        {/* Desktop: Today's Check-ins & Streaks Row */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6 mb-6">
          {/* Today's Check-ins */}
          {todaysChallengesData.length > 0 ? (
            <TodaysChallenges challenges={todaysChallengesData} />
          ) : (
            <Card className="bg-gradient-to-br from-blue-500/5 to-violet-500/5 border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xl">💡</span>
                </div>
                <h3 className="font-semibold text-white">Getting Started</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">1.</span>
                  Create or join a challenge
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">2.</span>
                  Check in daily to track progress
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">3.</span>
                  Build your streak and stay consistent!
                </li>
              </ul>
            </Card>
          )}

          {/* Streak Summary */}
          <Card>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔥</span> Your Streaks
            </h3>
            {todaysChallengesData.length > 0 ? (
              <div className="space-y-3">
                {todaysChallengesData.slice(0, 6).map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-sm text-slate-300 truncate flex-1 mr-2">
                      {challenge.title}
                    </span>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0">
                      <span className={challenge.membership.currentStreak > 0 ? "text-amber-400" : "text-slate-500"}>
                        🔥 {challenge.membership.currentStreak}
                      </span>
                      <span className="text-slate-500">
                        Best: {challenge.membership.bestStreak}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                Join challenges to start building streaks!
              </p>
            )}
          </Card>
        </div>

        {/* Desktop: Activity Calendar - Compact */}
        <div className="hidden lg:block mb-6">
          <ActivityCalendar activities={activityHistory} compact />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-amber-400">{myChallenges.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-emerald-400">{activeChallenges.length}</div>
            <div className="text-xs text-slate-400">Active</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-blue-400">{upcomingChallenges.length}</div>
            <div className="text-xs text-slate-400">Upcoming</div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <Link href="/challenges/new" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              <span className="mr-2">✨</span>
              Create Challenge
            </Button>
          </Link>
          <Link href="/challenges" className="flex-1">
            <Button variant="outline" className="w-full">
              Browse All
            </Button>
          </Link>
        </div>

        {/* My Challenges */}
        <div>
          <h2 className="text-xl font-semibold mb-4">My Challenges</h2>
          {myChallenges.length === 0 ? (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-slate-400 mb-4">You haven&apos;t joined any challenges yet.</p>
              <Link href="/challenges">
                <Button variant="outline">Explore Challenges</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myChallenges.map((challenge) => (
                <ChallengeCard
                  key={challenge.id}
                  id={challenge.id}
                  title={challenge.title}
                  description={challenge.description}
                  imageUrl={challenge.imageUrl}
                  startDate={challenge.startDate}
                  endDate={challenge.endDate}
                  creatorUsername={challenge.creator?.username}
                  requirements={challenge.requirements}
                  memberCount={challenge._count?.members || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
