import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserDetailsAdmin, isAdmin } from "@/actions/admin";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const admin = await isAdmin();
  if (!admin) redirect("/dashboard");

  const user = await getUserDetailsAdmin(id);
  if (!user) notFound();

  // Group check-ins by date for calendar view
  const checkinsByDate = new Map<string, typeof user.recentCheckins>();
  user.recentCheckins.forEach((checkin) => {
    const dateKey = new Date(checkin.checkinDate).toISOString().split("T")[0];
    if (!checkinsByDate.has(dateKey)) {
      checkinsByDate.set(dateKey, []);
    }
    checkinsByDate.get(dateKey)!.push(checkin);
  });

  // Generate calendar data for last 30 days
  const calendarDays: { date: Date; checkins: typeof user.recentCheckins }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    calendarDays.push({
      date,
      checkins: checkinsByDate.get(dateKey) || [],
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
          <div className="flex-1">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-semibold">
                  {(user.fullName || user.username || user.email)[0].toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user.fullName || user.username || "No name"}
                </h1>
                <p className="text-slate-400">{user.email}</p>
                {user.username && (
                  <p className="text-slate-500 text-sm">@{user.username}</p>
                )}
              </div>
              <span
                className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === "admin"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {user.role}
              </span>
            </div>
          </div>
          <Link
            href={`/profile/${user.id}`}
            className="text-amber-400 hover:text-amber-300 text-sm"
          >
            View Public Profile →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <div className="text-2xl font-bold text-white">{user.challenges.length}</div>
            <div className="text-slate-400 text-sm">Active Challenges</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-white">{user.recentCheckins.length}</div>
            <div className="text-slate-400 text-sm">Recent Check-ins</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-white">
              {Math.max(...user.challenges.map((c) => c.currentStreak), 0)}
            </div>
            <div className="text-slate-400 text-sm">Best Current Streak</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-white">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div className="text-slate-400 text-sm">Joined</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Challenges */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Challenges</h2>
            {user.challenges.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No challenges joined</p>
            ) : (
              <div className="space-y-3">
                {user.challenges.map((challenge) => {
                  const now = new Date();
                  const endDate = new Date(challenge.endDate);
                  const isActive = endDate >= now;
                  
                  return (
                    <div
                      key={challenge.id}
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link
                            href={`/challenges/${challenge.id}`}
                            className="font-medium text-white hover:text-amber-400 transition-colors"
                          >
                            {challenge.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                isActive
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-slate-700 text-slate-400"
                              }`}
                            >
                              {isActive ? "Active" : "Ended"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {challenge.streakMode === "flexible" ? "🌊 Flexible" : "🔥 Strict"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-semibold">
                            {challenge.currentStreak} 🔥
                          </div>
                          <div className="text-xs text-slate-500">
                            Best: {challenge.bestStreak}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(challenge.startDate).toLocaleDateString()} -{" "}
                        {new Date(challenge.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Activity Calendar (Last 30 days) */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">
              Activity (Last 30 Days)
            </h2>
            <div className="grid grid-cols-6 gap-2">
              {calendarDays.map((day, i) => {
                const hasCheckin = day.checkins.length > 0;
                const allDone = day.checkins.length > 0 && day.checkins.every((c) => c.isDone);
                const isToday = day.date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                      allDone
                        ? "bg-emerald-500/30 border border-emerald-500/50"
                        : hasCheckin
                        ? "bg-amber-500/30 border border-amber-500/50"
                        : "bg-slate-800/50 border border-slate-700"
                    } ${isToday ? "ring-2 ring-white/30" : ""}`}
                    title={`${day.date.toLocaleDateString()}: ${day.checkins.length} check-in(s)`}
                  >
                    <span className="text-slate-400">{day.date.getDate()}</span>
                    {hasCheckin && (
                      <span className="text-[10px]">
                        {allDone ? "✓" : "○"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-800/50 border border-slate-700" />
                <span>No activity</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Check-ins */}
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Check-ins</h2>
          {user.recentCheckins.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No check-ins yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {user.recentCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Link
                        href={`/challenges/${checkin.challengeId}`}
                        className="font-medium text-white hover:text-amber-400 transition-colors"
                      >
                        {checkin.challengeTitle}
                      </Link>
                      <div className="text-sm text-slate-400">
                        {new Date(checkin.checkinDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        checkin.isDone
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {checkin.isDone ? "Completed" : "Partial"}
                    </span>
                  </div>
                  
                  {checkin.note && (
                    <p className="text-sm text-slate-300 mb-2 italic">"{checkin.note}"</p>
                  )}
                  
                  {checkin.imageUrl && (
                    <img
                      src={checkin.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover mb-2"
                    />
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {checkin.items.map((item, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded ${
                          item.isDone
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {item.requirementTitle || item.type}
                        {item.value && `: ${item.value}/${item.targetValue} ${item.unit}`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
