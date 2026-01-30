import Link from "next/link";
import { getYesterdayTopPerformer } from "@/actions/top-performer";
import { TopPerformerModal } from "./top-performer-modal";

// Small compact banner for feed
export async function TopPerformerBanner() {
  const topPerformer = await getYesterdayTopPerformer();

  if (!topPerformer) {
    return null;
  }

  const { user, completedCount, challenges, date } = topPerformer;

  return (
    <>
      {/* Modal (shows once per day on first visit) */}
      <TopPerformerModal
        user={user}
        completedCount={completedCount}
        challenges={challenges}
        date={date}
      />
      
      {/* Compact Banner */}
      <Link 
        href={`/profile/${user.id}`}
        className="block mb-6 group"
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-xl p-3 hover:border-amber-500/40 transition-all">
          <div className="flex items-center gap-3">
            {/* Trophy */}
            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              🏆
            </div>

            {/* User Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || "User"}
                className="w-8 h-8 rounded-full ring-2 ring-amber-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold ring-2 ring-amber-500/30">
                {(user.fullName || "U").charAt(0).toUpperCase()}
              </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300">
                <span className="text-amber-400 font-medium">Yesterday's Top Performer</span>
                <span className="mx-1.5 text-slate-600">•</span>
                <span className="text-white font-semibold group-hover:text-amber-400 transition-colors">
                  {user.fullName || user.username || "Anonymous"}
                </span>
              </p>
            </div>

            {/* Stats badges */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-500/20 rounded-full text-emerald-400">
                ✓ {completedCount}
              </span>
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-700/50 rounded-full text-slate-300">
                🎯 {challenges.length}
              </span>
            </div>

            {/* Arrow */}
            <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </>
  );
}

// Large detailed banner (for dashboard)
export async function TopPerformerBannerLarge() {
  const topPerformer = await getYesterdayTopPerformer();

  if (!topPerformer) {
    return null;
  }

  const { user, completedCount, challenges, date } = topPerformer;

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/30 rounded-2xl p-4 sm:p-6 mb-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
      
      <div className="relative flex flex-col sm:flex-row items-center gap-4">
        {/* Trophy Icon */}
        <div className="shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-amber-500/30">
            🏆
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="text-xs sm:text-sm font-medium text-amber-400 uppercase tracking-wider">
              Yesterday's Top Performer
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(date)}
            </span>
          </div>
          
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <Link href={`/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || "User"}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-amber-500/50"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg sm:text-xl font-bold ring-2 ring-amber-500/50">
                  {(user.fullName || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {user.fullName || user.username || "Anonymous"}
                </h3>
                {user.username && user.fullName && (
                  <p className="text-xs text-slate-400">@{user.username}</p>
                )}
              </div>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 rounded-full">
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-300 font-medium">{completedCount} check-ins completed</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-700/50 rounded-full">
              <span className="text-amber-400">🎯</span>
              <span className="text-slate-300">{challenges.length} challenge{challenges.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Challenge names */}
          {challenges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {challenges.slice(0, 3).map((challenge) => (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.id}`}
                  className="text-xs px-2 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-300 transition-colors"
                >
                  {challenge.title}
                </Link>
              ))}
              {challenges.length > 3 && (
                <span className="text-xs text-slate-500">+{challenges.length - 3} more</span>
              )}
            </div>
          )}
        </div>

        {/* Celebration decoration */}
        <div className="hidden sm:flex flex-col items-center gap-1 text-2xl opacity-50">
          <span>✨</span>
          <span>🔥</span>
          <span>💪</span>
        </div>
      </div>
    </div>
  );
}
